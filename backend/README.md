# VeriTrust AI — MERN Stack Backend Architecture

High-performance Node.js, Express, and MongoDB backend architecture for **VeriTrust AI** (AI-Powered Application Validation, Evidentiary Document Authentication & Regulatory Compliance Verification).

---

## 1. Tech Stack Overview

- **M — MongoDB**: Scalable document database storing applications, documents, findings, compliance rules, and cryptographic audit ledger.
- **E — Express.js**: RESTful API framework handling authentication, routing, and controllers.
- **R — React**: Frontend user interface built with React 19, TypeScript, Vite, and TailwindCSS.
- **N — Node.js**: High-efficiency asynchronous JavaScript runtime.

---

## 2. Quick Start

### Prerequisites
- **Node.js**: v18+ (Verified on Node.js v24)
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017/veritrustai`) or MongoDB Atlas.

### Installation & Execution

```bash
# 1. Install backend dependencies
cd backend
npm install

# 2. Seed initial data (optional, auto-seeded on first run)
npm run seed

# 3. Start development server (with nodemon)
npm run dev

# Or start in production mode
npm start
```

### From Project Root

```bash
# Run backend dev server from root
npm run server

# Run frontend dev server from root
npm run dev
```

Once running:
- **API Base URL**: `http://localhost:5000/api/v1`
- **System Health Endpoint**: `http://localhost:5000/api/v1/health`
- **Frontend Dashboard**: `http://localhost:5173`

---

## 3. Architecture & Directory Structure

```
backend/
├── config/
│   ├── config.js                 # Environment settings & upload directories
│   └── db.js                     # MongoDB connection & health check via Mongoose
├── models/
│   ├── Application.js            # Mongoose Application model
│   ├── Document.js               # Mongoose DocumentItem model
│   ├── Finding.js                # Mongoose VerificationFinding model
│   ├── Rule.js                   # Mongoose ComplianceRule model
│   ├── Report.js                 # Mongoose VerificationReport model
│   └── AuditEvent.js             # Mongoose AuditEvent model (with chained SHA-256 hash)
├── controllers/
│   ├── applicationController.js  # CRUD, validation engine, finding reviews
│   ├── documentController.js     # Multipart upload, OCR extraction, document vault
│   ├── ruleController.js         # Compliance rule list, toggle, testing
│   ├── reportController.js       # Vector PDF generation, streaming, downloads
│   ├── auditController.js        # Tamper-evident audit log query & logging
│   └── healthController.js       # Health and subsystems status
├── routes/
│   ├── applicationRoutes.js
│   ├── documentRoutes.js
│   ├── ruleRoutes.js
│   ├── reportRoutes.js
│   ├── auditRoutes.js
│   ├── healthRoutes.js
│   └── index.js                  # Mounts all routers under /api/v1
├── services/
│   ├── validationService.js      # Cross-document comparison, fuzzy matching & scoring
│   ├── ocrService.js             # Native PDF text parsing & statutory regex extraction
│   ├── reportService.js          # Cryptographic PDF compiler with PDFKit
│   └── auditService.js           # Tamper-evident SHA-256 blockchain hash chaining
├── middleware/
│   ├── authMiddleware.js         # API Key & RBAC role validation
│   ├── uploadMiddleware.js       # Multer storage, size limits, file filtering
│   └── errorHandler.js           # Unified JSON error format ({ detail: ... })
├── data/
│   ├── seedData.js               # Statutory seed applications, documents, rules, findings
│   └── seedRunner.js             # Idempotent auto-seeder on boot
└── server.js                     # Main Express server entrypoint
```

---

## 4. API Endpoints Catalog

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | System health check and subsystem status |
| `GET` | `/api/v1/applications/` | List applications with search, status, type, priority filters |
| `POST` | `/api/v1/applications/` | Submit a new application dossier |
| `GET` | `/api/v1/applications/:id` | Get complete application dossier with documents & findings |
| `PATCH` | `/api/v1/applications/:id/status` | Update review status and append timeline step |
| `POST` | `/api/v1/applications/:id/validate` | Execute automated cross-document regulatory validation |
| `GET` | `/api/v1/applications/:id/findings` | Retrieve all detected discrepancies and findings |
| `PATCH` | `/api/v1/applications/:id/findings/:findingId/review` | Mark finding review decision (Verified_Accurate, Dismissed, etc.) |
| `GET` | `/api/v1/documents/` | List uploaded evidentiary documents |
| `POST` | `/api/v1/documents/upload` | Multipart file upload with automated OCR text extraction |
| `GET` | `/api/v1/documents/:id/ocr` | Retrieve detailed OCR extraction and statutory fields |
| `DELETE` | `/api/v1/documents/:id` | Remove document from vault and disk |
| `GET` | `/api/v1/rules/` | List all statutory compliance rules |
| `PATCH` | `/api/v1/rules/:id/toggle` | Enable or disable compliance rule |
| `GET` | `/api/v1/reports/` | List generated compliance audit dossiers |
| `POST` | `/api/v1/reports/generate` | Compile real vector PDF report with SHA-256 cryptographic seal |
| `GET` | `/api/v1/reports/:id/download` | Download binary PDF audit report |
| `GET` | `/api/v1/audit/` | Retrieve SHA-256 chained tamper-evident audit trail |
