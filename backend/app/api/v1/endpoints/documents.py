from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query, status, Depends
from backend.app.schemas.document import DocumentItem, DocumentOCRResult
from backend.app.services.document_service import document_service
from backend.app.core.security import (
    get_current_principal,
    require_role,
    check_application_access,
    UserPrincipal
)

router = APIRouter()


@router.get("/", response_model=List[DocumentItem], summary="[Implemented] List documents in vault")
async def list_documents(
    type: Optional[str] = None,
    application_id: Optional[str] = None,
    principal: UserPrincipal = Depends(get_current_principal)
) -> List[DocumentItem]:
    """
    Returns stored statutory credentials and approval files with optional type and application filters.
    Protected: Requires valid API Key or Bearer token.
    Enforces boundary controls for applicant principals.
    """
    if principal.role == "applicant" and principal.allowed_applications is not None:
        if application_id:
            check_application_access(principal, application_id)
            return document_service.list_documents(doc_type=type, application_id=application_id)
        # If applicant didn't specify application_id, return documents for their allowed application
        allowed_docs: List[DocumentItem] = []
        for app_id in principal.allowed_applications:
            allowed_docs.extend(document_service.list_documents(doc_type=type, application_id=app_id))
        return allowed_docs

    return document_service.list_documents(doc_type=type, application_id=application_id)


@router.post(
    "/upload",
    response_model=DocumentItem,
    status_code=status.HTTP_201_CREATED,
    summary="[Implemented] Upload file and run OCR extraction"
)
async def upload_document(
    file: UploadFile = File(..., description="PDF, PNG, or JPG/JPEG document file"),
    application_id: str = Form(..., description="Associated application identifier (e.g. APP2026001)"),
    doc_type: str = Form("Application", description="Document type classification"),
    principal: UserPrincipal = Depends(get_current_principal)
) -> DocumentItem:
    """
    Uploads a statutory document, validates format/signatures/size, stores in secure
    upload directory, runs OCR / text extraction, and returns structured document metadata.
    Protected: Requires valid API Key or Bearer token.
    Enforces application ownership boundary for applicant principals.
    """
    check_application_access(principal, application_id)

    valid_types = ["Application", "Certificate", "Affidavit", "Identity", "Approval", "NOC", "Financial"]
    selected_type = doc_type if doc_type in valid_types else "Application"

    doc_item = await document_service.process_upload(
        file=file,
        application_id=application_id,
        doc_type=selected_type  # type: ignore
    )
    return doc_item


@router.get("/{document_id}", response_model=DocumentItem, summary="[Implemented] Get document by ID")
async def get_document(
    document_id: str,
    application_id: Optional[str] = Query(None, description="Optional application ID boundary check"),
    principal: UserPrincipal = Depends(get_current_principal)
) -> DocumentItem:
    """
    Retrieves metadata and processing status for a single document.
    Protected: Requires valid API Key or Bearer token.
    Enforces cross-application authorization and applicant ownership boundaries.
    """
    doc = document_service.get_by_id(document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' was not found in vault."
        )

    # Cross-application authorization check via explicit query param
    if application_id and doc.applicationId.lower() != application_id.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cross-application access denied: Document '{document_id}' belongs to application '{doc.applicationId}', not '{application_id}'."
        )

    # Enforce applicant access boundary against document's application
    check_application_access(principal, doc.applicationId)

    return doc


@router.get("/{document_id}/ocr", response_model=DocumentOCRResult, summary="[Implemented] Get OCR extraction details")
async def get_document_ocr(
    document_id: str,
    application_id: Optional[str] = Query(None, description="Optional application ID boundary check"),
    principal: UserPrincipal = Depends(get_current_principal)
) -> DocumentOCRResult:
    """
    Returns verbatim extracted raw OCR text, per-page extraction records, and
    normalized statutory fields. Strictly avoids hallucinating missing fields.
    Protected: Requires valid API Key or Bearer token.
    Enforces cross-application authorization and applicant ownership boundaries.
    """
    doc = document_service.get_by_id(document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' was not found."
        )

    # Cross-application authorization check if requested
    if application_id and doc.applicationId.lower() != application_id.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cross-application access denied: Document '{document_id}' belongs to application '{doc.applicationId}', not '{application_id}'."
        )

    # Enforce applicant access boundary
    check_application_access(principal, doc.applicationId)

    ocr_result = document_service.get_ocr_result(document_id)
    if not ocr_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"OCR extraction records not found for document ID '{document_id}'."
        )
    return ocr_result


@router.delete("/{document_id}", summary="[Implemented] Delete document from vault")
async def delete_document(
    document_id: str,
    application_id: Optional[str] = Query(None, description="Optional application ID boundary check"),
    _principal: UserPrincipal = Depends(require_role(["reviewer", "administrator"]))
) -> dict:
    """
    Removes a document from the vault registry and purges cached OCR results.
    Protected & RBAC: Requires 'reviewer' or 'administrator' role. (Applicant denied -> 403).
    """
    if application_id:
        doc = document_service.get_by_id(document_id)
        if doc and doc.applicationId.lower() != application_id.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Cross-application access denied: Document '{document_id}' belongs to application '{doc.applicationId}', not '{application_id}'."
            )

    deleted = document_service.delete_document(document_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' was not found."
        )
    return {"success": True, "message": f"Document {document_id} removed successfully."}
