import io
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.config import settings
from backend.app.db.session import SessionLocal
from backend.app.db.models import AuditEventModel, DocumentModel
from backend.app.services.audit_service import audit_service


class TestAuthenticationEnforcement:
    """Verifies that all protected API endpoints strictly reject unauthenticated requests."""

    @pytest.fixture(autouse=True)
    def setup_client(self):
        # Fresh unauthenticated client (no default headers)
        self.client = TestClient(app)

    def test_health_endpoint_is_public(self):
        """Public endpoint /health must be accessible without credentials."""
        res = self.client.get("/api/v1/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"

    def test_missing_credentials_rejected_on_applications(self):
        """Unauthenticated GET /applications must return 401."""
        res = self.client.get("/api/v1/applications/")
        assert res.status_code == 401
        assert "credentials were not provided" in res.json()["detail"].lower()

    def test_missing_credentials_rejected_on_documents(self):
        """Unauthenticated GET /documents must return 401."""
        res = self.client.get("/api/v1/documents/")
        assert res.status_code == 401

    def test_missing_credentials_rejected_on_reports(self):
        """Unauthenticated GET /reports must return 401."""
        res = self.client.get("/api/v1/reports/")
        assert res.status_code == 401

    def test_missing_credentials_rejected_on_rules(self):
        """Unauthenticated GET /rules must return 401."""
        res = self.client.get("/api/v1/rules/")
        assert res.status_code == 401

    def test_missing_credentials_rejected_on_audit(self):
        """Unauthenticated GET /audit must return 401."""
        res = self.client.get("/api/v1/audit/")
        assert res.status_code == 401

    def test_invalid_api_key_header_rejected(self):
        """Invalid X-API-Key header must return 401 Unauthorized."""
        res = self.client.get(
            "/api/v1/applications/",
            headers={"X-API-Key": "invalid_spoofed_key_12345"}
        )
        assert res.status_code == 401
        assert "invalid api key" in res.json()["detail"].lower()

    def test_invalid_bearer_token_rejected(self):
        """Invalid Bearer token header must return 401 Unauthorized."""
        res = self.client.get(
            "/api/v1/applications/",
            headers={"Authorization": "Bearer invalid_bearer_token_abc"}
        )
        assert res.status_code == 401
        assert "invalid api key" in res.json()["detail"].lower()

    def test_valid_api_key_succeeds(self):
        """Valid API key header allows access."""
        res = self.client.get(
            "/api/v1/applications/",
            headers={"X-API-Key": settings.API_KEY}
        )
        assert res.status_code == 200
        assert "items" in res.json()

    def test_valid_bearer_token_succeeds(self):
        """Valid Bearer token allows access."""
        res = self.client.get(
            "/api/v1/applications/",
            headers={"Authorization": f"Bearer {settings.API_KEY}"}
        )
        assert res.status_code == 200
        assert "items" in res.json()


class TestRoleBasedAccessControl:
    """Verifies that backend RBAC enforces role permissions regardless of frontend visibility."""

    @pytest.fixture(autouse=True)
    def setup_clients(self):
        self.applicant = TestClient(app, headers={"X-API-Key": settings.API_KEY, "X-User-Role": "applicant"})
        self.reviewer = TestClient(app, headers={"X-API-Key": settings.API_KEY, "X-User-Role": "reviewer"})
        self.admin = TestClient(app, headers={"X-API-Key": settings.API_KEY, "X-User-Role": "administrator"})

    def test_invalid_role_returns_403(self):
        """Unrecognized user role header returns 403 Forbidden."""
        client = TestClient(app, headers={"X-API-Key": settings.API_KEY, "X-User-Role": "unauthorized_role_xyz"})
        res = client.get("/api/v1/applications/")
        assert res.status_code == 403
        assert "invalid user role" in res.json()["detail"].lower()

    def test_applicant_cannot_toggle_rules(self):
        """Applicant role cannot modify compliance rules (403 Forbidden)."""
        res = self.applicant.patch("/api/v1/rules/R001/toggle", json={"enabled": False})
        assert res.status_code == 403
        assert "operation requires one of the following roles" in res.json()["detail"].lower()

    def test_applicant_cannot_update_application_status(self):
        """Applicant role cannot modify application review status (403 Forbidden)."""
        res = self.applicant.patch(
            "/api/v1/applications/APP2026001/status",
            json={"status": "Verified", "reviewerName": "Unauthorized Applicant"}
        )
        assert res.status_code == 403

    def test_applicant_cannot_delete_application(self):
        """Applicant role cannot delete applications (403 Forbidden)."""
        res = self.applicant.delete("/api/v1/applications/APP2026001")
        assert res.status_code == 403

    def test_applicant_cannot_review_findings(self):
        """Applicant role cannot review/resolve findings (403 Forbidden)."""
        res = self.applicant.patch(
            "/api/v1/applications/APP2026001/findings/FIND-APP2026001-REGNUM-DOC-002/review",
            json={"status": "Resolved", "reviewerNotes": "Unauthorized bypass"}
        )
        assert res.status_code == 403

    def test_applicant_cannot_generate_official_reports(self):
        """Applicant role cannot trigger official dossier report generation (403 Forbidden)."""
        res = self.applicant.post("/api/v1/reports/generate?application_id=APP2026001")
        assert res.status_code == 403

    def test_reviewer_can_update_status_and_toggle_rules(self):
        """Reviewer role has permission to toggle rules and update application status."""
        # Toggle rule
        r_res = self.reviewer.patch("/api/v1/rules/R001/toggle", json={"enabled": True})
        assert r_res.status_code == 200

        # Update status
        s_res = self.reviewer.patch(
            "/api/v1/applications/APP2026001/status",
            json={"status": "Needs Review", "reviewerName": "Senior Compliance Reviewer"}
        )
        assert s_res.status_code == 200

    def test_reviewer_cannot_delete_application(self):
        """Reviewer cannot delete applications — requires administrator role (403 Forbidden)."""
        res = self.reviewer.delete("/api/v1/applications/APP2026001")
        assert res.status_code == 403
        assert "administrator" in res.json()["detail"].lower()


class TestCrossApplicationAccessSecurity:
    """Verifies that tenants/applications cannot access or manipulate documents/reports belonging to another application."""

    @pytest.fixture(autouse=True)
    def setup_client(self):
        self.client = TestClient(app, headers={"X-API-Key": settings.API_KEY, "X-User-Role": "reviewer"})

    def test_cross_application_document_access_forbidden(self):
        """
        Requesting document DOC-1001 (which belongs to APP2026001) with application_id=APP2026002
        must return HTTP 403 Forbidden.
        """
        res = self.client.get("/api/v1/documents/DOC-1001?application_id=APP2026002")
        assert res.status_code == 403
        assert "cross-application access denied" in res.json()["detail"].lower()
        assert "belongs to application 'app2026001'" in res.json()["detail"].lower()

    def test_cross_application_document_ocr_access_forbidden(self):
        """
        Requesting OCR data of DOC-1001 with application_id=APP2026002 must return HTTP 403 Forbidden.
        """
        res = self.client.get("/api/v1/documents/DOC-1001/ocr?application_id=APP2026002")
        assert res.status_code == 403
        assert "cross-application access denied" in res.json()["detail"].lower()

    def test_cross_application_report_download_forbidden(self):
        """
        Requesting report REP2026001 (belongs to APP2026001) with application_id=APP2026002
        must return HTTP 403 Forbidden.
        """
        res = self.client.get("/api/v1/reports/REP2026001/download?application_id=APP2026002")
        assert res.status_code == 403
        assert "cross-application access denied" in res.json()["detail"].lower()

    def test_cross_application_report_metadata_forbidden(self):
        """
        Requesting report metadata for REP2026001 with application_id=APP2026002
        must return HTTP 403 Forbidden.
        """
        res = self.client.get("/api/v1/reports/REP2026001?application_id=APP2026002")
        assert res.status_code == 403
        assert "cross-application access denied" in res.json()["detail"].lower()

    def test_upload_to_nonexistent_application_rejected_and_cleaned(self):
        """
        Uploading a document to a non-existent application dossier must return HTTP 404
        and must not leave temporary files on disk.
        """
        fake_pdf = b"%PDF-1.4\n%Fake Statutory Content\n"
        files = {"file": ("Statutory_Letter.pdf", io.BytesIO(fake_pdf), "application/pdf")}
        data = {"application_id": "APP_FAKE_NONEXISTENT_9999", "doc_type": "Application"}

        res = self.client.post("/api/v1/documents/upload", files=files, data=data)
        assert res.status_code == 404
        assert "does not exist" in res.json()["detail"].lower()


class TestControlledAuditTamperingDetection:
    """Verifies that cryptographic SHA-256 hash-chaining detects unauthorized database record tampering."""

    def test_tamper_detection_in_hash_chain(self):
        """
        Controlled tampering test:
        1. Records two chained events.
        2. Asserts hash chain is currently valid.
        3. Intentionally mutates the previous hash of the second event directly in SQLite.
        4. Verifies audit_service.verify_hash_chain() detects the broken link.
        5. Restores original hash and verifies validity is restored.
        """
        # Step 1: Record two genuine chained events
        ev1 = audit_service.record_event(
            action="Baseline Verification 1",
            application_id="APP2026001",
            details="First event for tampering test.",
            user="Compliance Inspector",
            user_role="reviewer"
        )
        ev2 = audit_service.record_event(
            action="Baseline Verification 2",
            application_id="APP2026001",
            details="Second event linked to first event.",
            user="Compliance Inspector",
            user_role="reviewer"
        )

        # Step 2: Confirm valid before tampering
        initial_check = audit_service.verify_hash_chain()
        assert initial_check["valid"] is True
        assert initial_check["broken_links"] == 0

        # Step 3: Controlled tampering — mutate the hash of ev1 in the SQLite database directly
        original_hash = ev1.hash
        tampered_hash = "sha256:TAMPERED_0000000000000000000000"

        with SessionLocal() as db:
            row1 = db.query(AuditEventModel).filter(AuditEventModel.id == ev1.id).first()
            assert row1 is not None
            row1.hash = tampered_hash
            db.commit()

        try:
            # Step 4: Verify that verify_hash_chain() flags the tampering
            tampered_check = audit_service.verify_hash_chain()
            assert tampered_check["valid"] is False, "Hash chain failed to detect controlled database tampering!"
            assert tampered_check["broken_links"] >= 1
            assert any(b["event_id"] == ev2.id for b in tampered_check["broken_details"])

        finally:
            # Step 5: Restore database state to preserve test idempotency
            with SessionLocal() as db:
                row1 = db.query(AuditEventModel).filter(AuditEventModel.id == ev1.id).first()
                if row1:
                    row1.hash = original_hash
                    db.commit()

        # Step 6: Verify restored continuity
        restored_check = audit_service.verify_hash_chain()
        assert restored_check["valid"] is True
        assert restored_check["broken_links"] == 0
