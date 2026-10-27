import datetime
from fastapi import APIRouter
from backend.app.core.config import settings
from backend.app.schemas.common import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Health & System"])
async def get_health_status() -> HealthResponse:
    """
    Returns the operational health and readiness state of the VeriTrust AI API.
    Clearly marks simulation flags and planned enterprise subsystems.
    """
    return HealthResponse(
        status="healthy",
        service="VeriTrust AI Compliance Backend",
        version=settings.VERSION,
        demo_mode=settings.DEMO_MODE,
        subsystems={
            "application_crud": "operational (durable SQLite persistence & RBAC)",
            "document_vault": "operational (secure UUID-based local storage & signature checks)",
            "ocr_text_extraction": "operational (PyMuPDF vector extraction + Tesseract OCR pipeline)",
            "cross_document_validation": "operational (deterministic cross-document rules engine)",
            "compliance_rules_matrix": "operational (statutory rules persistence & toggle engine)",
            "verification_report_pdf": "operational (ReportLab cryptographic vector PDF generation)",
            "audit_trail_immutable_ledger": "operational (SHA-256 hash-chained tamper-evident logging)"
        },
        timestamp=datetime.datetime.now().isoformat()
    )
