import json
from sqlalchemy.orm import Session
from backend.app.db.session import engine, Base, SessionLocal
from backend.app.db.models import (
    ApplicationModel,
    DocumentModel,
    RuleModel,
    FindingModel,
    ReportModel,
    AuditEventModel
)
from backend.app.data.seed_data import SEED_APPLICATIONS, SEED_DOCUMENTS
from backend.app.services.rule_service import SEED_RULES
from backend.app.services.audit_service import SEED_AUDIT
from backend.app.api.v1.endpoints.reports import SEED_REPORTS


def init_database() -> None:
    """
    Creates database tables if they do not exist, and idempotently seeds
    initial institutional applications, documents, rules, findings, reports, and audit logs.
    Never duplicates or overwrites existing records on restart.
    """
    # 1. Create tables
    Base.metadata.create_all(bind=engine)

    # 2. Seed initial data within a transaction
    with SessionLocal() as db:
        # Check Rules
        if db.query(RuleModel).first() is None:
            for r in SEED_RULES:
                rule_row = RuleModel(
                    id=r.id,
                    name=r.name,
                    category=r.category,
                    description=r.description,
                    severity=r.severity,
                    enabled=r.enabled,
                    affected_fields_json=json.dumps(r.affectedFields or []),
                    last_triggered=r.lastTriggered
                )
                db.add(rule_row)
            db.commit()

        # Check Applications & Documents & Findings
        if db.query(ApplicationModel).first() is None:
            for app in SEED_APPLICATIONS:
                timeline_data = [t.model_dump() for t in app.timeline] if app.timeline else []
                app_row = ApplicationModel(
                    id=app.id,
                    title=app.title,
                    applicant_name=app.applicantName,
                    type=app.type,
                    category=app.category,
                    reference_no=app.referenceNo,
                    submitted_date=app.submittedDate,
                    last_updated=app.lastUpdated,
                    status=app.status,
                    priority=app.priority,
                    risk_level=app.riskLevel,
                    assigned_reviewer=app.assignedReviewer,
                    contact_email=app.contactEmail,
                    contact_phone=app.contactPhone,
                    compliance_score=app.complianceScore,
                    findings_high=app.findingsCount.high if app.findingsCount else 0,
                    findings_warning=app.findingsCount.warning if app.findingsCount else 0,
                    findings_info=app.findingsCount.info if app.findingsCount else 0,
                    timeline_json=json.dumps(timeline_data)
                )
                db.add(app_row)
                db.flush()

                # Add application documents
                if app.documents:
                    for doc in app.documents:
                        doc_row = DocumentModel(
                            id=doc.id,
                            application_id=app.id,
                            name=doc.name,
                            doc_type=doc.type,
                            size=doc.size,
                            uploaded_date=doc.uploadedDate,
                            status=doc.status,
                            ocr_status=doc.ocrStatus,
                            file_format=doc.fileFormat,
                            page_count=getattr(doc, "pageCount", 1) or 1,
                            storage_path=getattr(doc, "storagePath", None),
                            raw_text=getattr(doc, "rawText", None),
                            extraction_method=getattr(doc, "extractionMethod", None) or ("pymupdf_direct" if doc.fileFormat == "PDF" else "tesseract_ocr"),
                            extracted_fields_json=json.dumps(doc.extractedFields or {}),
                            authenticity_score=doc.authenticityScore,
                            ocr_engine_available=doc.ocrEngineAvailable,
                            processing_errors_json=json.dumps(doc.processingErrors or []),
                            demo_mode=doc.demo_mode
                        )
                        db.add(doc_row)

                # Add application findings
                if app.findings:
                    for f in app.findings:
                        finding_row = FindingModel(
                            id=f.id,
                            application_id=app.id,
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
                        db.add(finding_row)

            db.commit()

        # Check Audit Events
        if db.query(AuditEventModel).first() is None:
            for a in SEED_AUDIT:
                audit_row = AuditEventModel(
                    id=a.id,
                    timestamp=a.timestamp,
                    user=a.user,
                    user_role=a.userRole,
                    action=a.action,
                    application_id=a.applicationId,
                    details=a.details,
                    prev_hash=None,
                    hash=a.hash
                )
                db.add(audit_row)
            db.commit()

        # Check Verification Reports
        if db.query(ReportModel).first() is None:
            for rep in SEED_REPORTS:
                rep_row = ReportModel(
                    id=rep.id,
                    application_id=rep.applicationId,
                    applicant_name=rep.applicantName,
                    generated_date=rep.generatedDate,
                    findings_count=rep.findingsCount,
                    compliance_score=rep.complianceScore,
                    status=rep.status,
                    summary=rep.summary,
                    verified_by=rep.verifiedBy,
                    download_url=rep.downloadUrl
                )
                db.add(rep_row)
            db.commit()


if __name__ == "__main__":
    init_database()
    print("Database initialized and verified successfully.")
