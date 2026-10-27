from typing import List, Optional, Literal
from pydantic import BaseModel, Field

RuleCategory = Literal["General", "Data Check", "Document", "Field Validation", "Jurisdiction"]
RuleSeverity = Literal["High", "Medium", "Low"]


class ComplianceRule(BaseModel):
    id: str = Field(..., example="R001")
    name: str = Field(..., example="Required document missing")
    category: RuleCategory = Field(..., example="General")
    description: str = Field(..., example="Enforces presence of all mandatory statutory documents based on the approval category.")
    severity: RuleSeverity = Field(..., example="High")
    enabled: bool = Field(True, example=True)
    affectedFields: List[str] = Field(default_factory=list)
    lastTriggered: Optional[str] = Field(None, example="28-Oct-26 10:30 AM")


class RuleToggleRequest(BaseModel):
    enabled: bool = Field(..., example=True)


class RuleTestRequest(BaseModel):
    sampleData: Optional[dict] = None
