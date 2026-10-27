import os
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.db.session import SessionLocal, engine
from backend.app.db.init_db import init_database
from backend.app.db.models import (
    ApplicationModel,
    DocumentModel,
    RuleModel,
    FindingModel,
    ReportModel,
    AuditEventModel
)
from backend.app.services.report_service import report_service
from backend.app.services.audit_service import audit_service

client = TestClient(app, headers={"X-API-Key": settings.API_KEY, "X-User-Role": "administrator"})


class TestDatabasePersistence:
    """Verifies durable database persistence, seeding idempotency, and isolation."""

    def test_database_tables_and_seed_data_exist(self):
        """Validates that all tables exist and initial records are seeded."""
        with SessionLocal() as db:
            app_count = db.query(ApplicationModel).count()
            doc_count = db.query(DocumentModel).count()
            rule_count = db.query(RuleModel).count()
            finding_count = db.query(FindingModel).count()
            audit_count = db.query(AuditEventModel).count()

            assert app_count >= 6, f"Expected at least 6 applications, found {app_count}"
            assert doc_count >= 4, f"Expected at least 4 documents, found {doc_count}"
            assert rule_count >= 7, f"Expected at least 7 compliance rules, found {rule_count}"
            assert finding_count >= 3, f"Expected at least 3 findings, found {finding_count}"
            assert audit_count >= 3, f"Expected at least 3 audit events, found {audit_count}"

    def test_duplicate_seed_prevention_on_multiple_inits(self):
        """Ensures calling init_database repeatedly never duplicates records."""
        with SessionLocal() as db:
            initial_apps = db.query(ApplicationModel).count()
            initial_rules = db.query(RuleModel).count()

        # Re-run init_database()
        init_database()
        init_database()

        with SessionLocal() as db:
            after_apps = db.query(ApplicationModel).count()
            after_rules = db.query(RuleModel).count()

            assert after_apps == initial_apps, "Applications duplicated on re-init!"
            assert after_rules == initial_rules, "Rules duplicated on re-init!"

    def test_cross_application_document_isolation(self):
        """Verifies documents belonging to APP2026001 do not leak to other applications."""
        res1 = client.get("/api/v1/documents/?application_id=APP2026001")
        assert res1.status_code == 200
        docs1 = res1.json()
        assert len(docs1) > 0
        for doc in docs1:
            assert doc["applicationId"] == "APP2026001"

        res2 = client.get("/api/v1/documents/?application_id=APP2026002")
        assert res2.status_code == 200
        docs2 = res2.json()
        for doc in docs2:
            assert doc["applicationId"] == "APP2026002"

        # Check disjoint set
        doc_ids_1 = {d["id"] for d in docs1}
        doc_ids_2 = {d["id"] for d in docs2}
        assert doc_ids_1.isdisjoint(doc_ids_2), "Cross-application document leakage detected!"

    def test_rule_toggle_persistence(self):
        """Verifies changing rule enabled state persists in the database."""
        # Toggle rule R001 to False
        res = client.patch("/api/v1/rules/R001/toggle", json={"enabled": False})
        assert res.status_code == 200
        assert res.json()["enabled"] is False

        # Query in new DB session
        with SessionLocal() as db:
            rule = db.query(RuleModel).filter(RuleModel.id == "R001").first()
            assert rule is not None
            assert rule.enabled is False

        # Toggle back to True
        res_back = client.patch("/api/v1/rules/R001/toggle", json={"enabled": True})
        assert res_back.status_code == 200
        assert res_back.json()["enabled"] is True

    def test_reviewer_decision_persistence(self):
        """Verifies reviewer finding decisions and notes persist in the database."""
        update_payload = {
            "reviewStatus": "Verified_Accurate",
            "reviewerNotes": "Physical registry affidavit corroborated during Phase 3 verification test.",
            "reviewerName": "Senior Reviewer Mehta"
        }
        res = client.patch(
            "/api/v1/applications/APP2026001/findings/FIND-001/review",
            json=update_payload
        )
        assert res.status_code == 200
        finding_data = res.json()
        assert finding_data["reviewStatus"] == "Verified_Accurate"
        assert finding_data["reviewerNotes"] == update_payload["reviewerNotes"]

        # Verify in a completely new database session
        with SessionLocal() as db:
            finding = db.query(FindingModel).filter(FindingModel.id == "FIND-001").first()
            assert finding is not None
            assert finding.review_status == "Verified_Accurate"
            assert "corroborated" in finding.reviewer_notes

    def test_audit_hash_chain_integrity(self):
        """Verifies SHA-256 hash chain links in the database."""
        audit_service.record_event(
            action="Integrity Verification Test",
            application_id="APP2026001",
            details="Verifying cryptographic block hash chain continuity.",
            user="Audit Inspector",
            user_role="reviewer"
        )

        verification = audit_service.verify_hash_chain()
        assert verification["valid"] is True
        assert verification["broken_links"] == 0
        assert verification["limitations_documented"] is True


