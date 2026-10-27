# VeriTrust AI — Institutional Accreditation & Compliance Verification Platform (MERN Stack Edition)

VeriTrust AI is an enterprise-grade statutory verification platform designed for higher education regulatory bodies, institutional accreditation reviews, and government licensing bureaus. Built on the **MERN Stack** (MongoDB, Express.js, React, Node.js), it automates statutory document ingestion, OCR text extraction, cross-document deterministic consistency checks, reviewer adjudications, and cryptographic audit logging.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                   React 19 + TypeScript + Vite UI                      │
│            13 Interactive Modules • Professional Dark/Navy Theme       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ REST API (X-API-Key / Bearer)
┌───────────────────────────────────▼────────────────────────────────────┐
│                  Express.js + Node.js Enterprise Backend               │
│                                                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │   OCR Pipeline   │  │ Validation Engine│  │    PDFKit Engine     │  │
│  │  pdf-parse + OCR │  │  Rules Matrix    │  │ Signed Vector PDFs   │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────┬───────────┘  │
│           │                     │                       │              │
│  ┌────────▼─────────────────────▼───────────────────────▼───────────┐  │
│  │                 Mongoose ODM Data Access Layer                   │  │
│  │         Strict App Isolation • Indexed Collections • Audit Chain  │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            │                                                   │
┌───────────▼───────────┐                           ┌───────────▼───────────┐
│   MongoDB Database    │                           │ Non-Public Storage    │
│   mongodb://127.0.0.1 │                           │ backend/uploads/      │
│   /veritrustai        │                           │ backend/uploads/rep/  │
└───────────────────────┘                           └───────────────────────┘
```

---

## Phase 3 Implementation Summary

### Part A — Durable Database Persistence
- **SQLAlchemy 2.x & SQLite**: Configured via `DATABASE_URL` environment variable (`backend/data/veritrust.db`).
- **Relational Models (`backend/app/db/models.py`)**:
  - `applications`: Dossier metadata, compliance scores, risk ratings, and review timeline.
  - `documents`: Secure document catalog, OCR status, storage paths, raw text, and extracted statutory fields.
  - `compliance_rules`: Deterministic rule definitions, severities, and enabled states.
  - `findings`: Cross-document discrepancy items, side-by-side evidence, and reviewer adjudications.
  - `verification_reports`: Persisted report summaries, compliance ratings, download paths, and SHA-256 hashes.
  - `audit_events`: Immutable chronological ledger entries with SHA-256 cryptographic hash chaining.
- **Controlled Idempotent Initialization (`backend/app/db/init_db.py`)**:
  - Automatically initializes schema and seeds initial records on server startup.
  - **Duplicate Prevention**: Queries existing tables prior to insertion; safe across multiple server restarts.
- **Strict Data Isolation**:
  - Documents, findings, and reports enforce relational foreign keys (`application_id`).
  - Cross-application document leakage is prevented at both the database query and service layers.
- **Controlled Binary Storage**:
  - File binaries remain in private, non-public directory `backend/uploads/`.
  - Database stores file metadata, UUID filenames, and verified storage paths.

### Part B — Real ReportLab PDF Report Generation
- **ReportLab Vector Engine (`backend/app/services/report_service.py`)**:
  - Compiles live data into official, downloadable vector PDF dossiers.
  - Includes institutional overview, compliance scorecard, document vault audit, OCR field extractions, side-by-side discrepancy cards, reviewer actions, and audit trail records.
- **Mandatory Assistive Disclaimer**:
  - Every generated PDF features a highlighted statutory notice stating that OCR and cross-entity findings are algorithmic triage tools and do not constitute legal proof of authenticity or forgery.
  - No external state or federal registries are claimed to have been checked unless explicitly evidenced.
- **Secure Endpoints (`backend/app/api/v1/endpoints/reports.py`)**:
  - `POST /api/v1/reports/generate`: Generates real PDF and persists report record.
  - `GET /api/v1/reports/`: Lists all generated verification reports.
  - `GET /api/v1/reports/{report_id}`: Retrieves report metadata.
  - `GET /api/v1/reports/{report_id}/download`: Authenticated file download (`X-API-Key`) with existence and ownership checks.
- **UI Integration (`VerificationReportsModule.tsx` & `ApplicationDetailsModule.tsx`)**:
  - Connected real PDF report generation and download streams; removed simulated toast placeholders.

---

## Database Backup & Disaster Recovery

### 1. Online SQLite Backup
To create a consistent live snapshot of the database without stopping the service:

```bash
# Using SQLite CLI online backup API
sqlite3 backend/data/veritrust.db ".backup 'backend/data/veritrust_backup_$(date +%Y%m%d).db'"
```

On Windows PowerShell:
```powershell
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item -Path "backend\data\veritrust.db" -Destination "backend\data\veritrust_backup_$timestamp.db"
```

### 2. Backup of Private File Uploads & Reports
Both the database file and physical storage directories must be archived together:
- `backend/data/veritrust.db`
- `backend/uploads/` (uploaded credentials)
- `backend/uploads/reports/` (generated signed PDF reports)

### 3. Disaster Recovery / Restore
1. Stop the backend server process.
2. Replace `backend/data/veritrust.db` with your verified backup snapshot.
3. Restore `backend/uploads/` from backup archives.
4. Restart the backend service; `init_database()` will detect existing data and preserve restored records without re-seeding.

---

## Audit Ledger Hash-Chain & Security Limitations

The audit trail records each regulatory action (`action`, `timestamp`, `user`, `application_id`, `details`) and chains it to the previous record:

$$\text{Digest}_n = \text{SHA256}(\text{Hash}_{n-1} \parallel \text{Timestamp} \parallel \text{User} \parallel \text{Action} \parallel \text{AppID} \parallel \text{Details})$$

### Security & Regulatory Notice
- **Tamper Evidence**: Cryptographic hash chaining detects in-flight row alterations and unauthorized manual edits made within standard application workflows.
- **Privilege Escalation Limitation**: Because SQLite is hosted on local filesystem storage without write-once physical hardware (WORM) or decentralized consensus, a privileged administrator with direct OS/SQL write access could alter rows and recalculate sequential hash chains.
- **Enterprise Recommendation**: For multi-jurisdictional non-repudiation, periodic ledger roots should be anchored to an external cryptographic timestamping service or immutable cloud ledger.

---

## Getting Started & Running

### Prerequisites
- Node.js (v18+) & npm
- Python (v3.11+)

### 1. Backend Setup
```bash
# Navigate to project root
cd VeriTrustAI

