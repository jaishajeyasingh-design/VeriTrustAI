from typing import Optional, Dict, List, Literal
from pydantic import BaseModel, Field

DocumentType = Literal["Application", "Certificate", "Affidavit", "Identity", "Approval", "NOC", "Financial"]
DocumentStatus = Literal["Processed", "Processing", "Failed", "Pending"]
DocumentOCRStatus = Literal["Completed", "In Progress", "Flagged"]
FileFormat = Literal["PDF", "JPG", "PNG"]


class OCRPageResult(BaseModel):
    page_number: int
    text: str
    char_count: int = 0
    confidence: Optional[float] = None


class DocumentOCRResult(BaseModel):
    document_id: str
    filename: str
    file_format: FileFormat
    page_count: int
    extraction_method: str = Field(..., description="Method used: pymupdf_direct, tesseract_ocr, pymupdf_ocr_hybrid, none, or failed")
    text_extracted: bool
    raw_text: str = Field(..., description="Raw verbatim extracted text from document")
    normalized_fields: Dict[str, str] = Field(default_factory=dict, description="Parsed statutory fields (only detected values, never fabricated)")
    pages: List[OCRPageResult] = Field(default_factory=list)
    confidence: Optional[float] = Field(None, description="Average OCR confidence percentage (0-100) if provided by OCR engine")
    ocr_engine_available: bool = True
    processing_errors: List[str] = Field(default_factory=list)
    demo_mode: bool = False
    disclaimer: str = "OCR text extraction is an assistive readability pipeline and does not constitute statutory verification or proof of authenticity."


class DocumentItem(BaseModel):
    id: str = Field(..., example="DOC-1001")
    name: str = Field(..., example="Application_Form.pdf")
    type: DocumentType = Field(..., example="Application")
    size: str = Field(..., example="2.4 MB")
    applicationId: str = Field(..., example="APP2026001")
    uploadedDate: str = Field(..., example="28-Oct-26")
    status: DocumentStatus = Field(..., example="Processed")
    ocrStatus: Optional[DocumentOCRStatus] = Field("Completed", example="Completed")
    url: Optional[str] = Field(None, example="/api/v1/documents/DOC-1001/download")
    fileFormat: FileFormat = Field(..., example="PDF")
    extractedFields: Optional[Dict[str, str]] = Field(default_factory=dict)
    authenticityScore: Optional[float] = Field(98.5, example=99.2)
    storagePath: Optional[str] = Field(None, description="Controlled server storage path in private upload directory")
    # Extended real processing metadata
    pageCount: Optional[int] = Field(None, example=2)
    rawText: Optional[str] = Field(None, description="Sample of extracted raw text")
    extractionMethod: Optional[str] = Field(None, example="pymupdf_direct")
    ocrEngineAvailable: Optional[bool] = Field(True, example=True)
    processingErrors: Optional[List[str]] = Field(default_factory=list)
    demo_mode: bool = Field(False, example=False)


class DocumentCreate(BaseModel):
    name: str
    type: DocumentType
    applicationId: str
    size: str = "1.5 MB"
    fileFormat: FileFormat = "PDF"

