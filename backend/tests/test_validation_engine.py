import io
import pytest
from fastapi.testclient import TestClient
import pymupdf

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.services.rule_service import rule_service
from backend.app.services.document_service import document_service
from backend.app.services.application_service import application_service
from backend.app.services.audit_service import audit_service

client = TestClient(app, headers={"X-API-Key": settings.API_KEY, "X-User-Role": "administrator"})


def create_pdf(text: str) -> bytes:
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 72), text, fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


@pytest.fixture(autouse=True)
def reset_rules():
    """Ensure all default rules are enabled before each test."""
    for r in rule_service.list_rules():
        if r.id == "R006":
            rule_service.toggle_rule(r.id, False)
        else:
            rule_service.toggle_rule(r.id, True)
    yield


class TestCrossDocumentValidationEngine:
    def test_registration_number_mismatch_detection(self):
        """
        Tests that when an Application Form has REG1324 and Registration Certificate
        has REG1029, a High severity Mismatch finding is generated with side-by-side evidence.
        """
        # Create a new test application
        app_resp = client.post("/api/v1/applications/", json={
            "id": "APP_TEST_MISMATCH",
            "title": "Registration Divergence Dossier",
            "applicantName": "ABC College of Engineering",
            "referenceNo": "AICTE/TEST/2026/01",
            "category": "Institutional Approval"
        })
        assert app_resp.status_code == 201

        # Upload Application Form with REG1324
        pdf_form = create_pdf("APPLICATION FORM\nREGISTRATION NUMBER: REG1324\nNAME OF INSTITUTION: ABC College of Engineering")
        res1 = client.post("/api/v1/documents/upload", files={
            "file": ("App_Form.pdf", io.BytesIO(pdf_form), "application/pdf")
        }, data={"application_id": "APP_TEST_MISMATCH", "doc_type": "Application"})
        assert res1.status_code == 201

        # Upload Certificate with REG1029
        pdf_cert = create_pdf("CERTIFICATE OF REGISTRATION\nREGISTRATION NUMBER: REG1029\nNAME OF INSTITUTION: ABC College of Engineering")
        res2 = client.post("/api/v1/documents/upload", files={
            "file": ("Reg_Cert.pdf", io.BytesIO(pdf_cert), "application/pdf")
        }, data={"application_id": "APP_TEST_MISMATCH", "doc_type": "Certificate"})
        assert res2.status_code == 201

        # Run validation
        val_resp = client.post("/api/v1/applications/APP_TEST_MISMATCH/validate")
        assert val_resp.status_code == 200
        summary = val_resp.json()

        assert summary["status"] == "Needs Review"
        assert summary["compliance_score"] < 100

        # Check for Registration Number Mismatch finding
        reg_findings = [f for f in summary["findings"] if f["category"] == "Mismatch" and "Registration Number" in f["title"]]
        assert len(reg_findings) == 1
        finding = reg_findings[0]
        assert finding["severity"] == "High"
        assert finding["valueA"] == "REG1324"
        assert finding["valueB"] == "REG1029"
        assert "App_Form.pdf" in finding["sourceDoc"]
        assert "Reg_Cert.pdf" in finding["comparedDoc"]
        assert "mismatch" in finding["comparisonResult"].lower()

    def test_matching_documents_no_mismatches(self):
        """
        Tests that when documents contain identical registration numbers and institution names,
        no mismatch findings are flagged.
        """
        app_resp = client.post("/api/v1/applications/", json={
            "id": "APP_TEST_MATCHING",
            "title": "Consistent Dossier",
            "applicantName": "Apex Institute of Science",
            "referenceNo": "AICTE/TEST/2026/02",
            "category": "Institutional Approval"
        })
        assert app_resp.status_code == 201

        # Upload Application Form with REG8888
        pdf_form = create_pdf("APPLICATION FORM\nREGISTRATION NUMBER: REG8888\nNAME OF INSTITUTION: Apex Institute of Science")
        client.post("/api/v1/documents/upload", files={
            "file": ("Form.pdf", io.BytesIO(pdf_form), "application/pdf")
        }, data={"application_id": "APP_TEST_MATCHING", "doc_type": "Application"})

        # Upload Certificate with REG8888
        pdf_cert = create_pdf("REGISTRATION CERTIFICATE\nREGISTRATION NUMBER: REG8888\nNAME OF INSTITUTION: Apex Institute of Science")
        client.post("/api/v1/documents/upload", files={
            "file": ("Certificate.pdf", io.BytesIO(pdf_cert), "application/pdf")
        }, data={"application_id": "APP_TEST_MATCHING", "doc_type": "Certificate"})

        # Upload Affidavit
        pdf_aff = create_pdf("AFFIDAVIT\nREGISTRATION NUMBER: REG8888\nNAME OF INSTITUTION: Apex Institute of Science")
        client.post("/api/v1/documents/upload", files={
            "file": ("Affidavit.pdf", io.BytesIO(pdf_aff), "application/pdf")
        }, data={"application_id": "APP_TEST_MATCHING", "doc_type": "Affidavit"})

        val_resp = client.post("/api/v1/applications/APP_TEST_MATCHING/validate")
        assert val_resp.status_code == 200
        summary = val_resp.json()

        mismatch_findings = [f for f in summary["findings"] if f["category"] == "Mismatch"]
        assert len(mismatch_findings) == 0
        assert summary["compliance_score"] == 100

    def test_missing_mandatory_document_rule(self):
        """
        Tests that Rule R001 flags missing required documents (e.g., Affidavit missing).
        """
        app_resp = client.post("/api/v1/applications/", json={
            "id": "APP_TEST_MISSING_DOC",
            "title": "Incomplete Dossier",
            "applicantName": "Metropolitan College",
            "referenceNo": "AICTE/TEST/2026/03",
            "category": "Institutional Approval"
        })
        assert app_resp.status_code == 201

        # Only upload Application Form (missing Certificate and Affidavit)
        pdf_form = create_pdf("APPLICATION FORM\nREGISTRATION NUMBER: REG5001\nNAME OF INSTITUTION: Metropolitan College")
        client.post("/api/v1/documents/upload", files={
            "file": ("App_Form.pdf", io.BytesIO(pdf_form), "application/pdf")
        }, data={"application_id": "APP_TEST_MISSING_DOC", "doc_type": "Application"})

        val_resp = client.post("/api/v1/applications/APP_TEST_MISSING_DOC/validate")
        assert val_resp.status_code == 200
        summary = val_resp.json()

        missing_findings = [f for f in summary["findings"] if f["category"] == "Missing Document"]
        assert len(missing_findings) >= 1
        assert any("Affidavit" in f["title"] for f in missing_findings)
        assert any("Certificate" in f["title"] for f in missing_findings)

    def test_disabled_rule_does_not_execute(self):
        """
        Tests that when a rule is toggled off (e.g. R001 disabled), its checks do NOT run.
        """
        # Toggle off R001 (Missing Document Rule)
        toggle_res = client.patch("/api/v1/rules/R001/toggle", json={"enabled": False})
        assert toggle_res.status_code == 200
        assert toggle_res.json()["enabled"] is False

        app_resp = client.post("/api/v1/applications/", json={
            "id": "APP_TEST_DISABLED_RULE",
            "title": "Testing Disabled Rule",
            "applicantName": "Valley Institute",
            "referenceNo": "AICTE/TEST/2026/04",
            "category": "Institutional Approval"
        })
        assert app_resp.status_code == 201

        # Only upload Form
        pdf_form = create_pdf("APPLICATION FORM\nREGISTRATION NUMBER: REG6001\nNAME OF INSTITUTION: Valley Institute")
        client.post("/api/v1/documents/upload", files={
            "file": ("App_Form.pdf", io.BytesIO(pdf_form), "application/pdf")
        }, data={"application_id": "APP_TEST_DISABLED_RULE", "doc_type": "Application"})

        val_resp = client.post("/api/v1/applications/APP_TEST_DISABLED_RULE/validate")
        assert val_resp.status_code == 200
        summary = val_resp.json()

        # R001 should NOT have triggered
        r001_findings = [f for f in summary["findings"] if f["ruleId"] == "R001"]
        assert len(r001_findings) == 0

    def test_document_isolation_between_applications(self):
        """
        Tests that documents belonging to Application A are not evaluated in Application B.
        """
        # App A has doc with REG1111
        client.post("/api/v1/applications/", json={"id": "APP_AAA", "title": "App AAA", "applicantName": "AAA College", "referenceNo": "REF/A"})
        pdf_a = create_pdf("APPLICATION FORM\nREGISTRATION NUMBER: REG1111\nNAME OF INSTITUTION: AAA College")
        client.post("/api/v1/documents/upload", files={"file": ("DocA.pdf", io.BytesIO(pdf_a), "application/pdf")}, data={"application_id": "APP_AAA", "doc_type": "Application"})

        # App B has doc with REG2222
        client.post("/api/v1/applications/", json={"id": "APP_BBB", "title": "App BBB", "applicantName": "BBB College", "referenceNo": "REF/B"})
        pdf_b = create_pdf("APPLICATION FORM\nREGISTRATION NUMBER: REG2222\nNAME OF INSTITUTION: BBB College")
        client.post("/api/v1/documents/upload", files={"file": ("DocB.pdf", io.BytesIO(pdf_b), "application/pdf")}, data={"application_id": "APP_BBB", "doc_type": "Application"})

        # Validate App A
        summary_a = client.post("/api/v1/applications/APP_AAA/validate").json()
        assert summary_a["documents_analyzed"] == 1
        # No mismatch against App B's REG2222
        mismatches = [f for f in summary_a["findings"] if f["category"] == "Mismatch"]
        assert len(mismatches) == 0

    def test_repeated_validation_without_duplicate_findings(self):
        """
        Tests that running validation multiple times produces deterministic findings
        without accumulating duplicate records.
        """
        # Re-run validation on APP_TEST_MISMATCH twice
        res1 = client.post("/api/v1/applications/APP_TEST_MISMATCH/validate").json()
        count1 = len(res1["findings"])

        res2 = client.post("/api/v1/applications/APP_TEST_MISMATCH/validate").json()
        count2 = len(res2["findings"])

        assert count1 == count2, "Repeated validation must not produce duplicate findings"

    def test_reviewer_marks_finding_reviewed(self):
        """
        Tests that a compliance reviewer can update finding status and record review notes.
        """
        # Get findings for APP_TEST_MISMATCH
        findings_resp = client.get("/api/v1/applications/APP_TEST_MISMATCH/findings")
        assert findings_resp.status_code == 200
        findings = findings_resp.json()
        assert len(findings) >= 1
        target_finding = findings[0]

        # Reviewer acknowledges finding
        patch_resp = client.patch(
            f"/api/v1/applications/APP_TEST_MISMATCH/findings/{target_finding['id']}/review",
            json={
                "reviewStatus": "Reviewed",
                "reviewerNotes": "Discrepancy verified against Gazette records. Typographical error approved.",
                "reviewerName": "Senior Compliance Officer"
            }
        )
        assert patch_resp.status_code == 200
        updated = patch_resp.json()
        assert updated["reviewStatus"] == "Reviewed"
        assert "Discrepancy verified" in updated["reviewerNotes"]
        assert updated["reviewedBy"] == "Senior Compliance Officer"

    def test_validation_creates_audit_event(self):
        """
        Tests that running validation automatically creates an immutable audit trail entry.
        """
        audit_res = client.get("/api/v1/audit/?application_id=APP_TEST_MISMATCH")
        assert audit_res.status_code == 200
        events = audit_res.json()
        val_events = [e for e in events if "Validation" in e["action"]]
        assert len(val_events) >= 1
        assert "sha256:" in val_events[0]["hash"]

    def test_invalid_application_returns_404(self):
        """
        Tests that validating a non-existent application returns HTTP 404.
        """
        resp = client.post("/api/v1/applications/APP_DOES_NOT_EXIST/validate")
        assert resp.status_code == 404
