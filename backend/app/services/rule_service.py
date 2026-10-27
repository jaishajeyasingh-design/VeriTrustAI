from typing import List, Optional
from sqlalchemy import func
from backend.app.schemas.rule import ComplianceRule
from backend.app.db.session import SessionLocal
from backend.app.db.models import RuleModel

SEED_RULES: List[ComplianceRule] = [
    ComplianceRule(
        id="R001",
        name="Required document missing",
        category="General",
        description="Enforces presence of all mandatory statutory documents based on the approval category.",
        severity="High",
        enabled=True,
        affectedFields=["Affidavit", "Registration Certificate", "Application"],
        lastTriggered="28-Oct-26 10:30 AM"
    ),
    ComplianceRule(
        id="R002",
        name="Applicant name mismatch",
        category="Data Check",
        description="Compares applicant name across Application Form, Pan Card, Land Deed and Registration Certificate with phonetic and fuzzy tolerance.",
        severity="High",
        enabled=True,
        affectedFields=["Applicant Name", "Trust / Society Name"],
        lastTriggered="28-Oct-26 10:34 AM"
    ),
    ComplianceRule(
        id="R003",
        name="Date inconsistency",
        category="Data Check",
        description="Ensures certificates and affidavits precede submission date and have not expired or predated legal incorporation.",
        severity="Medium",
        enabled=True,
        affectedFields=["Issue Date", "Validity Period", "Submission Date"],
        lastTriggered="27-Oct-26 02:45 PM"
    ),
    ComplianceRule(
        id="R004",
        name="Expired document",
        category="Document",
        description="Verifies that clearances (e.g. Fire NOC, Building Safety Certificate) have a valid validity horizon of at least 90 days.",
        severity="Medium",
        enabled=True,
        affectedFields=["NOC Validity", "Pollution Control Clearance"],
        lastTriggered="28-Oct-26 10:32 AM"
    ),
    ComplianceRule(
        id="R005",
        name="Required field missing",
        category="Field Validation",
        description="Validates that high-order schema fields (e.g. Pin code, PAN, Society Registration Number) are not left blank.",
        severity="High",
        enabled=True,
        affectedFields=["Registration Number", "Land Area Sq. Meters"],
        lastTriggered="26-Oct-26 05:20 PM"
    ),
    ComplianceRule(
        id="R006",
        name="Jurisdiction & Zoning conflict",
        category="Jurisdiction",
        description="Ensures municipal clearance matches state land revenue records and regional AICTE council boundary.",
        severity="Low",
        enabled=False,
        affectedFields=["District", "Revenue Survey Number"],
        lastTriggered="24-Oct-26 09:12 AM"
    ),
    ComplianceRule(
        id="R007",
        name="Registration number mismatch",
        category="Data Check",
        description="Detects cross-document divergence in statutory registration and accreditation numbers between the application dossier and certificate of incorporation.",
        severity="High",
        enabled=True,
        affectedFields=["Registration Number", "Certificate ID"],
        lastTriggered="28-Oct-26 10:34 AM"
    )
]


class RuleService:
    def list_rules(self) -> List[ComplianceRule]:
        with SessionLocal() as db:
            rules = db.query(RuleModel).order_by(RuleModel.id.asc()).all()
            return [r.to_schema() for r in rules]

    def get_rule(self, rule_id: str) -> Optional[ComplianceRule]:
        with SessionLocal() as db:
            rule = db.query(RuleModel).filter(
                func.lower(RuleModel.id) == rule_id.lower()
            ).first()
            if not rule:
                return None
            return rule.to_schema()

    def get_enabled_rules(self) -> List[ComplianceRule]:
        with SessionLocal() as db:
            rules = db.query(RuleModel).filter(RuleModel.enabled.is_(True)).order_by(RuleModel.id.asc()).all()
            return [r.to_schema() for r in rules]

    def toggle_rule(self, rule_id: str, enabled: bool) -> Optional[ComplianceRule]:
        with SessionLocal() as db:
            rule = db.query(RuleModel).filter(
                func.lower(RuleModel.id) == rule_id.lower()
            ).first()
            if not rule:
                return None
            rule.enabled = enabled
            db.commit()
            db.refresh(rule)
            return rule.to_schema()


rule_service = RuleService()
