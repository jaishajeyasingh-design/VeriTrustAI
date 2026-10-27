# VeriTrust AI — FastAPI Backend Architecture

REST API backend architecture for **VeriTrust AI** (AI-Powered Application Validation, Document Authentication & Regulatory Compliance Verification).

---

## 1. Quick Start

### Prerequisites
- Python 3.10+ (Verified on Python 3.13)
- Optional for Scanned/Image OCR: **Tesseract OCR Engine**
  - **Windows**: Download installer from [UB-Mannheim Tesseract Releases](https://github.com/UB-Mannheim/tesseract/wiki) (installs to `C:\Program Files\Tesseract-OCR\tesseract.exe`).
  - **macOS**: `brew install tesseract`
  - **Linux (Ubuntu/Debian)**: `sudo apt-get install tesseract-ocr`
  - *Note: Digital text-based PDFs extract directly with PyMuPDF even without Tesseract installed.*

### Installation & Execution Commands

```bash
# 1. Navigate to the project root
cd c:\Users\jaish\OneDrive\Desktop\VeriTrustAI

# 2. Activate the virtual environment
# On Windows PowerShell:
.\backend\.venv\Scripts\Activate.ps1
# On Windows Command Prompt:
.\backend\.venv\Scripts\activate.bat

# 3. Install backend dependencies
pip install -r backend/requirements.txt

# 4. Start the FastAPI development server
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

Once running:
- **Interactive Swagger Documentation:** `http://localhost:8000/api/v1/docs`
- **ReDoc Documentation:** `http://localhost:8000/api/v1/redoc`
- **System Health Endpoint:** `http://localhost:8000/api/v1/health`

---

## 2. Directory Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI application factory, CORS, routes inclusion
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py               # Settings (upload limits, upload dir, Tesseract path, CORS)
│   │   └── security.py             # API Key / Bearer token authentication dependency
│   ├── schemas/                    # Pydantic models mirroring frontend TypeScript interfaces 1:1
│   │   ├── __init__.py
│   │   ├── common.py               # HealthResponse, ApiResponse, PaginationMeta
│   │   ├── application.py          # ApplicationCreate, ApplicationStatusUpdate, ApplicationResponse
│   │   ├── document.py             # DocumentItem, DocumentOCRResult, OCRPageResult
│   │   ├── finding.py              # VerificationFinding (mismatches, discrepancies)
│   │   ├── rule.py                 # ComplianceRule, RuleToggleRequest, RuleTestRequest
│   │   ├── report.py               # VerificationReport
│   │   └── audit.py                # AuditEvent, AuditEventCreate
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── api.py              # v1 API router aggregator
│   │       └── endpoints/
│   │           ├── health.py       # [Implemented] GET /api/v1/health
│   │           ├── applications.py # [Implemented] Full CRUD for institutional dossiers
│   │           ├── documents.py    # [Implemented] POST /upload, GET /{id}, GET /{id}/ocr, DELETE
│   │           ├── rules.py        # [Implemented] Compliance Rules evaluation matrix
│   │           ├── reports.py      # [Planned] PDF audit report generation
│   │           └── audit.py        # [Implemented] Tamper-evident SHA-256 audit ledger
│   ├── services/                   # Business logic layer
│   │   ├── __init__.py
│   │   ├── application_service.py  # Application dossier repository (in-memory, ORM-ready)
│   │   ├── document_service.py     # Document validation, storage, and lifecycle management
│   │   └── ocr_service.py          # PyMuPDF vector text extraction & Tesseract OCR pipeline
│   └── data/
│       ├── __init__.py
│       └── seed_data.py            # Seed data matching frontend mockData (APP2026001 - APP2026006)
├── tests/                          # Pytest test suite
│   ├── __init__.py
│   └── test_document_upload.py     # 10 integration tests for upload, OCR, limits, signatures
├── uploads/                        # Non-public, isolated local storage directory for uploaded files
├── requirements.txt                # FastAPI, Uvicorn, Pydantic, PyMuPDF, pytesseract, Pillow, pytest
├── verify_integration.py           # End-to-end 6-check verification script
├── .env.example                    # Sample environment variables
└── README.md                       # Architecture & setup guide
```

---

## 3. Endpoints Matrix: Implemented vs. Planned

| Endpoint | Method | Status | Description |
|---|---|---|---|
| `GET /` | `GET` | **Implemented** | Service root, online status, documentation links, and demo notice. |
| `GET /api/v1/health` | `GET` | **Implemented** | System health check, version, simulation flags, and subsystem states. |
| `GET /api/v1/applications/` | `GET` | **Implemented** | Filterable list by `search`, `status`, `type`, `priority`, and pagination. |
| `POST /api/v1/applications/` | `POST` | **Implemented** | Create new institutional dossier (201 Created). |
| `GET /api/v1/applications/{id}` | `GET` | **Implemented** | Retrieve single application with attached documents, findings, and timeline. |
| `PATCH /api/v1/applications/{id}/status` | `PATCH` | **Implemented** | Reviewer decision action (Approve/Reject/Review) with note logging. |
| `DELETE /api/v1/applications/{id}` | `DELETE` | **Implemented** | Delete application from registry. |
| `GET /api/v1/audit/` | `GET` | **Implemented** | Retrieve immutable audit events with SHA-256 cryptographic hashes. |
| `POST /api/v1/audit/` | `POST` | **Implemented** | Append audit event with automated hash calculation. |
| `GET /api/v1/documents/` | `GET` | **Implemented** | List cataloged documents in Document Vault. |
| `POST /api/v1/documents/upload` | `POST` | **Implemented** | Upload PDF/PNG/JPG, validate magic bytes, store securely, and run OCR extraction. |
| `GET /api/v1/documents/{id}` | `GET` | **Implemented** | Get metadata and status for a single document. |
| `GET /api/v1/documents/{id}/ocr` | `GET` | **Implemented** | Retrieve verbatim extracted text, per-page extraction records, and normalized fields. |
| `DELETE /api/v1/documents/{id}` | `DELETE` | **Implemented** | Delete document from vault registry and cache. |
| `GET /api/v1/rules/` | `GET` | **Implemented** | List regulatory rules. |
| `PATCH /api/v1/rules/{id}/toggle` | `PATCH` | **Implemented** | Enable/disable compliance rules. |
| `POST /api/v1/rules/test` | `POST` | **Planned (Mock)** | Planned for AST rule engine evaluation against uploaded payloads. |
| `GET /api/v1/reports/` | `GET` | **Implemented** | List verification audit reports. |
| `POST /api/v1/reports/generate` | `POST` | **Planned (Mock)** | Planned for WeasyPrint/ReportLab PDF certificate generation. |

---

## 4. Document Ingestion & OCR Security Architecture

1. **File Type & Signature Whitelist**:
   - Accepts `.pdf`, `.png`, `.jpg`, `.jpeg`.
   - Magic byte checks reject renamed executable or script files:
     - PDF: checks for `%PDF-` signature.
     - PNG: checks for `\x89PNG\r\n\x1a\n` header.
     - JPEG: checks for `\xff\xd8\xff` SOI marker.
2. **Payload Protection**:
   - Enforces configurable size limit (default: 15 MB via `MAX_UPLOAD_SIZE_BYTES`).
   - Rejects empty files (0 bytes).
3. **Path Traversal & Storage Isolation**:
   - Strips directory traversal paths from client filenames.
   - Saves files under unique UUID filenames (`{doc_id}_{uuid}.ext`) in isolated directory (`backend/uploads/`).
   - Upload directory is **not exposed via static HTTP mounts**.
4. **Deterministic Field Normalization**:
   - Uses strict regex parsing on verbatim extracted text to extract statutory identifiers (`Registration Number`, `Institution Name`, `Issuing Authority`, `Dates`).
   - **Never hallucinates missing fields**; unread values remain unknown or omitted.
5. **Authenticity Disclaimer**:
   - OCR text extraction is an assistive readability pipeline and does not constitute statutory verification or proof of authenticity.

---

## 5. Running Automated Tests

```bash
# Run the 10-test unit and integration test suite:
pytest backend/tests/test_document_upload.py -v -p no:warnings

# Run live end-to-end integration verification (6 checks against running server):
python backend/verify_integration.py
```
