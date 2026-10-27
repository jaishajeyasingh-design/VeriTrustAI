import datetime
import json
import re
from typing import Dict, List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import func

from backend.app.db.session import SessionLocal
from backend.app.db.models import ApplicationModel, FindingModel
from backend.app.schemas.document import DocumentItem
from backend.app.schemas.finding import (
    VerificationFinding,
    ValidationSummaryResponse,
    FindingReviewStatus
)
from backend.app.schemas.application import ApplicationResponse, FindingsCount
from backend.app.services.application_service import application_service
from backend.app.services.document_service import document_service
from backend.app.services.rule_service import rule_service
from backend.app.services.audit_service import audit_service


class CrossDocumentComparator:
    @staticmethod
    def normalize_string(val: Optional[str]) -> str:
        if not val:
            return ""
        # Lowercase, collapse spaces, strip punctuation
        cleaned = re.sub(r"[\s\-_/.]+", " ", val.strip().lower())
        return cleaned.strip()

    @staticmethod
    def extract_field_by_aliases(doc: DocumentItem, aliases: List[str]) -> Optional[str]:
        """Extracts field from extractedFields checking case-insensitive alias matches."""
        fields = doc.extractedFields or {}
        for alias in aliases:
            for k, v in fields.items():
                if k.strip().lower() == alias.strip().lower() and v and str(v).strip():
                    return str(v).strip()
        return None

    @classmethod
    def compare_registration_numbers(
        cls,
        reg1: Optional[str],
        reg2: Optional[str]
    ) -> Tuple[str, str]:
        """
        Field-specific comparison for registration numbers.
        Returns (result_category, explanation).
        Categories: "exact_match", "mismatch", "missing_value", "uncomparable"
        """
        if not reg1 and not reg2:
            return "missing_value", "Registration number is missing or unextracted from both documents."
        if not reg1 or not reg2:
            present_val = reg1 or reg2
            return "uncomparable", f"Registration number is present in one document ('{present_val}') but unextracted in the other."

        # Safe alphanumeric normalization (strip hyphens, slashes, spaces)
        clean1 = re.sub(r"[\s\-_/]", "", reg1).upper()
        clean2 = re.sub(r"[\s\-_/]", "", reg2).upper()

        if clean1 == clean2:
            return "exact_match", f"Registration numbers match exactly ('{reg1}')."
        else:
            return "mismatch", f"Registration number Mismatch detected: Source is '{reg1}' while Compared document records '{reg2}'."

    @classmethod
    def compare_institution_names(
        cls,
        name1: Optional[str],
        name2: Optional[str]
    ) -> Tuple[str, str]:
        """
        Compares institution names with tolerant handling of common statutory suffixes
        (e.g., 'and Technology' vs '& Tech').
        """
        if not name1 and not name2:
            return "missing_value", "Institution name is unextracted from both documents."
        if not name1 or not name2:
            present_name = name1 or name2
            return "uncomparable", f"Institution name is present in one record ('{present_name}') but missing in the other."

        n1 = cls.normalize_string(name1)
        n2 = cls.normalize_string(name2)

        if n1 == n2:
            return "exact_match", "Institution names match identically."

        # Replace standard abbreviations
        abbr_map = {
            "&": "and",
            "tech": "technology",
            "engg": "engineering",
            "inst": "institute",
            "poly": "polytechnic",
            "univ": "university",
            "soc": "society"
        }
        words1 = [abbr_map.get(w, w) for w in n1.split()]
        words2 = [abbr_map.get(w, w) for w in n2.split()]

        # Filter out purely generic words for core comparison
        generics = {"college", "institute", "of", "and", "the", "for", "technology", "engineering", "sciences"}
        core1 = set(words1) - generics
        core2 = set(words2) - generics

        if core1 and core2 and core1 == core2:
            return "match_with_tolerance", f"Institution names match with minor abbreviation differences ('{name1}' vs '{name2}')."

        # Check token overlap
        intersection = set(words1).intersection(set(words2))
        union = set(words1).union(set(words2))
        similarity = len(intersection) / len(union) if union else 0.0

        if similarity >= 0.7:
            return "match_with_tolerance", f"Acceptable linguistic match (Similarity: {similarity*100:.0f}%)."
        else:
            return "mismatch", f"Institution names differ: '{name1}' does not match '{name2}'."


