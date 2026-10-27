import os
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Body, status, Depends
from fastapi.responses import FileResponse

from backend.app.schemas.report import VerificationReport
from backend.app.services.report_service import report_service
from backend.app.core.security import verify_api_key

router = APIRouter()

SEED_REPORTS: List[VerificationReport] = [
    VerificationReport(
        id="REP2026001",
        applicationId="APP2026001",
        applicantName="ABC College of Engineering",
        generatedDate="28-Oct-26",
        findingsCount=3,
        complianceScore=74,
        status="Needs Review",
        summary="Cross-document OCR detected registration number divergence between Form (REG1324) and Certificate (REG1029). NOC requires renewal within 14 days.",
        verifiedBy="VeriTrust AI Compliance Engine v3.2",
        downloadUrl="/api/v1/reports/REP2026001/download"
    ),
    VerificationReport(
        id="REP2026002",
        applicationId="APP2026002",
        applicantName="XYZ Institute of Technology",
        generatedDate="27-Oct-26",
        findingsCount=1,
        complianceScore=98,
        status="Verified",
        summary="All credentials, digital signatures, land encumbrance certificates and state board resolutions match statutory norms.",
        verifiedBy="VeriTrust AI Compliance Engine v3.2",
        downloadUrl="/api/v1/reports/REP2026002/download"
    )
]

from backend.app.core.security import verify_api_key, require_role


@router.get("/", response_model=List[VerificationReport], summary="[Implemented] List verification reports")
async def list_reports(_: str = Depends(verify_api_key)) -> List[VerificationReport]:
    """
    Returns generated compliance audit reports from the database.
    Protected: Requires valid API Key or Bearer token.
    """
    return report_service.list_reports()


@router.get("/{report_id}", response_model=VerificationReport, summary="[Implemented] Get report details")
async def get_report(
    report_id: str,
    application_id: Optional[str] = Query(None, description="Optional application ID boundary check"),
    _: str = Depends(verify_api_key)
) -> VerificationReport:
    """
    Retrieves metadata and summary for a single compliance report.
    Protected: Requires valid API Key or Bearer token.
    Enforces cross-application authorization when application_id is specified.
    """
    rep = report_service.get_report(report_id)
    if not rep:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report '{report_id}' was not found."
        )

    if application_id and rep.applicationId.lower() != application_id.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cross-application access denied: Report '{report_id}' belongs to application '{rep.applicationId}', not '{application_id}'."
        )

    return rep


@router.post("/generate", response_model=VerificationReport, summary="[Implemented] Generate real PDF compliance report")
async def generate_report(
    application_id: Optional[str] = Query(None, description="Application identifier (e.g. APP2026001)"),
    payload: Optional[dict] = Body(None),
    _role: str = Depends(require_role(["reviewer", "administrator"]))
) -> VerificationReport:
    """
    Assembles extracted OCR evidence, rule verdicts, and reviewer actions into
    a cryptographically hashed downloadable PDF report using ReportLab.
    Protected & RBAC: Requires 'reviewer' or 'administrator' role.
    """
    # Accept from either query param or json payload
    target_app_id = application_id
    if not target_app_id and payload:
        target_app_id = payload.get("applicationId") or payload.get("application_id")

    if not target_app_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required parameter 'application_id'."
        )

    return report_service.generate_report(target_app_id)


@router.get("/{report_id}/download", summary="[Implemented] Download official PDF verification dossier")
async def download_report_pdf(
    report_id: str,
    application_id: Optional[str] = Query(None, description="Optional application ID boundary check"),
    _: str = Depends(verify_api_key)
) -> FileResponse:
    """
    Securely serves the generated PDF report with ownership, existence, and cross-application boundary checks.
    Protected: Requires valid API Key or Bearer token.
    """
    report_model = report_service.get_report_model(report_id)
    if not report_model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report '{report_id}' does not exist in the database."
        )

    # Cross-application authorization check
    if application_id and report_model.application_id.lower() != application_id.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cross-application access denied: Report '{report_id}' belongs to application '{report_model.application_id}', not '{application_id}'."
        )

    # Check if physical PDF file exists on disk; if missing, re-render it from database records
    file_path = report_model.file_path
    if not file_path or not os.path.exists(file_path):
        regenerated = report_service.generate_report(report_model.application_id)
        report_model = report_service.get_report_model(regenerated.id)
        file_path = report_model.file_path if report_model else None

    if not file_path or not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"PDF file for report '{report_id}' could not be located on disk."
        )

    # Return non-public PDF as attachment
    filename = f"{report_id}.pdf"
    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=filename,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
