import io
import os
import re
import shutil
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from PIL import Image
import pymupdf
import pytesseract

from backend.app.core.config import settings
from backend.app.schemas.document import FileFormat, OCRPageResult, DocumentOCRResult


class OCRService:
    def __init__(self):
        self._tesseract_available: Optional[bool] = None
        self._tesseract_version: Optional[str] = None
        self._configure_tesseract()

    def _configure_tesseract(self) -> None:
        """
        Locates and sets up the Tesseract OCR executable if available.
        Checks settings.TESSERACT_CMD, standard Windows paths, and system PATH.
        """
        # 1. Check explicit setting
        if settings.TESSERACT_CMD and Path(settings.TESSERACT_CMD).exists():
            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
            self._tesseract_available = True
            return

        # 2. Check standard Windows installations
        standard_windows_paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe")
        ]
        for p in standard_windows_paths:
            if Path(p).exists():
                pytesseract.pytesseract.tesseract_cmd = p
                self._tesseract_available = True
                return

        # 3. Check if tesseract is on PATH
        path_cmd = shutil.which("tesseract")
        if path_cmd:
            pytesseract.pytesseract.tesseract_cmd = path_cmd
            self._tesseract_available = True
            return

        # 4. Verify pytesseract call
        try:
            version = pytesseract.get_tesseract_version()
            self._tesseract_version = str(version)
            self._tesseract_available = True
        except Exception:
            self._tesseract_available = False

    def is_tesseract_available(self) -> bool:
        if self._tesseract_available is None:
            self._configure_tesseract()
        return bool(self._tesseract_available)

    def extract_text(
        self,
        document_id: str,
        filename: str,
        file_path: Path,
        file_format: FileFormat
    ) -> DocumentOCRResult:
        """
        Main extraction entrypoint. Detects file type, invokes appropriate extraction
        (PyMuPDF for text PDFs, hybrid/Tesseract for scanned PDFs and images),
        and normalizes detected statutory fields without inventing missing values.
        """
        if file_format == "PDF":
            return self._extract_pdf(document_id, filename, file_path)
        else:
            return self._extract_image(document_id, filename, file_path, file_format)

    def _extract_pdf(
        self,
        document_id: str,
        filename: str,
        file_path: Path
    ) -> DocumentOCRResult:
        errors: List[str] = []
        pages_result: List[OCRPageResult] = []
        total_raw_text: List[str] = []

        try:
            doc = pymupdf.open(file_path)
            page_count = len(doc)
            if page_count == 0:
                return DocumentOCRResult(
                    document_id=document_id,
                    filename=filename,
                    file_format="PDF",
                    page_count=0,
                    extraction_method="none",
                    text_extracted=False,
                    raw_text="",
                    normalized_fields={},
                    pages=[],
                    confidence=None,
                    ocr_engine_available=self.is_tesseract_available(),
                    processing_errors=["PDF file has 0 pages or contains corrupted page trees."],
                    demo_mode=settings.DEMO_MODE
                )

            # Step 1: Attempt direct digital text extraction via PyMuPDF
            direct_texts: List[str] = []
            for i, page in enumerate(doc):
                text = page.get_text() or ""
                direct_texts.append(text.strip())

            combined_direct = "\n\n".join(direct_texts).strip()

            # Step 2: Check if document has genuine extractable digital text
            # If combined length is >= 15 characters, it's a digital text PDF
            if len(combined_direct) >= 15:
                for idx, text in enumerate(direct_texts):
                    pages_result.append(
                        OCRPageResult(
                            page_number=idx + 1,
                            text=text,
                            char_count=len(text),
                            confidence=99.0  # Direct vector text extraction has near-perfect accuracy
                        )
                    )
                normalized = self._normalize_fields(combined_direct)
                return DocumentOCRResult(
                    document_id=document_id,
                    filename=filename,
                    file_format="PDF",
                    page_count=page_count,
                    extraction_method="pymupdf_direct",
                    text_extracted=True,
                    raw_text=combined_direct,
                    normalized_fields=normalized,
                    pages=pages_result,
                    confidence=99.0,
                    ocr_engine_available=self.is_tesseract_available(),
                    processing_errors=errors,
                    demo_mode=settings.DEMO_MODE
                )

            # Step 3: Minimal or no text found -> Scanned/Image-based PDF
            # Route to Tesseract OCR for each rendered page
            if not self.is_tesseract_available():
                errors.append(
                    "Document appears to be a scanned or image-only PDF. "
                    "Tesseract OCR is not installed or configured on the server. "
                    "Install Tesseract-OCR and configure TESSERACT_CMD in .env to enable optical character recognition."
                )
                return DocumentOCRResult(
                    document_id=document_id,
                    filename=filename,
                    file_format="PDF",
                    page_count=page_count,
                    extraction_method="none",
                    text_extracted=False,
                    raw_text="",
                    normalized_fields={},
                    pages=[],
                    confidence=None,
                    ocr_engine_available=False,
                    processing_errors=errors,
                    demo_mode=settings.DEMO_MODE
                )

            # Run OCR on rendered page pixmaps
            all_confidences: List[float] = []
            for idx, page in enumerate(doc):
                pix = page.get_pixmap(dpi=150)
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                page_text, page_conf = self._run_tesseract_ocr(img)
                pages_result.append(
                    OCRPageResult(
                        page_number=idx + 1,
                        text=page_text,
                        char_count=len(page_text),
                        confidence=page_conf
                    )
                )
                if page_text:
                    total_raw_text.append(page_text)
                if page_conf is not None:
                    all_confidences.append(page_conf)

            full_ocr_text = "\n\n".join(total_raw_text).strip()
            avg_conf = (
                round(sum(all_confidences) / len(all_confidences), 1)
                if all_confidences
                else None
            )
            has_text = len(full_ocr_text) > 0
            normalized = self._normalize_fields(full_ocr_text) if has_text else {}

            return DocumentOCRResult(
                document_id=document_id,
                filename=filename,
                file_format="PDF",
                page_count=page_count,
                extraction_method="pymupdf_ocr_hybrid",
                text_extracted=has_text,
                raw_text=full_ocr_text,
                normalized_fields=normalized,
                pages=pages_result,
                confidence=avg_conf,
                ocr_engine_available=True,
                processing_errors=errors,
                demo_mode=settings.DEMO_MODE
            )

        except Exception as e:
            errors.append(f"Failed to process PDF: {str(e)}")
            return DocumentOCRResult(
                document_id=document_id,
                filename=filename,
                file_format="PDF",
                page_count=0,
                extraction_method="failed",
                text_extracted=False,
                raw_text="",
                normalized_fields={},
                pages=[],
                confidence=None,
                ocr_engine_available=self.is_tesseract_available(),
                processing_errors=errors,
                demo_mode=settings.DEMO_MODE
            )

    def _extract_image(
        self,
        document_id: str,
        filename: str,
        file_path: Path,
        file_format: FileFormat
    ) -> DocumentOCRResult:
        errors: List[str] = []

        if not self.is_tesseract_available():
            errors.append(
                "Image text extraction requires Tesseract OCR engine, which is not currently detected. "
                "Install Tesseract-OCR (https://github.com/UB-Mannheim/tesseract/wiki on Windows) "
                "and set TESSERACT_CMD in .env."
            )
            return DocumentOCRResult(
                document_id=document_id,
                filename=filename,
                file_format=file_format,
                page_count=1,
                extraction_method="none",
                text_extracted=False,
                raw_text="",
                normalized_fields={},
                pages=[],
                confidence=None,
                ocr_engine_available=False,
                processing_errors=errors,
                demo_mode=settings.DEMO_MODE
            )

        try:
            with Image.open(file_path) as img:
                img_rgb = img.convert("RGB")
                raw_text, confidence = self._run_tesseract_ocr(img_rgb)

            has_text = len(raw_text.strip()) > 0
            page_res = OCRPageResult(
                page_number=1,
                text=raw_text,
                char_count=len(raw_text),
                confidence=confidence
            )
            normalized = self._normalize_fields(raw_text) if has_text else {}

            return DocumentOCRResult(
                document_id=document_id,
                filename=filename,
                file_format=file_format,
                page_count=1,
                extraction_method="tesseract_ocr",
                text_extracted=has_text,
                raw_text=raw_text,
                normalized_fields=normalized,
                pages=[page_res],
                confidence=confidence,
                ocr_engine_available=True,
                processing_errors=errors,
                demo_mode=settings.DEMO_MODE
            )
        except Exception as e:
            errors.append(f"Image OCR processing failed: {str(e)}")
            return DocumentOCRResult(
                document_id=document_id,
                filename=filename,
                file_format=file_format,
                page_count=1,
                extraction_method="failed",
                text_extracted=False,
                raw_text="",
                normalized_fields={},
                pages=[],
                confidence=None,
                ocr_engine_available=True,
                processing_errors=errors,
                demo_mode=settings.DEMO_MODE
            )

    def _run_tesseract_ocr(self, img: Image.Image) -> Tuple[str, Optional[float]]:
        """
        Runs Tesseract OCR on a PIL Image and computes average word confidence.
        """
        try:
            # Extract verbatim string
            text = pytesseract.image_to_string(img)
            text = text.strip()

            # Extract confidence data
            data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
            confidences = [
                float(c)
                for c in data.get("conf", [])
                if c is not None and float(c) >= 0
            ]
            avg_conf = (
                round(sum(confidences) / len(confidences), 1)
                if confidences
                else None
            )
            return text, avg_conf
        except pytesseract.TesseractNotFoundError:
            self._tesseract_available = False
            return "", None
        except Exception:
            return "", None

    def _normalize_fields(self, raw_text: str) -> Dict[str, str]:
        """
        Extracts structured fields from raw text via deterministic pattern matching.
        CRITICAL COMPLIANCE RULE:
        Never invent missing values. If a field cannot be reliably extracted from
        the text, it is omitted.
        """
        fields: Dict[str, str] = {}
        if not raw_text:
            return fields

        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

        # 1. Registration / Certificate Number
        # Matches formats like: REGISTRATION NUMBER: REG1324, REG NO: REG1029, CERT/REG/9821, AICTE/APP/2026/1024
        reg_match = re.search(
            r"(?:REGISTRATION\s*(?:NUMBER|NO\.?|#)?|CERTIFICATE\s*(?:NUMBER|NO\.?|#)?|REF\.?\s*(?:NUMBER|NO\.?|#)?|REFERENCE\s*(?:NUMBER|NO\.?|#)?|APPLICATION\s*(?:ID|NUMBER|NO\.?|#)?|REG\.?\s*NO\.?)\s*[:#=\-]\s*([A-Z0-9\/-]{3,30})",
            raw_text,
            re.IGNORECASE
        )
        if reg_match:
            candidate = reg_match.group(1).strip()
            # Must have at least one digit or slash, and not just generic words
            if any(ch.isdigit() for ch in candidate) and candidate.upper() not in ["NUMBER", "DETAILS", "FORM", "DATE", "STATUS", "CODE", "REGISTRATION"]:
                fields["Registration Number"] = candidate

        if "Registration Number" not in fields:
            # Standalone REG code search (e.g. REG1324, REG1029, REG8888)
            standalone_reg = re.search(r"\b(REG[-_]?\d{3,8})\b", raw_text, re.IGNORECASE)
            if standalone_reg:
                fields["Registration Number"] = standalone_reg.group(1).upper()
            else:
                aicte_ref = re.search(r"\b(AICTE\/[A-Z0-9\/-]+)\b", raw_text, re.IGNORECASE)
                if aicte_ref:
                    fields["Registration Number"] = aicte_ref.group(1)

        # 2. Institution / Entity Name
        # Looks for lines with College, Institute, University, Society, Trust
        for line in lines:
            if re.search(r"\b(College|Institute|University|Academy|Polytechnic|Trust|Foundation|Society)\b", line, re.IGNORECASE):
                # Clean prefix words like "Name of Institution:"
                clean_name = re.sub(
                    r"^(?:NAME OF (?:THE )?(?:INSTITUTION|COLLEGE|APPLICANT)|INSTITUTE NAME)[:\s-]*",
                    "",
                    line,
                    flags=re.IGNORECASE
                ).strip()
                if len(clean_name) >= 5 and not clean_name.upper().startswith("ALL INDIA COUNCIL"):
                    fields["Institution Name"] = clean_name
                    break

        # 3. Issuing Authority
        authority_keywords = [
            ("All India Council for Technical Education", "All India Council for Technical Education (AICTE)"),
            ("Directorate of Technical Education", "Directorate of Technical Education"),
            ("National Board of Accreditation", "National Board of Accreditation (NBA)"),
            ("Fire & Safety", "Fire & Emergency Services Department"),
            ("Notary Public", "Notary Public / Oath Commissioner")
        ]
        for keyword, label in authority_keywords:
            if re.search(rf"\b{re.escape(keyword)}\b", raw_text, re.IGNORECASE):
                fields["Issuing Authority"] = label
                break

        # 4. Dates (Issue / Valid / Submission Date)
        date_patterns = [
            r"\b(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})\b",
            r"\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+\d{2,4})\b"
        ]
        for pattern in date_patterns:
            date_match = re.search(pattern, raw_text, re.IGNORECASE)
            if date_match:
                fields["Detected Date"] = date_match.group(1).strip()
                break

        # 5. Document Type / Classification
        doc_type_markers = [
            (r"NO OBJECTION CERTIFICATE|NOC", "No Objection Certificate (NOC)"),
            (r"AFFIDAVIT", "Statutory Affidavit"),
            (r"APPROVAL ORDER|LETTER OF APPROVAL", "Letter of Approval"),
            (r"CERTIFICATE OF REGISTRATION|REGISTRATION CERTIFICATE", "Registration Certificate"),
            (r"APPLICATION FORM", "Institutional Application Form")
        ]
        for marker_regex, label in doc_type_markers:
            if re.search(rf"\b{marker_regex}\b", raw_text, re.IGNORECASE):
                fields["Detected Document Type"] = label
                break

        return fields


ocr_service = OCRService()
