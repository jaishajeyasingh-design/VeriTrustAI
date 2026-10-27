from typing import Optional, Literal
from pydantic import BaseModel, Field

UserRoleEnum = Literal["applicant", "reviewer", "administrator", "System"]


class AuditEvent(BaseModel):
    id: str = Field(..., example="AUD-991")
    timestamp: str = Field(..., example="28-Oct-26 10:34 AM")
    user: str = Field(..., example="Compliance Reviewer")
    userRole: UserRoleEnum = Field("reviewer", example="reviewer")
    avatar: Optional[str] = None
    action: str = Field(..., example="Verification Completed")
    applicationId: str = Field(..., example="APP2026001")
    details: str = Field(..., example="Simulated verification results generated. Cross-document comparison flagged 2 mismatches.")
    hash: str = Field(..., example="sha256:8f4c2e19b0d1a4e76317bcde89a241e")


class AuditEventCreate(BaseModel):
    user: str = "Compliance Reviewer"
    userRole: UserRoleEnum = "reviewer"
    action: str
    applicationId: str
    details: str
