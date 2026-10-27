from fastapi import APIRouter
from backend.app.api.v1.endpoints import (
    health,
    applications,
    documents,
    rules,
    reports,
    audit
)

api_router = APIRouter()

# Health & System
api_router.include_router(health.router, tags=["Health"])

# Application Dossier CRUD (Fully Implemented)
api_router.include_router(applications.router, prefix="/applications", tags=["Applications"])

# Document Vault & OCR Ingestion (Planned / In-Memory Mock)
api_router.include_router(documents.router, prefix="/documents", tags=["Document Vault (Planned OCR)"])

# Compliance Rules Engine (Planned / In-Memory Mock)
api_router.include_router(rules.router, prefix="/rules", tags=["Compliance Rules (Planned Matrix)"])

# Verification Reports (Planned / In-Memory Mock)
api_router.include_router(reports.router, prefix="/reports", tags=["Verification Reports (Planned PDF)"])

# Tamper-Evident Audit Ledger (Fully Implemented with SHA256)
api_router.include_router(audit.router, prefix="/audit", tags=["Audit Trail"])
