import httpx
import json

BASE_URL = "http://localhost:8000/api/v1"

def run_tests():
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:
        print("=== 1. TEST HEALTH ENDPOINT ===")
        res_health = client.get("/health")
        assert res_health.status_code == 200, f"Expected 200, got {res_health.status_code}"
        health_data = res_health.json()
        print(f"Status: {health_data['status']}")
        print(f"Service: {health_data['service']}")
        print(f"Demo Mode: {health_data['demo_mode']}")
        print("Subsystems:", json.dumps(health_data["subsystems"], indent=2))
        print(" Health check passed.\n")

        print("=== 2. TEST APPLICATION LIST ===")
        res_apps = client.get("/applications/")
        assert res_apps.status_code == 200, f"Expected 200, got {res_apps.status_code}"
        apps_data = res_apps.json()
        total_initial = apps_data["total"]
        print(f"Initial total applications from FastAPI: {total_initial}")
        for app in apps_data["items"][:3]:
            print(f" - [{app['id']}] {app['applicantName']} | Status: {app['status']} | Ref: {app['referenceNo']}")
        print(" Application list endpoint passed.\n")

        print("=== 3. CREATE APPLICATION ===")
        new_app_payload = {
            "title": "Autonomous University Accreditation Verification",
            "applicantName": "Indian Institute of Science & Technology, Bangalore",
            "type": "Institutional",
            "category": "Institutional Approval",
            "referenceNo": "AICTE/BANG/2026/9021",
            "contactEmail": "registrar@iist.ac.in",
            "contactPhone": "+91 80 9988 7766",
            "priority": "High",
            "riskLevel": "Medium"
        }
        res_create = client.post("/applications/", json=new_app_payload)
        assert res_create.status_code == 201, f"Expected 201, got {res_create.status_code}"
        created_app = res_create.json()
        created_id = created_app["id"]
        print(f"Created application: {created_id} - {created_app['applicantName']}")
        
        # Verify it now appears in the application list
        res_apps_after = client.get("/applications/")
        apps_after = res_apps_after.json()
        assert apps_after["total"] == total_initial + 1, "Total should have incremented"
        found = any(a["id"] == created_id for a in apps_after["items"])
        assert found, f"Created application {created_id} must appear in list"
        print(f"Verified: Application {created_id} is present in live application list (Total: {apps_after['total']}).\n")

        print("=== 4. UPDATE APPLICATION STATUS (REVIEWER ACTION) ===")
        # Update status of created_app to "Verified"
        status_payload = {
            "status": "Verified",
            "reviewerName": "Senior Compliance Officer",
            "notes": "Physical campus survey and statutory endowment verified."
        }
        res_patch = client.patch(f"/applications/{created_id}/status", json=status_payload)
        assert res_patch.status_code == 200, f"Expected 200, got {res_patch.status_code}"
        updated_app = res_patch.json()
        assert updated_app["status"] == "Verified", "Status should be Verified"
        print(f"Updated status for {created_id}: {updated_app['status']}")
        print(f"Latest timeline step: {updated_app['timeline'][-1]['step']} - {updated_app['timeline'][-1]['details']}")
        
        # Verify persistence on live server by fetching single application
        res_get_single = client.get(f"/applications/{created_id}")
        assert res_get_single.status_code == 200
        single_app = res_get_single.json()
        assert single_app["status"] == "Verified", "Status update must persist on backend"
        print("Verified: Review status persisted on running backend.\n")

        print("=== 5. VERIFY AUDIT TRAIL RECORDING ===")
        # Post audit event for reviewer action
        audit_payload = {
            "user": "Compliance Reviewer",
            "userRole": "reviewer",
            "action": "Status Changed: Verified",
            "applicationId": created_id,
            "details": "Application granted statutory clearance by Compliance Reviewer."
        }
        res_audit_post = client.post("/audit/", json=audit_payload)
        assert res_audit_post.status_code == 200, f"Expected 200, got {res_audit_post.status_code}"
        created_event = res_audit_post.json()
        print(f"Logged audit event: {created_event['id']} - Action: {created_event['action']}")
        print(f"Tamper-proof cryptographic hash: {created_event['hash']}")

        # Verify audit trail contains the event
        res_audit_list = client.get(f"/audit/?application_id={created_id}")
        assert res_audit_list.status_code == 200
        audit_items = res_audit_list.json()
        assert len(audit_items) >= 1
        print(f"Verified: Audit trail returned {len(audit_items)} event(s) for {created_id}.\n")

        print("=== 6. REAL DOCUMENT UPLOAD & OCR EXTRACTION ===")
        import pymupdf
        import io
        doc = pymupdf.open()
        page = doc.new_page()
        page.insert_text(
            (50, 72),
            "ALL INDIA COUNCIL FOR TECHNICAL EDUCATION\n"
            "REGISTRATION NUMBER: REG1324\n"
            "NAME OF INSTITUTION: Indian Institute of Science & Technology\n"
            "DATE: 20-10-2026\n"
            "STATUTORY APPROVAL ORDER 2026-2027",
            fontsize=12
        )
        pdf_bytes = doc.tobytes()
        doc.close()

        upload_files = {
            "file": ("Statutory_Approval_Letter.pdf", io.BytesIO(pdf_bytes), "application/pdf")
        }
        upload_data = {
            "application_id": created_id,
            "doc_type": "Approval"
        }
        res_upload = client.post("/documents/upload", files=upload_files, data=upload_data)
        assert res_upload.status_code == 201, f"Expected 201, got {res_upload.status_code}: {res_upload.text}"
        uploaded_doc = res_upload.json()
        doc_id = uploaded_doc["id"]
        print(f"Uploaded document ID: {doc_id} - File: {uploaded_doc['name']}")
        print(f"Format: {uploaded_doc['fileFormat']} | Method: {uploaded_doc['extractionMethod']} | Pages: {uploaded_doc['pageCount']}")
        print("Normalized Extracted Fields:", json.dumps(uploaded_doc["extractedFields"], indent=2))
        assert uploaded_doc["status"] == "Processed"
        assert uploaded_doc["extractionMethod"] == "pymupdf_direct"
        assert uploaded_doc["extractedFields"].get("Registration Number") == "REG1324"

        # Verify OCR endpoint
        res_ocr = client.get(f"/documents/{doc_id}/ocr")
        assert res_ocr.status_code == 200, f"Expected 200, got {res_ocr.status_code}"
        ocr_details = res_ocr.json()
        assert ocr_details["text_extracted"] is True
        assert "ALL INDIA COUNCIL" in ocr_details["raw_text"]
        print(f"OCR Endpoint Verified: Extracted {len(ocr_details['raw_text'])} characters of raw verbatim text.")
        print(f"Disclaimer: {ocr_details['disclaimer']}\n")

        print("=== 7. CROSS-DOCUMENT VALIDATION ENGINE (PHASE 2) ===")
        # Upload a second document with conflicting registration number (REG1029)
        doc2 = pymupdf.open()
        page2 = doc2.new_page()
        page2.insert_text(
            (50, 72),
            "REGISTRATION CERTIFICATE\n"
            "REGISTRATION NUMBER: REG1029\n"
            "NAME OF INSTITUTION: Indian Institute of Science & Technology\n"
            "DATE: 15-05-2022",
            fontsize=12
        )
        pdf2_bytes = doc2.tobytes()
        doc2.close()

        res_upload2 = client.post(
            "/documents/upload",
            files={"file": ("State_Registration_Cert.pdf", io.BytesIO(pdf2_bytes), "application/pdf")},
            data={"application_id": created_id, "doc_type": "Certificate"}
        )
        assert res_upload2.status_code == 201

        # Run validation on the application
        res_val = client.post(f"/applications/{created_id}/validate")
        assert res_val.status_code == 200, f"Expected 200, got {res_val.status_code}: {res_val.text}"
        val_summary = res_val.json()
        print(f"Validation executed for: {created_id}")
        print(f"Analyzed Documents: {val_summary['documents_analyzed']}")
        print(f"Compliance Score: {val_summary['compliance_score']}% (Status: {val_summary['status']})")
        print(f"Evaluated Rules: {val_summary['rules_evaluated']} | Triggered: {val_summary['rules_triggered']}")
        
        # Verify findings contain Registration Number Mismatch
        mismatch_findings = [f for f in val_summary["findings"] if f["category"] == "Mismatch" and "Registration Number" in f["title"]]
        assert len(mismatch_findings) == 1, "Must generate exactly 1 registration mismatch finding"
        mismatch_finding = mismatch_findings[0]
        finding_id = mismatch_finding["id"]
        print(f"Finding Flagged: [{finding_id}] {mismatch_finding['title']} ({mismatch_finding['severity']})")
        print(f"Source: {mismatch_finding['valueA']} ({mismatch_finding['sourceDoc']}) vs Compared: {mismatch_finding['valueB']} ({mismatch_finding['comparedDoc']})")
        print(f"Comparison Result: {mismatch_finding['comparisonResult']}\n")

        print("=== 8. GET FINDINGS & VALIDATION SUMMARY ENDPOINTS ===")
        res_findings = client.get(f"/applications/{created_id}/findings")
        assert res_findings.status_code == 200
        findings_list = res_findings.json()
        assert len(findings_list) == len(val_summary["findings"])
        print(f"Verified GET /findings: Retrieved {len(findings_list)} finding(s).")

        res_summary_get = client.get(f"/applications/{created_id}/validation-summary")
        assert res_summary_get.status_code == 200
        assert res_summary_get.json()["compliance_score"] == val_summary["compliance_score"]
        print("Verified GET /validation-summary: Returned concordant compliance metrics.\n")

        print("=== 9. REVIEWER UPDATES FINDING REVIEW DECISION ===")
        review_update_payload = {
          "reviewStatus": "Verified_Accurate",
          "reviewerNotes": "Confirmed discrepancy between State Registry Certificate and AICTE Central Portal record.",
          "reviewerName": "Lead Auditor Sharma"
        }
        res_review = client.patch(f"/applications/{created_id}/findings/{finding_id}/review", json=review_update_payload)
        assert res_review.status_code == 200, f"Expected 200, got {res_review.status_code}: {res_review.text}"
        updated_finding = res_review.json()
        assert updated_finding["reviewStatus"] == "Verified_Accurate"
        assert updated_finding["reviewedBy"] == "Lead Auditor Sharma"
        assert "State Registry" in updated_finding["reviewerNotes"]
        print(f"Finding {finding_id} review updated to: {updated_finding['reviewStatus']}")
        print(f"Reviewed by: {updated_finding['reviewedBy']} at {updated_finding['reviewedAt']}")
        print(f"Notes: {updated_finding['reviewerNotes']}\n")

        print("=== ALL 9 INTEGRATION VERIFICATION CHECKS PASSED (PHASE 1 + PHASE 2)! ===")

if __name__ == "__main__":
    run_tests()

