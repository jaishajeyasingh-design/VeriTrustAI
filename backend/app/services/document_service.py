import datetime
import json
import os
import re
import uuid
from pathlib import Path
from typing import Dict, List, Optional
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func

from backend.app.core.config import settings
from backend.app.db.session import SessionLocal
from backend.app.db.models import DocumentModel, ApplicationModel
from backend.app.schemas.document import (
    DocumentItem,
    DocumentType,
    FileFormat,
    DocumentOCRResult,
    OCRPageResult
)
from backend.app.services.ocr_service import ocr_service


class DocumentService:
    def list_documents(
        self,
        doc_type: Optional[str] = None,
        application_id: Optional[str] = None
    ) -> List[DocumentItem]:
        with SessionLocal() as db:
            query = db.query(DocumentModel)
            if doc_type and doc_type != "All":
                query = query.filter(func.lower(DocumentModel.doc_type) == doc_type.lower())
            if application_id:
                query = query.filter(func.lower(DocumentModel.application_id) == application_id.lower())

            docs = query.order_by(DocumentModel.created_at.desc(), DocumentModel.id.desc()).all()
            return [doc.to_schema() for doc in docs]

    def get_by_id(self, document_id: str) -> Optional[DocumentItem]:
        with SessionLocal() as db:
            doc = db.query(DocumentModel).filter(
                func.lower(DocumentModel.id) == document_id.lower()
            ).first()
            if not doc:
                return None
            return doc.to_schema()

    def get_ocr_result(self, document_id: str) -> Optional[DocumentOCRResult]:
        with SessionLocal() as db:
            doc = db.query(DocumentModel).filter(
                func.lower(DocumentModel.id) == document_id.lower()
            ).first()
            if not doc:
                return None

            extracted = {}
            if doc.extracted_fields_json:
                try:
                    extracted = json.loads(doc.extracted_fields_json)
                except Exception:
                    pass

            errors = []
            if doc.processing_errors_json:
                try:
                    errors = json.loads(doc.processing_errors_json)
                except Exception:
                    pass

            raw_txt = doc.raw_text or ""
            return DocumentOCRResult(
                document_id=doc.id,
                filename=doc.name,
                file_format=doc.file_format,  # type: ignore
                page_count=doc.page_count or 1,
                extraction_method=doc.extraction_method or "pymupdf_direct",
                text_extracted=bool(raw_txt),
                raw_text=raw_txt,
                normalized_fields=extracted,
                pages=[
                    OCRPageResult(
                        page_number=1,
                        text=raw_txt,
                        char_count=len(raw_txt),
                        confidence=doc.authenticity_score or 98.5
                    )
                ],
                confidence=doc.authenticity_score or 98.5,
                ocr_engine_available=doc.ocr_engine_available,
                processing_errors=errors,
                demo_mode=doc.demo_mode
            )

    def delete_document(self, document_id: str) -> bool:
        with SessionLocal() as db:
            doc = db.query(DocumentModel).filter(
                func.lower(DocumentModel.id) == document_id.lower()
            ).first()
            if not doc:
                return False

            # Delete physical file if present
            if doc.storage_path and os.path.exists(doc.storage_path):
                try:
                    os.remove(doc.storage_path)
                except Exception:
                    pass

            db.delete(doc)
            db.commit()
            return True

    async def process_upload(
        self,
        file: UploadFile,
        application_id: str,
        doc_type: DocumentType = "Application"
    ) -> DocumentItem:
        """
        Validates, stores, extracts text/fields, and catalogs an uploaded document in the database.
        SECURITY CONTROLS:
        1. Non-empty file check (size > 0).
        2. Configurable maximum upload size enforcement.
        3. Strict extension verification against whitelist (.pdf, .png, .jpg, .jpeg).
        4. Magic byte signature verification to defeat extension spoofing.
        5. Path traversal prevention (sanitizes original filename, saves under UUID).
        6. Storage in non-public local upload directory.
        7. Database persistence with foreign key association to application.
        """
        # Step 1: Sanitize client-provided filename
        raw_filename = file.filename or "uploaded_document"
        sanitized_filename = Path(raw_filename).name  # Strips directory traversal (e.g. ../../)
        sanitized_filename = re.sub(r"[^\w\.\-_]", "_", sanitized_filename)

        ext = Path(sanitized_filename).suffix.lower()
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file extension '{ext}'. Allowed extensions: {', '.join(settings.ALLOWED_EXTENSIONS)}"
            )

        # Step 2: Read content and enforce size limits
        content = await file.read()
        file_size_bytes = len(content)

        if file_size_bytes == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty (0 bytes). Please upload a valid document."
            )

        if file_size_bytes > settings.MAX_UPLOAD_SIZE_BYTES:
            max_mb = settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Uploaded file size ({file_size_bytes / (1024*1024):.2f} MB) exceeds maximum allowed limit of {max_mb} MB."
            )

        # Step 3: Validate file signatures (Magic Bytes)
        file_format: FileFormat
        if ext == ".pdf":
            if b"%PDF-" not in content[:1024]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid PDF file: Missing standard %PDF- header signature."
                )
            file_format = "PDF"
        elif ext == ".png":
            if not content.startswith(b"\x89PNG\r\n\x1a\n"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid PNG file: Header does not match standard PNG signature."
                )
            file_format = "PNG"
        elif ext in [".jpg", ".jpeg"]:
            if not content.startswith(b"\xff\xd8\xff"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid JPEG/JPG file: Header does not match standard JPEG SOI marker."
                )
            file_format = "JPG"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File extension {ext} is not supported."
            )

        # Step 4: Verify application existence in database
        with SessionLocal() as db:
            app = db.query(ApplicationModel).filter(
                func.lower(ApplicationModel.id) == application_id.lower()
            ).first()
            if not app:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Application '{application_id}' does not exist. Cannot attach documents to a non-existent application dossier."
                )
            target_app_id = app.id

        # Step 5: Generate unique IDs and secure disk storage
        unique_suffix = uuid.uuid4().hex[:10]
        doc_id = f"DOC-{uuid.uuid4().hex[:6].upper()}"
        secure_disk_filename = f"{doc_id}_{unique_suffix}{ext}"

        upload_dir = settings.get_upload_path()
        saved_file_path = upload_dir / secure_disk_filename

        try:
            # Write file securely to non-public directory
            with open(saved_file_path, "wb") as f:
                f.write(content)

            # Step 6: Execute real OCR / text extraction pipeline
            ocr_result = ocr_service.extract_text(
                document_id=doc_id,
                filename=sanitized_filename,
                file_path=saved_file_path,
                file_format=file_format
            )

            # Step 7: Determine human-readable size
            if file_size_bytes < 1024 * 1024:
                size_str = f"{file_size_bytes / 1024:.1f} KB"
            else:
                size_str = f"{file_size_bytes / (1024 * 1024):.1f} MB"

            today_str = datetime.date.today().strftime("%d-%b-%y")
            doc_status = "Processed" if ocr_result.text_extracted else "Processing"
            if ocr_result.processing_errors and not ocr_result.text_extracted:
                doc_status = "Failed"

            ocr_status = "Completed" if ocr_result.text_extracted else "Flagged"

            # Step 8: Persist document record into SQLite database
            with SessionLocal() as db:
                app_record = db.query(ApplicationModel).filter(
                    ApplicationModel.id == target_app_id
                ).first()

                doc_model = DocumentModel(
                    id=doc_id,
                    application_id=target_app_id,
                    name=sanitized_filename,
                    doc_type=doc_type,
                    size=size_str,
                    uploaded_date=today_str,
                    status=doc_status,
                    ocr_status=ocr_status,
                    file_format=file_format,
                    page_count=ocr_result.page_count,
                    storage_path=str(saved_file_path),
                    raw_text=ocr_result.raw_text,
                    extraction_method=ocr_result.extraction_method,
                    extracted_fields_json=json.dumps(ocr_result.normalized_fields or {}),
                    authenticity_score=98.5 if ocr_result.text_extracted else None,
                    ocr_engine_available=ocr_result.ocr_engine_available,
                    processing_errors_json=json.dumps(ocr_result.processing_errors or []),
                    demo_mode=False
                )
                db.add(doc_model)

                if app_record:
                    now_str = datetime.datetime.now().strftime("%d-%b-%y %I:%M %p")
                    app_record.last_updated = now_str

                db.commit()
                db.refresh(doc_model)
                return doc_model.to_schema()

        except Exception as e:
            # Clean up disk file immediately if extraction or persistence fails
            if saved_file_path.exists():
                try:
                    os.remove(saved_file_path)
                except Exception:
                    pass
            raise e


document_service = DocumentService()
