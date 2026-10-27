from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from backend.app.schemas.document import DocumentItem
from backend.app.schemas.finding import VerificationFinding

ApplicationStatus = Literal["Needs Review", "Verified", "Pending", "Rejected", "Processing"]
PriorityLevel = Literal["High", "Medium", "Low"]
RiskLevel = Literal["High", "Medium", "Low"]
ApplicationType = Literal["Institutional", "Affiliation", "Extension", "Accreditation"]


class TimelineItem(BaseModel):
    step: str = Field(..., example="Application Submitted")
    timestamp: str = Field(..., example="28-Oct-26 09:15 AM")
    status: Literal["completed", "current", "pending"] = Field("completed", example="completed")
    details: Optional[str] = Field(None, example="Submitted via applicant portal by Registrar")


class FindingsCount(BaseModel):
    high: int = 0
    warning: int = 0
    info: int = 0


class ApplicationBase(BaseModel):
    title: str = Field(..., example="AICTE Approval Application")
    applicantName: str = Field(..., example="ABC College of Engineering")
    type: ApplicationType = Field("Institutional", example="Institutional")
    category: str = Field("Institutional Approval", example="Institutional Approval")
    referenceNo: str = Field(..., example="AICTE/APP/2026/1024")
    contactEmail: str = Field("registrar@abccollege.edu.in", example="registrar@abccollege.edu.in")
    contactPhone: str = Field("+91 80 2345 6789", example="+91 80 2345 6789")


class ApplicationCreate(ApplicationBase):
    id: Optional[str] = Field(None, description="Optional custom ID. If omitted, will be auto-generated e.g. APP2026007")
    submittedDate: Optional[str] = Field(None, example="28-Oct-26")
    priority: PriorityLevel = Field("High", example="High")
    riskLevel: RiskLevel = Field("High", example="High")


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus = Field(..., example="Verified")
    reviewerName: Optional[str] = Field("Compliance Reviewer", example="Compliance Reviewer")
    notes: Optional[str] = Field(None, example="Gazette notification cross-referenced and resolved.")


class ApplicationResponse(ApplicationBase):
    id: str = Field(..., example="APP2026001")
    submittedDate: str = Field(..., example="28-Oct-26")
    lastUpdated: str = Field(..., example="28-Oct-26 10:34 AM")
    documentsCount: int = Field(0, example=5)
    documents: List[DocumentItem] = Field(default_factory=list)
    status: ApplicationStatus = Field(..., example="Needs Review")
    priority: PriorityLevel = Field(..., example="High")
    riskLevel: RiskLevel = Field(..., example="High")
    assignedReviewer: Optional[str] = Field("Compliance Reviewer", example="Compliance Reviewer")
    findingsCount: FindingsCount = Field(default_factory=FindingsCount)
    findings: List[VerificationFinding] = Field(default_factory=list)
    complianceScore: int = Field(74, example=74)
    timeline: List[TimelineItem] = Field(default_factory=list)


class ApplicationListResponse(BaseModel):
    items: List[ApplicationResponse]
    total: int
    skip: int
    limit: int
