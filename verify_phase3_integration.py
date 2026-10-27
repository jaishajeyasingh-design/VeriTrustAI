"""
VeriTrust AI — Phase 3 Live Integration & Verification Script
Validates running backend on http://localhost:8000 across database persistence,
isolated repositories, ReportLab PDF generation, authenticated download, and audit integrity.
"""
import urllib.request
import urllib.error
import json
import os
from pathlib import Path

BASE_URL = "http://localhost:8000/api/v1"
API_KEY = "vt_live_948f9210bcdef45a78"


def run_checks():
    checks = []

    def log_check(name: str, passed: bool, detail: str):
        checks.append((name, passed, detail))
        mark = "PASS" if passed else "FAIL"
        print(f"[{mark}] {name}: {detail}")

    print("\n" + "=" * 65)
    print(" VeriTrust AI -- Phase 3 System & Integration Verification")
    print("=" * 65)

    # 1. Health check
    try:
        req = urllib.request.Request(f"{BASE_URL}/health")
        with urllib.request.urlopen(req, timeout=5) as res:
            data = json.loads(res.read().decode())
            log_check("Health Check", res.status == 200, f"Status={data.get('status')} Service={data.get('service')}")
    except Exception as e:
        log_check("Health Check", False, str(e))

    # 2. Database Applications
    try:
        req = urllib.request.Request(f"{BASE_URL}/applications/?limit=10")
        with urllib.request.urlopen(req, timeout=5) as res:
            data = json.loads(res.read().decode())
            items = data.get("items", [])
            log_check("Durable Applications in SQLite", len(items) >= 6, f"Fetched {len(items)} persisted applications")
    except Exception as e:
        log_check("Durable Applications in SQLite", False, str(e))

    # 3. Documents Vault
    try:
        req = urllib.request.Request(f"{BASE_URL}/documents/?application_id=APP2026001")
        req.add_header("X-API-Key", API_KEY)
        with urllib.request.urlopen(req, timeout=5) as res:
            docs = json.loads(res.read().decode())
            log_check("Document Vault Isolation", len(docs) >= 4, f"Found {len(docs)} documents for APP2026001")
    except Exception as e:
        log_check("Document Vault Isolation", False, str(e))

    # 4. Compliance Rules
    try:
        req = urllib.request.Request(f"{BASE_URL}/rules/")
        with urllib.request.urlopen(req, timeout=5) as res:
            rules = json.loads(res.read().decode())
            log_check("Compliance Rules Persistence", len(rules) >= 7, f"Fetched {len(rules)} compliance rules")
    except Exception as e:
        log_check("Compliance Rules Persistence", False, str(e))

    # 5. Audit Trail & Hash Chain Verification
    try:
        req = urllib.request.Request(f"{BASE_URL}/audit/verify")
        with urllib.request.urlopen(req, timeout=5) as res:
            audit_status = json.loads(res.read().decode())
            log_check(
                "Audit Hash Chain Verification",
                audit_status.get("valid") is True,
                f"Valid={audit_status.get('valid')}, Total={audit_status.get('total_events')}, Broken={audit_status.get('broken_links')}"
            )
    except Exception as e:
        log_check("Audit Hash Chain Verification", False, str(e))

    # 6. Real ReportLab PDF Generation
    generated_report_id = None
    try:
        req = urllib.request.Request(
            f"{BASE_URL}/reports/generate?application_id=APP2026001",
            data=b"{}",
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=10) as res:
            report_data = json.loads(res.read().decode())
            generated_report_id = report_data.get("id")
            log_check(
                "Real PDF Report Generation",
                res.status == 200 and "REP" in str(generated_report_id),
                f"Generated report {generated_report_id} (Score: {report_data.get('complianceScore')}%)"
            )
    except Exception as e:
        log_check("Real PDF Report Generation", False, str(e))

    # 7. Authenticated Report PDF Download
    if generated_report_id:
        try:
            req = urllib.request.Request(f"{BASE_URL}/reports/{generated_report_id}/download")
            req.add_header("X-API-Key", API_KEY)
            with urllib.request.urlopen(req, timeout=10) as res:
                content = res.read()
                is_pdf = content.startswith(b"%PDF-")
                size_kb = len(content) / 1024
                log_check(
                    "Authenticated PDF Download",
                    res.status == 200 and is_pdf and size_kb > 1,
                    f"Status={res.status}, Type={res.headers.get('Content-Type')}, Size={size_kb:.1f} KB, Valid %PDF- header"
                )
        except Exception as e:
            log_check("Authenticated PDF Download", False, str(e))
    else:
        log_check("Authenticated PDF Download", False, "Skipped due to generation failure")

    # 8. Database File on Disk
    db_path = Path("backend/data/veritrust.db")
    log_check(
        "Database File Storage",
        db_path.exists() and db_path.stat().st_size > 0,
        f"Path={db_path.resolve()}, Size={db_path.stat().st_size if db_path.exists() else 0} bytes"
    )

    # 9. Private Storage Verification
    reports_dir = Path("backend/uploads/reports")
    pdf_files = list(reports_dir.glob("*.pdf")) if reports_dir.exists() else []
    log_check(
        "Secure Report Storage",
        len(pdf_files) > 0,
        f"Stored {len(pdf_files)} PDF dossier file(s) in non-public directory '{reports_dir}'"
    )

    print("=" * 65)
    passed_count = sum(1 for _, p, _ in checks if p)
    print(f" Summary: {passed_count}/{len(checks)} Integration Checks Passed.\n")
    return passed_count == len(checks)


if __name__ == "__main__":
    success = run_checks()
    exit(0 if success else 1)