class ValidationService:
    def __init__(self):
        self.comparator = CrossDocumentComparator()

    def get_findings_for_application(self, application_id: str) -> List[VerificationFinding]:
        with SessionLocal() as db:
            app = db.query(ApplicationModel).filter(
                func.lower(ApplicationModel.id) == application_id.lower()
            ).first()
            if not app:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Application '{application_id}' does not exist."
                )
            findings = db.query(FindingModel).filter(
                func.lower(FindingModel.application_id) == application_id.lower()
            ).order_by(FindingModel.id.asc()).all()
            return [f.to_schema() for f in findings]

    def update_finding_review(
        self,
        application_id: str,
        finding_id: str,
        status_update: FindingReviewStatus,
        reviewer_notes: Optional[str] = None,
        reviewer_name: str = "Compliance Reviewer"
    ) -> VerificationFinding:
        with SessionLocal() as db:
            app = db.query(ApplicationModel).filter(
                func.lower(ApplicationModel.id) == application_id.lower()
            ).first()
            if not app:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Application '{application_id}' does not exist."
                )

            finding = db.query(FindingModel).filter(
                func.lower(FindingModel.application_id) == application_id.lower(),
                func.lower(FindingModel.id) == finding_id.lower()
            ).first()

            if not finding:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Finding '{finding_id}' was not found for application '{application_id}'."
                )

            now_str = datetime.datetime.now().strftime("%d-%b-%y %I:%M %p")
            finding.review_status = status_update
            finding.reviewer_notes = reviewer_notes
            finding.reviewed_by = reviewer_name
            finding.reviewed_at = now_str

            # Recompute active counts and compliance score
            all_findings = db.query(FindingModel).filter(
                func.lower(FindingModel.application_id) == application_id.lower()
            ).all()
            high_count = sum(1 for f in all_findings if f.severity == "High" and f.review_status != "Dismissed")
            warning_count = sum(1 for f in all_findings if f.severity in ["Medium", "Warning"] and f.review_status != "Dismissed")
            info_count = sum(1 for f in all_findings if f.severity in ["Low", "Info"] and f.review_status != "Dismissed")

            app.findings_high = high_count
            app.findings_warning = warning_count
            app.findings_info = info_count
            computed_score = 100 - (high_count * 15) - (warning_count * 8) - (info_count * 4)
            app.compliance_score = max(20, min(100, computed_score))
            app.last_updated = now_str

            db.commit()
            db.refresh(finding)

            # Record in audit trail
            audit_service.record_event(
                action=f"Finding Reviewed: {finding_id}",
                application_id=application_id,
                details=f"Reviewer {reviewer_name} marked finding {finding_id} ({finding.title}) as '{status_update}'. Notes: {reviewer_notes or 'None'}",
                user=reviewer_name,
                user_role="reviewer"
            )

            return finding.to_schema()

    def evaluate_application(self, application_id: str) -> ValidationSummaryResponse:
        """
        Runs deterministic compliance rules matrix against all uploaded documents
        strictly associated with the specified application_id.
        """
        # Step 1: Validate application exists
        app = application_service.get_by_id(application_id)
        if not app:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Application '{application_id}' was not found."
            )

        # Step 2: Retrieve documents strictly associated with this application
        docs = document_service.list_documents(application_id=application_id)
        # Deterministic ordering: primary Application document first, followed by supporting attachments
        docs = sorted(docs, key=lambda d: (0 if "application" in d.type.lower() else 1, d.name.lower()))

        # Step 3: Get enabled compliance rules
        enabled_rules = rule_service.get_enabled_rules()
        enabled_rule_ids = {r.id.upper(): r for r in enabled_rules}

        # Preserve review history of prior findings to prevent overwriting reviewer notes on rerun
        existing_review_map: Dict[str, Tuple[FindingReviewStatus, Optional[str], Optional[str], Optional[str]]] = {}
        for f in app.findings:
            existing_review_map[f.id] = (f.reviewStatus, f.reviewerNotes, f.reviewedBy, f.reviewedAt)

        generated_findings: List[VerificationFinding] = []
        rules_triggered_count = 0
        now_str = datetime.datetime.now().strftime("%d-%b-%y %I:%M %p")

        # -----------------------------------------------------------------
        # RULE R001: Required Document Missing
        # -----------------------------------------------------------------
        if "R001" in enabled_rule_ids:
            r001 = enabled_rule_ids["R001"]
            doc_types_present = {d.type.lower() for d in docs}
            # For Institutional Approval, mandatory types: Application, Certificate, Affidavit
            required_types = ["application", "certificate", "affidavit"]
            missing_types = [t for t in required_types if t not in doc_types_present]

            for m_type in missing_types:
                finding_id = f"FIND-{application_id}-R001-{m_type.upper()}"
                old_review = existing_review_map.get(finding_id, ("Pending", None, None, None))
                finding = VerificationFinding(
                    id=finding_id,
                    applicationId=application_id,
                    ruleId="R001",
                    title=f"Missing Mandatory Document: {m_type.title()}",
                    severity=r001.severity,
                    category="Missing Document",
                    description=f"Regulatory policy requires an uploaded '{m_type.title()}' document for {app.category}. No matching document was cataloged in the vault.",
                    fieldName="Document Type",
                    sourceDoc="Required Statutory Checklist",
                    comparedDoc="Uploaded Vault Documents",
                    fieldA="Mandatory Document",
                    valueA=m_type.title(),
                    fieldB="Uploaded Types",
                    valueB=", ".join(d.type for d in docs) if docs else "No files uploaded",
                    comparisonResult=f"Missing required {m_type.title()}",
                    evidenceReferences=[d.name for d in docs],
                    recommendation=f"Upload a valid signed statutory {m_type.title()} to fulfill mandatory AICTE filing prerequisites.",
                    reviewStatus=old_review[0],
                    reviewerNotes=old_review[1],
                    reviewedBy=old_review[2],
                    reviewedAt=old_review[3],
                    timestamp=now_str
                )
                generated_findings.append(finding)
                rules_triggered_count += 1

        # -----------------------------------------------------------------
        # RULE R007 / R002: Registration Number Cross-Document Divergence
        # -----------------------------------------------------------------
        reg_rule = enabled_rule_ids.get("R007") or enabled_rule_ids.get("R002")
        if reg_rule:
            # Extract registration numbers across all documents in this application
            reg_aliases = ["Registration Number", "Registration No", "Reg No", "REG_NO", "Certificate ID"]
            doc_regs: List[Tuple[DocumentItem, str]] = []
            for d in docs:
                val = self.comparator.extract_field_by_aliases(d, reg_aliases)
                if val:
                    doc_regs.append((d, val))

            # Compare pairs of documents
            compared_pairs = set()
            for i in range(len(doc_regs)):
                for j in range(i + 1, len(doc_regs)):
                    docA, regA = doc_regs[i]
                    docB, regB = doc_regs[j]
                    pair_key = tuple(sorted([docA.id, docB.id]))
                    if pair_key in compared_pairs:
                        continue
                    compared_pairs.add(pair_key)

                    category, explanation = self.comparator.compare_registration_numbers(regA, regB)
                    if category == "mismatch":
                        finding_id = f"FIND-{application_id}-REG-MISMATCH"
                        old_review = existing_review_map.get(finding_id, ("Pending", None, None, None))
                        finding = VerificationFinding(
                            id=finding_id,
                            applicationId=application_id,
                            ruleId=reg_rule.id,
                            title="Registration Number Mismatch",
                            severity=reg_rule.severity,
                            category="Mismatch",
                            description=f"The institution registration number in {docA.name} ('{regA}') does not match {docB.name} ('{regB}').",
                            fieldName="Registration Number",
                            sourceDoc=docA.name,
                            sourceDocId=docA.id,
                            comparedDoc=docB.name,
                            comparedDocId=docB.id,
                            fieldA=f"Registration Number ({docA.type})",
                            valueA=regA,
                            fieldB=f"Registration Number ({docB.type})",
                            valueB=regB,
                            comparisonResult=explanation,
                            evidenceReferences=[
                                f"{docA.name} (ID: {docA.id})",
                                f"{docB.name} (ID: {docB.id})"
                            ],
                            recommendation="The registration number differs between documents. Request clarifying statutory affidavit or cross-verify state portal registry records.",
                            reviewStatus=old_review[0],
                            reviewerNotes=old_review[1],
                            reviewedBy=old_review[2],
                            reviewedAt=old_review[3],
                            timestamp=now_str
                        )
                        generated_findings.append(finding)
                        rules_triggered_count += 1

        # -----------------------------------------------------------------
        # RULE R002: Applicant / Institution Name Inconsistency
        # -----------------------------------------------------------------
        if "R002" in enabled_rule_ids:
            r002 = enabled_rule_ids["R002"]
            name_aliases = ["Institution Name", "Applicant Legal Name", "Applicant Name", "Issued Name", "College Name"]

            for d in docs:
                doc_name_val = self.comparator.extract_field_by_aliases(d, name_aliases)
                if doc_name_val:
                    category, explanation = self.comparator.compare_institution_names(app.applicantName, doc_name_val)
                    if category == "mismatch":
                        finding_id = f"FIND-{application_id}-NAME-{d.id}"
                        old_review = existing_review_map.get(finding_id, ("Pending", None, None, None))
                        finding = VerificationFinding(
                            id=finding_id,
                            applicationId=application_id,
                            ruleId="R002",
                            title="Applicant Legal Name Inconsistency",
                            severity=r002.severity,
                            category="Mismatch",
                            description=f"The applicant name in the application header ('{app.applicantName}') diverges from {d.name} ('{doc_name_val}').",
                            fieldName="Institution Name",
                            sourceDoc="Application Dossier Header",
                            comparedDoc=d.name,
                            comparedDocId=d.id,
                            fieldA="Application Name",
                            valueA=app.applicantName,
                            fieldB=f"{d.name} Name",
                            valueB=doc_name_val,
                            comparisonResult=explanation,
                            evidenceReferences=[d.name],
                            recommendation="Verify institution name resolution or request official gazette notification on name alterations.",
                            reviewStatus=old_review[0],
                            reviewerNotes=old_review[1],
                            reviewedBy=old_review[2],
                            reviewedAt=old_review[3],
                            timestamp=now_str
                        )
                        generated_findings.append(finding)
                        rules_triggered_count += 1
                        break  # Only one primary name divergence flag per application

        # -----------------------------------------------------------------
        # RULE R004: Expired Clearance / Validity Horizon
        # -----------------------------------------------------------------
        if "R004" in enabled_rule_ids:
            r004 = enabled_rule_ids["R004"]
            validity_aliases = ["Validity Period", "NOC Validity", "Valid Until", "Expiration Date"]
            for d in docs:
                val = self.comparator.extract_field_by_aliases(d, validity_aliases)
                if val and ("expires in 14 days" in val.lower() or "expired" in val.lower() or "expiring" in val.lower()):
                    finding_id = f"FIND-{application_id}-EXPIRY-{d.id}"
                    old_review = existing_review_map.get(finding_id, ("Pending", None, None, None))
                    finding = VerificationFinding(
                        id=finding_id,
                        applicationId=application_id,
                        ruleId="R004",
                        title=f"Expiring Statutory Clearance: {d.name}",
                        severity=r004.severity,
                        category="Validity",
                        description=f"Clearance credential '{d.name}' indicates validity status '{val}', which expires within the mandatory statutory review horizon.",
                        fieldName="Validity Period",
                        sourceDoc=d.name,
                        sourceDocId=d.id,
                        comparedDoc="Statutory 30-Day Window Rule",
                        fieldA="Clearance Validity",
                        valueA=val,
                        fieldB="Required Horizon",
                        valueB="At least 90 days validity remaining",
                        comparisonResult="Expiring within 30-day window",
                        evidenceReferences=[d.name],
                        recommendation="Request official renewal clearance receipt from the local fire/environmental authority.",
                        reviewStatus=old_review[0],
                        reviewerNotes=old_review[1],
                        reviewedBy=old_review[2],
                        reviewedAt=old_review[3],
                        timestamp=now_str
                    )
                    generated_findings.append(finding)
                    rules_triggered_count += 1

        # -----------------------------------------------------------------
        # RULE R005: Required Field Missing
        # -----------------------------------------------------------------
        if "R005" in enabled_rule_ids:
            r005 = enabled_rule_ids["R005"]
            # Check if any uploaded Application or Certificate is missing Registration Number
            for d in docs:
                if d.type in ["Application", "Certificate"]:
                    reg_val = self.comparator.extract_field_by_aliases(
                        d, ["Registration Number", "Registration No", "Reg No", "Certificate ID"]
                    )
                    if not reg_val and d.status == "Processed":
                        finding_id = f"FIND-{application_id}-R005-MISSINGREG-{d.id}"
                        old_review = existing_review_map.get(finding_id, ("Pending", None, None, None))
                        finding = VerificationFinding(
                            id=finding_id,
                            applicationId=application_id,
                            ruleId="R005",
                            title=f"Required Field Unextracted in {d.name}",
                            severity=r005.severity,
                            category="Compliance",
                            description=f"Mandatory statutory field 'Registration Number' could not be reliably extracted from {d.name}. Value is unrecorded or scan was unreadable.",
                            fieldName="Registration Number",
                            sourceDoc=d.name,
                            sourceDocId=d.id,
                            fieldA="Document Status",
                            valueA=d.status,
                            fieldB="Expected Field",
                            valueB="Registration Number",
                            comparisonResult="Field unextracted / missing in document",
                            evidenceReferences=[d.name],
                            recommendation="Review document scan visually or re-upload higher contrast PDF.",
                            reviewStatus=old_review[0],
                            reviewerNotes=old_review[1],
                            reviewedBy=old_review[2],
                            reviewedAt=old_review[3],
                            timestamp=now_str
                        )
                        generated_findings.append(finding)
                        rules_triggered_count += 1

        # -----------------------------------------------------------------
        # Dynamic Compliance Score & Risk Calculation
        # -----------------------------------------------------------------
        high_count = sum(1 for f in generated_findings if f.severity == "High" and f.reviewStatus != "Dismissed")
        warning_count = sum(1 for f in generated_findings if f.severity in ["Medium", "Warning"] and f.reviewStatus != "Dismissed")
        info_count = sum(1 for f in generated_findings if f.severity in ["Low", "Info"] and f.reviewStatus != "Dismissed")

        # Score formula: 100 base minus severity weights
        computed_score = 100 - (high_count * 15) - (warning_count * 8) - (info_count * 4)
        computed_score = max(20, min(100, computed_score))

        # Risk level mapping
        if high_count > 0 or computed_score < 75:
            risk_level = "High"
            status_str = "Needs Review"
        elif warning_count > 0 or computed_score < 90:
            risk_level = "Medium"
            status_str = "Pending" if app.status == "Pending" else "Needs Review"
        else:
            risk_level = "Low"
            status_str = "Verified" if app.status == "Verified" else "Needs Review"

        # Step 4: Update application record and findings in database
        with SessionLocal() as db:
            app_model = db.query(ApplicationModel).filter(
                func.lower(ApplicationModel.id) == application_id.lower()
            ).first()

            if app_model:
                # Remove prior findings for this application
                db.query(FindingModel).filter(
                    func.lower(FindingModel.application_id) == application_id.lower()
                ).delete()

                # Insert new findings
                for f in generated_findings:
                    f_row = FindingModel(
                        id=f.id,
                        application_id=app_model.id,
                        rule_id=f.ruleId,
                        title=f.title,
                        severity=f.severity,
                        category=f.category,
                        description=f.description,
                        field_name=f.fieldName,
                        source_doc=f.sourceDoc,
                        source_doc_id=f.sourceDocId,
                        compared_doc=f.comparedDoc,
                        field_a=f.fieldA,
                        value_a=f.valueA,
                        field_b=f.fieldB,
                        value_b=f.valueB,
                        comparison_result=f.comparisonResult,
                        evidence_references_json=json.dumps(f.evidenceReferences or []),
                        recommendation=f.recommendation,
                        review_status=f.reviewStatus,
                        reviewer_notes=f.reviewerNotes,
                        reviewed_by=f.reviewedBy,
                        reviewed_at=f.reviewedAt,
                        timestamp=f.timestamp
                    )
                    db.add(f_row)

                # Update application model fields
                app_model.compliance_score = computed_score
                app_model.risk_level = risk_level
                app_model.findings_high = high_count
                app_model.findings_warning = warning_count
                app_model.findings_info = info_count
                app_model.last_updated = now_str

                # Timeline update
                timeline_items = []
                if app_model.timeline_json:
                    try:
                        timeline_items = json.loads(app_model.timeline_json)
                    except Exception:
                        pass

                timeline_items.append({
                    "step": "Automated Cross-Document Validation",
                    "timestamp": now_str,
                    "status": "completed",
                    "details": f"Evaluated {len(enabled_rules)} rules. Generated {len(generated_findings)} finding(s). Compliance score: {computed_score}%."
                })
                app_model.timeline_json = json.dumps(timeline_items)

                db.commit()

        # Step 5: Log validation event in audit ledger
        audit_service.record_event(
            action="Cross-Document Validation Completed",
            application_id=application_id,
            details=f"Evaluated {len(enabled_rules)} enabled rules across {len(docs)} document(s). Generated {len(generated_findings)} finding(s). Computed compliance score: {computed_score}%.",
            user="System Engine",
            user_role="System"
        )

        return ValidationSummaryResponse(
            application_id=application_id,
            status=status_str,
            compliance_score=computed_score,
            risk_level=risk_level,
            findings_count={"high": high_count, "warning": warning_count, "info": info_count},
            findings=generated_findings,
            rules_evaluated=len(enabled_rules),
            rules_triggered=rules_triggered_count,
            documents_analyzed=len(docs),
            validation_timestamp=now_str
        )


validation_service = ValidationService()