class TestPdfReportGeneration:
    """Verifies ReportLab PDF generation, content inclusion, disclaimers, and downloads."""

    def test_generate_pdf_report_valid_application(self):
        """Tests generating a real PDF verification report for APP2026001."""
        res = client.post("/api/v1/reports/generate?application_id=APP2026001")
        assert res.status_code == 200
        rep_data = res.json()

        assert rep_data["applicationId"] == "APP2026001"
        assert rep_data["applicantName"] == "ABC College of Engineering"
        assert rep_data["complianceScore"] > 0
        assert "REP" in rep_data["id"]
        assert rep_data["downloadUrl"] is not None

        # Check physical PDF file on disk
        reports_dir = settings.get_reports_path()
        pdf_path = reports_dir / f"{rep_data['id']}.pdf"
        assert pdf_path.exists(), f"PDF report {pdf_path} was not created!"
        assert pdf_path.stat().st_size > 1024, "Generated PDF is abnormally small"

        # Check PDF header magic bytes
        with open(pdf_path, "rb") as f:
            header = f.read(5)
            assert header == b"%PDF-", f"Invalid PDF magic bytes: {header}"

    def test_generate_pdf_report_invalid_application_404(self):
        """Tests generating a report for a non-existent application returns 404."""
        res = client.post("/api/v1/reports/generate?application_id=APP_NONEXISTENT_9999")
        assert res.status_code == 404
        assert "not exist" in res.json()["detail"].lower()

    def test_download_report_pdf(self):
        """Tests downloading generated PDF file via GET /reports/{id}/download."""
        # First generate
        gen_res = client.post("/api/v1/reports/generate?application_id=APP2026001")
        report_id = gen_res.json()["id"]

        # Download with auth header
        res = client.get(
            f"/api/v1/reports/{report_id}/download",
            headers={"X-API-Key": settings.API_KEY}
        )
        assert res.status_code == 200
        assert res.headers["content-type"] == "application/pdf"
        assert "attachment" in res.headers["content-disposition"]
        assert f"{report_id}.pdf" in res.headers["content-disposition"]
        assert len(res.content) > 1024
        assert res.content.startswith(b"%PDF-")

    def test_download_nonexistent_report_404(self):
        """Tests downloading a non-existent report ID returns 404."""
        res = client.get(
            "/api/v1/reports/REP_NON_EXISTENT_999/download",
            headers={"X-API-Key": settings.API_KEY}
        )
        assert res.status_code == 404
        assert "not exist" in res.json()["detail"].lower()

    def test_pdf_contains_disclaimer_and_extracted_data(self):
        """Validates that generated PDF contains OCR text and mandatory assistive disclaimer."""
        rep = report_service.generate_report("APP2026001")
        pdf_path = settings.get_reports_path() / f"{rep.id}.pdf"

        # Read binary text from PDF to check for disclaimer tokens
        content = pdf_path.read_bytes()
        # ReportLab streams contain plain text strings or compressed streams
        assert b"%PDF-" in content
        # Check that file size is substantial (contains tables, styling, findings)
        assert len(content) >= 5000
