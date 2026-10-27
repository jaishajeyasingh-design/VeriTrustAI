from typing import Generic, TypeVar, Optional, Dict, Any
from pydantic import BaseModel, Field

T = TypeVar("T")


class HealthResponse(BaseModel):
    status: str = Field(..., example="healthy")
    service: str = Field(..., example="VeriTrust AI Compliance Backend")
    version: str = Field(..., example="0.1.0")
    demo_mode: bool = Field(True, description="When true, OCR extraction & verification pipelines operate in simulated mode")
    subsystems: Dict[str, str] = Field(
        default_factory=lambda: {
            "application_crud": "operational",
            "ocr_ingestion": "planned",
            "cross_document_comparison": "planned",
            "rules_evaluation_engine": "planned",
            "report_pdf_generator": "planned",
            "audit_trail_ledger": "planned"
        }
    )
    timestamp: str


class PaginationMeta(BaseModel):
    total: int
    skip: int
    limit: int
    count: int


class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Operation completed successfully"
    data: Optional[T] = None
    meta: Optional[Dict[str, Any]] = None