# Create and activate virtual environment
python -m venv backend/.venv
# Windows:
backend\.venv\Scripts\activate
# Linux/macOS:
source backend/.venv/bin/activate

# Install dependencies
pip install fastapi uvicorn sqlalchemy reportlab pydantic pydantic-settings python-multipart pymupdf pytesseract pillow pytest pytest-asyncio

# Configure environment
cp .env.example .env

# Run FastAPI server
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup
```bash
# Install frontend dependencies
npm install

# Run Vite development server
npm run dev
```

The application UI is accessible at `http://localhost:5173`.
FastAPI Swagger documentation is accessible at `http://localhost:8000/api/v1/docs`.

---
---

## Phase 4 Implementation: Security Hardening, Access Control & Demo Readiness

### 1. API Endpoint Classification (Public vs Protected)

| Route | Method | Classification | Required Role | Description |
| :--- | :---: | :---: | :---: | :--- |
| `/api/v1/health` | `GET` | **Public** | None | System readiness and subsystem status |
| `/docs`, `/redoc`, `/openapi.json` | `GET` | **Public** | None | Interactive OpenAPI specification |
| `/api/v1/applications/` | `GET` | **Protected** | Any Authenticated | Filtered list of applications |
| `/api/v1/applications/` | `POST` | **Protected** | Any Authenticated | Create a new application dossier |
| `/api/v1/applications/{id}` | `GET` | **Protected** | Any Authenticated | Full application dossier details |
| `/api/v1/applications/{id}/status` | `PATCH` | **Protected** | `reviewer`, `administrator` | Reviewer status change & decision notes |
| `/api/v1/applications/{id}` | `DELETE` | **Protected** | `administrator` | Permanent application dossier deletion |
| `/api/v1/applications/{id}/validate` | `POST` | **Protected** | `reviewer`, `administrator` | Execute cross-document validation |
| `/api/v1/applications/{id}/findings` | `GET` | **Protected** | Any Authenticated | Retrieve verification findings |
| `/api/v1/applications/{id}/validation-summary` | `GET` | **Protected** | Any Authenticated | Latest validation score and rule metrics |
| `/api/v1/applications/{id}/findings/{f_id}/review` | `PATCH` | **Protected** | `reviewer`, `administrator` | Reviewer adjudication on finding |
| `/api/v1/documents/` | `GET` | **Protected** | Any Authenticated | List documents in vault |
| `/api/v1/documents/upload` | `POST` | **Protected** | Any Authenticated | File upload & OCR extraction (validates app exists) |
| `/api/v1/documents/{id}` | `GET` | **Protected** | Any Authenticated | Document metadata (enforces app boundary) |
| `/api/v1/documents/{id}/ocr` | `GET` | **Protected** | Any Authenticated | Extracted raw OCR text & structured fields |
| `/api/v1/documents/{id}` | `DELETE` | **Protected** | `reviewer`, `administrator` | Remove document from vault |
| `/api/v1/rules/` | `GET` | **Protected** | Any Authenticated | List statutory compliance rules |
| `/api/v1/rules/{id}/toggle` | `PATCH` | **Protected** | `reviewer`, `administrator` | Enable or disable compliance rule |
| `/api/v1/rules/test` | `POST` | **Protected** | Any Authenticated | Evaluate rule matrix against test payload |
| `/api/v1/audit/` | `GET` | **Protected** | Any Authenticated | Retrieve chronological audit trail |
| `/api/v1/audit/` | `POST` | **Protected** | Any Authenticated | Append audit ledger entry |
| `/api/v1/audit/verify` | `GET` | **Protected** | Any Authenticated | Validate SHA-256 hash chain continuity |
| `/api/v1/reports/` | `GET` | **Protected** | Any Authenticated | List generated PDF reports |
| `/api/v1/reports/{id}` | `GET` | **Protected** | Any Authenticated | Retrieve report metadata (enforces app boundary) |
| `/api/v1/reports/generate` | `POST` | **Protected** | `reviewer`, `administrator` | Generate vector PDF dossier report |
| `/api/v1/reports/{id}/download` | `GET` | **Protected** | Any Authenticated | Download official PDF (enforces app boundary) |

