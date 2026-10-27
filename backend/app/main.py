from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.api.v1.api import api_router
from backend.app.db.init_db import init_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Enforce fail-closed security validation for production deployments
    settings.validate_production_security()
    # Ensure database schema is initialized and seeded idempotently on startup
    init_database()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    description="""
# VeriTrust AI — AI-Powered Application Validation & Compliance Verification Engine

REST API backend designed for institutional accreditation dossiers, document authentication, cross-entity text verification, and regulatory compliance checks.

> **DEMO / SIMULATION NOTICE:**
> OCR extraction, authenticity scoring, and cross-document comparison findings operate in simulated demo mode for frontend UI evaluation. All data models are typed and structured for drop-in connection to enterprise OCR engines (Tesseract / Google Cloud Vision), rules engines, and cryptographic ledgers.
    """,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# CORS Middleware for React + Vite Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "demo_mode": settings.DEMO_MODE,
        "docs_url": f"{settings.API_V1_STR}/docs",
        "health_check": f"{settings.API_V1_STR}/health",
        "notice": "Simulated AI compliance engine. Real OCR/validation pipeline scheduled for integration."
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
