from typing import Optional, List, Literal
from pydantic import BaseModel, Field

FindingSeverity = Literal["High", "Medium", "Low", "Warning", "Info"]
FindingCategory = Literal["Mismatch", "Missing Document", "Validity", "Compliance", "Format"]
FindingReviewStatus = Literal["Pending", "Reviewed", "Dismissed", "Resolved", "Verified_Accurate", "False_Positive", "Escalated"]


class VerificationFinding(BaseModel):
    id: str = Field(..., example="FIND-001")
    applicationId: Optional[str] = Field(None, example="APP2026001")
    ruleId: Optional[str] = Field(None, example="R002")
    title: str = Field(..., example="Registration Number Mismatch")
    severity: FindingSeverity = Field(..., example="High")
    category: FindingCategory = Field(..., example="Mismatch")
    description: str = Field(..., example="The institution registration number in the Application Form does not match the State Registration Certificate.")
    fieldName: Optional[str] = Field(None, example="Registration Number")
    sourceDoc: Optional[str] = Field(None, example="Application_Form.pdf")
    sourceDocId: Optional[str] = Field(None, example="DOC-1001")
    comparedDoc: Optional[str] = Field(None, example="Registration_Certificate.jpg")
    comparedDocId: Optional[str] = Field(None, example="DOC-1002")
    fieldA: Optional[str] = Field(None, example="Registration Number (Form)")
    valueA: Optional[str] = Field(None, example="REG1324")
    fieldB: Optional[str] = Field(None, example="Registration Number (Certificate)")
    valueB: Optional[str] = Field(None, example="REG1029")
    comparisonResult: Optional[str] = Field(None, example="Mismatch (Values differ)")
    evidenceReferences: Optional[List[str]] = Field(default_factory=list, example=["Application_Form.pdf (Page 1)", "Registration_Certificate.jpg"])
    recommendation: Optional[str] = Field(None, example="Request official clarifying affidavit or verify against State Portal Registry records.")
    reviewStatus: FindingReviewStatus = Field("Pending", example="Pending")
    reviewerNotes: Optional[str] = Field(None, example="Affidavit verified.")
    reviewedBy: Optional[str] = Field(None, example="Compliance Reviewer")
    reviewedAt: Optional[str] = Field(None, example="28-Oct-26 11:00 AM")
    timestamp: Optional[str] = Field(None, example="28-Oct-26 10:34 AM")


class FindingReviewUpdate(BaseModel):
    reviewStatus: Optional[FindingReviewStatus] = Field(None, example="Verified_Accurate")
    status: Optional[FindingReviewStatus] = Field(None, example="Verified_Accurate")
    reviewerNotes: Optional[str] = Field(None, example="Verified against State Portal registry. Authorized as typographical alias.")
    reviewerName: Optional[str] = Field("Compliance Reviewer", example="Compliance Reviewer")

    def get_effective_status(self) -> FindingReviewStatus:
        return self.reviewStatus or self.status or "Verified_Accurate"


class ValidationSummaryResponse(BaseModel):
    application_id: str
    status: str = Field(..., example="Needs Review")
    compliance_score: int = Field(..., example=74)
    risk_level: str = Field(..., example="High")
    findings_count: dict = Field(..., example={"high": 1, "warning": 1, "info": 0})
    findings: List[VerificationFinding]
    rules_evaluated: int = Field(..., example=6)
    rules_triggered: int = Field(..., example=2)
    documents_analyzed: int = Field(..., example=3)
    validation_timestamp: str = Field(..., example="28-Oct-26 10:34 AM")
    disclaimer: str = Field(
        "Automated cross-document validation observations are assistive flags for authorized compliance reviewers, not legal certification or proof of fraud or forgery."
    )
