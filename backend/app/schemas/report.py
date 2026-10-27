from typing import Optional, Literal
from pydantic import BaseModel, Field

ReportStatus = Literal["Needs Review", "Verified", "Pending", "Rejected", "Processing"]


class VerificationReport(BaseModel):
    id: str = Field(..., example="REP2026001")
    applicationId: str = Field(..., example="APP2026001")
    applicantName: str = Field(..., example="ABC College of Engineering")
    generatedDate: str = Field(..., example="28-Oct-26")
    findingsCount: int = Field(5, example=5)
    complianceScore: int = Field(74, example=74)
    status: ReportStatus = Field("Needs Review", example="Needs Review")
    summary: str = Field(..., example="Cross-document OCR detected registration number divergence between Form (REG1324) and Certificate (REG1029).")
    verifiedBy: str = Field("AI Engine v3.2 (Simulated) + Human Queue", example="AI Engine v3.2 (Simulated)")
    downloadUrl: Optional[str] = Field(None, example="/api/v1/reports/REP2026001/download")