---

### 2. Role-Based Access Control (RBAC) Matrix

Backend RBAC is strictly enforced on the server rather than relying on frontend UI visibility:

| Role | Application CRUD | Document Upload | Validation Run | Finding Review | Rule Toggle | Status Adjudication | Report Generation | Application Deletion |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Applicant** | Read/Create Own | Allowed | View Summary | Forbidden (403) | Forbidden (403) | Forbidden (403) | Forbidden (403) | Forbidden (403) |
| **Reviewer** | Read/Update | Allowed | Allowed | Allowed | Allowed | Allowed | Allowed | Forbidden (403) |
| **Administrator**| Full CRUD | Allowed | Allowed | Allowed | Allowed | Allowed | Allowed | Allowed |

---

### 3. Upload & File Security Controls

1. **Non-Public Storage**: Uploads reside in `backend/uploads/` and reports in `backend/uploads/reports/`, outside the web server root. Direct public HTTP access to file paths is blocked.
2. **Safe Filenames & UUID Storage**: Client-provided filenames are sanitized (`Path(name).name` and regex stripping) to defeat path traversal (`../../`). Disk storage uses cryptographically unique UUIDs (`DOC-XXXXXX_<uuid>.ext`).
3. **Magic Byte Verification**: File headers are strictly validated against magic byte sequences (`%PDF-` for PDFs, `\x89PNG\r\n\x1a\n` for PNGs, `\xff\xd8\xff` for JPEGs) to prevent MIME-type and extension spoofing.
4. **Guaranteed File Cleanup on Error**: Ingestion is wrapped in `try...except` blocks; if OCR extraction or database writing fails, or if the associated application is invalid, the physical disk file is deleted immediately.
5. **Cross-Application Boundary Protection**: When fetching documents or reports with an `application_id` boundary check, access is rejected with `HTTP 403 Forbidden` if the resource belongs to another application dossier.

---

### 4. Audit Trail & Hash Chain Limitations

- **Cryptographic Hash Chaining**: Every audit event computes `SHA256(prev_hash | timestamp | user | action | application_id | details)` and links to the predecessor digest.
- **Tamper Evidence**: Calling `GET /api/v1/audit/verify` verifies pointer continuity across the database. Any direct record modification or deletion breaks the chain.
- **Important Security & Regulatory Limitation**: Because SQLite is stored on local filesystem storage without append-only hardware (WORM) or decentralized consensus, a system administrator with direct disk write access could rewrite records and recalculate hashes. The ledger is **tamper-evident under standard application operations**, but **not independently immutable** against root-level database modifications. For legal multi-party non-repudiation, external ledger anchoring (e.g. RFC 3161 timestamping authority or public blockchain) is required.

---

### 5. Deployment Limitations & Production Readiness

- **SQLite Local Concurrency**: SQLite uses file locks. While WAL mode enables concurrent readers, write operations are serialized. For high-concurrency production deployments with multiple worker processes, migrate `DATABASE_URL` to PostgreSQL.
- **Serverless / Stateless Container Ephemeral Storage**: Serverless platforms (AWS Lambda, Google Cloud Run, Vercel, Heroku) discard local disk storage on container termination or scaling events. In production:
  - Migrate database to hosted PostgreSQL (e.g., AWS RDS, Supabase, Google Cloud SQL).
  - Migrate document and report storage to object storage (e.g., AWS S3, Google Cloud Storage, Cloudflare R2).
- **Environment Secrets**: Never commit `.env`. In production, supply `API_KEY`, `DATABASE_URL`, `UPLOAD_DIR`, and `REPORTS_DIR` through platform secret managers (AWS Secrets Manager, GCP Secret Manager, or GitHub Secrets).

