import io
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw
import pymupdf

from backend.app.main import app
from backend.app.core.config import settings

client = TestClient(app, headers={"X-API-Key": settings.API_KEY, "X-User-Role": "administrator"})


def create_sample_pdf(text: str = "ALL INDIA COUNCIL FOR TECHNICAL EDUCATION\nREGISTRATION NUMBER: REG1324\nNAME OF INSTITUTION: ABC College of Engineering\nDATE: 20-10-2026") -> bytes:
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 72), text, fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def create_sample_png(text: str = "REG1029") -> bytes:
    img = Image.new("RGB", (400, 100), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((20, 35), text, fill=(0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def create_sample_jpg() -> bytes:
    img = Image.new("RGB", (300, 100), color=(240, 240, 240))
    draw = ImageDraw.Draw(img)
    draw.text((20, 35), "AICTE APPROVAL NOC", fill=(0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


class TestDocumentUploadAndOCR:
    def test_upload_valid_pdf_with_pymupdf_extraction(self):
        """Tests uploading a text-based statutory PDF and direct PyMuPDF text extraction."""
        pdf_bytes = create_sample_pdf()
        files = {
            "file": ("AICTE_Approval_Letter.pdf", io.BytesIO(pdf_bytes), "application/pdf")
        }
        data = {
            "application_id": "APP2026001",
            "doc_type": "Approval"
        }
        response = client.post("/api/v1/documents/upload", files=files, data=data)
        assert response.status_code == 201
        res_json = response.json()
        assert res_json["name"] == "AICTE_Approval_Letter.pdf"
        assert res_json["fileFormat"] == "PDF"
        assert res_json["status"] == "Processed"
        assert res_json["extractionMethod"] == "pymupdf_direct"
        assert res_json["pageCount"] >= 1
        assert "Registration Number" in res_json["extractedFields"]
        assert res_json["extractedFields"]["Registration Number"] == "REG1324"

        # Verify OCR endpoint returns detailed verbatim text and normalized fields
        doc_id = res_json["id"]
        ocr_resp = client.get(f"/api/v1/documents/{doc_id}/ocr")
        assert ocr_resp.status_code == 200
        ocr_data = ocr_resp.json()
        assert ocr_data["text_extracted"] is True
        assert "ALL INDIA COUNCIL" in ocr_data["raw_text"]
        assert ocr_data["normalized_fields"]["Registration Number"] == "REG1324"
        assert "disclaimer" in ocr_data

    def test_upload_valid_png_with_ocr(self):
        """Tests uploading a statutory credential PNG image and OCR processing."""
        png_bytes = create_sample_png("REG1029")
        files = {
            "file": ("Registration_Certificate.png", io.BytesIO(png_bytes), "image/png")
        }
        data = {
            "application_id": "APP2026001",
            "doc_type": "Certificate"
        }
        response = client.post("/api/v1/documents/upload", files=files, data=data)
        assert response.status_code == 201
        res_json = response.json()
        assert res_json["fileFormat"] == "PNG"
        assert res_json["extractionMethod"] in ["tesseract_ocr", "none"]
        assert res_json["pageCount"] == 1

        # Check OCR endpoint
        doc_id = res_json["id"]
        ocr_resp = client.get(f"/api/v1/documents/{doc_id}/ocr")
        assert ocr_resp.status_code == 200

    def test_upload_valid_jpeg(self):
        """Tests uploading a JPEG file with valid SOI magic header."""
        jpg_bytes = create_sample_jpg()
        files = {
            "file": ("Fire_Safety_NOC.jpg", io.BytesIO(jpg_bytes), "image/jpeg")
        }
        data = {
            "application_id": "APP2026001",
            "doc_type": "NOC"
        }
        response = client.post("/api/v1/documents/upload", files=files, data=data)
        assert response.status_code == 201
        res_json = response.json()
        assert res_json["fileFormat"] == "JPG"

    def test_reject_invalid_file_extension(self):
        """Tests that disallowed extensions (.txt, .exe, .sh) are rejected."""
        files = {
            "file": ("malicious_payload.exe", io.BytesIO(b"MZ\x90\x00"), "application/octet-stream")
        }
        data = {"application_id": "APP2026001", "doc_type": "Application"}
        response = client.post("/api/v1/documents/upload", files=files, data=data)
        assert response.status_code == 400
        assert "Unsupported file extension" in response.json()["detail"]

    def test_reject_empty_document(self):
        """Tests that empty 0-byte uploads are rejected with 400 Bad Request."""
        files = {
            "file": ("empty_affidavit.pdf", io.BytesIO(b""), "application/pdf")
        }
        data = {"application_id": "APP2026001", "doc_type": "Affidavit"}
        response = client.post("/api/v1/documents/upload", files=files, data=data)
        assert response.status_code == 400
        assert "empty (0 bytes)" in response.json()["detail"]

    def test_reject_spoofed_file_signature(self):
        """Tests that a file named .pdf containing arbitrary text is rejected via magic byte checks."""
        files = {
            "file": ("fake_approval.pdf", io.BytesIO(b"THIS IS NOT A VALID PDF HEADER"), "application/pdf")
        }
        data = {"application_id": "APP2026001", "doc_type": "Approval"}
        response = client.post("/api/v1/documents/upload", files=files, data=data)
        assert response.status_code == 400
        assert "Missing standard %PDF- header signature" in response.json()["detail"]

    def test_reject_oversized_upload(self, monkeypatch):
        """Tests that files exceeding MAX_UPLOAD_SIZE_BYTES are rejected with 413 Payload Too Large."""
        # Temporarily restrict max upload size to 100 KB for test
        monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_BYTES", 100 * 1024)
        big_bytes = b"%PDF-" + b"0" * (120 * 1024)
        files = {
            "file": ("oversized_file.pdf", io.BytesIO(big_bytes), "application/pdf")
        }
        data = {"application_id": "APP2026001", "doc_type": "Application"}
        response = client.post("/api/v1/documents/upload", files=files, data=data)
        assert response.status_code == 413
        assert "exceeds maximum allowed limit" in response.json()["detail"]

    def test_get_document_by_id(self):
        """Tests retrieving a document by ID."""
        response = client.get("/api/v1/documents/DOC-1001")
        assert response.status_code == 200
        assert response.json()["id"] == "DOC-1001"

    def test_get_nonexistent_ocr(self):
        """Tests that non-existent document ID returns 404."""
        response = client.get("/api/v1/documents/DOC-999999/ocr")
        assert response.status_code == 404

    def test_scanned_pdf_routes_to_ocr(self):
        """Tests that a PDF containing only scanned images (no digital text) routes to hybrid OCR."""
        img = Image.new("RGB", (500, 120), color=(255, 255, 255))
        draw = ImageDraw.Draw(img)
        draw.text((30, 40), "AICTE SCANNED CLEARANCE REG1029", fill=(0, 0, 0))
        img_buf = io.BytesIO()
        img.save(img_buf, format="PNG")

        doc = pymupdf.open()
        page = doc.new_page(width=500, height=120)
        page.insert_image(pymupdf.Rect(0, 0, 500, 120), stream=img_buf.getvalue())
        scanned_pdf_bytes = doc.tobytes()
        doc.close()

        files = {
            "file": ("Scanned_Clearance.pdf", io.BytesIO(scanned_pdf_bytes), "application/pdf")
        }
        data = {
            "application_id": "APP2026001",
            "doc_type": "NOC"
        }
        response = client.post("/api/v1/documents/upload", files=files, data=data)
        assert response.status_code == 201
        res_json = response.json()
        assert res_json["fileFormat"] == "PDF"
        assert res_json["extractionMethod"] in ["pymupdf_ocr_hybrid", "none"]