---

## Test Execution & Verification

### Running All 54 Automated Backend Tests
```bash
backend\.venv\Scripts\python.exe -m pytest backend/tests/ -v -p no:warnings
```
**Results: 54/54 PASSED (100% Pass Rate)**
- `test_document_upload.py`: 10/10 PASSED (PDF extraction, OCR routing, size/signature security checks)
- `test_persistence_and_reports.py`: 11/11 PASSED (SQLite persistence, isolation, ReportLab PDF generation, authenticated downloads)
- `test_security_and_hardening.py`: 24/24 PASSED (Auth enforcement, missing/invalid credentials, RBAC 403 checks, cross-app access checks, controlled tampering detection)
- `test_validation_engine.py`: 9/9 PASSED (Cross-document comparison, mismatch detection, rule matrix)

### Running Live End-to-End Integration Verification Script
```bash
backend\.venv\Scripts\python.exe verify_phase4_integration.py
```
**Results: 13/13 Live Checks PASSED**
- 1. Public Health & Subsystem Readiness
- 2a. Missing Credentials Rejected (401)
- 2b. Invalid Key Rejected (401)
- 3. RBAC Enforcement (Applicant blocked from Reviewer actions - 403)
- 4. Cross-Application Access Denied (403)
- 5. E2E Step 1: Create Application
- 6. E2E Step 2 & 3: Upload Document & Extract OCR Fields
- 7. E2E Step 4: Strict Application Document Association
- 8. E2E Step 5 & 6: Cross-Document Validation & Evidence Findings
- 9. E2E Step 7: Record Reviewer Decisions & Notes
- 10. E2E Step 8: Generate Real PDF Report (ReportLab)
- 11. E2E Step 9: Authenticated PDF Download
- 12. E2E Step 10: Cryptographic Hash Chain Continuity & SQLite Persistence

### Frontend Production Build
```bash
npm run build
```
**Results: PASSED (`tsc -b && vite build` completed with 0 errors).**

---

## Hackathon Demo Readiness Checklist (5-Minute Live Demo)

Follow these exact steps during a live demonstration or presentation:

1. **Verify Backend Health & Connectivity**:
   - Open browser at `http://localhost:5173`.
   - Observe the live Topbar indicator: `Connected to FastAPI Backend` with live ping latency (e.g. ~12ms).
   - Click **Settings** (Module 13) &rarr; Click **"Test Connection"** to show instant `Health Check: 200 OK` from FastAPI.

2. **Demonstrate Role-Based Access Control (RBAC)**:
   - In the sidebar role switcher, switch role to **"Applicant"**.
   - Navigate to **Compliance Rules** (Module 10) &rarr; attempt to toggle a rule or change application status.
   - Note the backend authorization enforcement blocking unauthorized changes.
   - Switch back to **"Compliance Reviewer"** (Senior Compliance Officer) for administrative actions.

3. **Explore Applications & Real Document Vault**:
   - Click **Applications** (Module 3) &rarr; select **ABC College of Engineering** (`APP2026001`).
   - Click **Document Vault** (Module 9) &rarr; inspect uploaded files (`Application_Form.pdf`, `Registration_Certificate.jpg`).
   - Click any document to view real extracted OCR statutory fields (e.g. Registration Number `REG1324`).

4. **Run Cross-Document Validation Engine**:
   - Navigate to **Application Details** (`APP2026001`) &rarr; click **"Run Verification"** (Module 7).
   - Observe deterministic rule evaluation:
     - Compliance Score: `74 / 100` (Needs Review).
     - Flagged Discrepancy: Registration Number mismatch between Form (`REG1324`) and Certificate (`REG1029`).
     - Evidence references display side-by-side comparison proof directly from source documents.

5. **Adjudicate Finding as Reviewer**:
   - Under Findings, click **"Review Finding"**.
   - Select **"Reviewed"**, enter reviewer notes: *"Affidavit inspected and approved for Hackathon demo."*
   - Submit: status immediately updates and appends an immutable audit event to the ledger.

6. **Generate & Download Real PDF Report**:
   - Navigate to **Verification Reports** (Module 11) or click **"Generate Report"** on the application.
   - Click **"Generate PDF Report"**: the backend compiles persisted SQLite data via ReportLab.
   - Click **"Download Official PDF Dossier"**: browser downloads the real vector PDF.
   - Open the PDF to showcase the institutional scorecard, OCR extraction tables, discrepancy cards, reviewer signatures, audit hashes, and the mandatory statutory assistive disclaimer.

7. **Verify Audit Trail & Cryptographic Provenance**:
   - Click **Audit Trail** (Module 12).
   - View chronological SHA-256 block digests for every upload, rule execution, and review decision.
   - Point out the ledger hash verification status confirming 100% chain integrity.
