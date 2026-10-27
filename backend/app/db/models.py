import datetime
import json
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    Text,
    DateTime,
    ForeignKey,
    Index
)
from sqlalchemy.orm import relationship
from backend.app.db.session import Base
from backend.app.schemas.application import (
    ApplicationResponse,
    TimelineItem,
    FindingsCount
)
from backend.app.schemas.document import DocumentItem
from backend.app.schemas.finding import VerificationFinding
from backend.app.schemas.rule import ComplianceRule
from backend.app.schemas.report import VerificationReport
from backend.app.schemas.audit import AuditEvent


class ApplicationModel(Base):
    __tablename__ = "applications"

    id = Column(String(50), primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    applicant_name = Column(String(255), nullable=False, index=True)
    type = Column(String(50), nullable=False, index=True)
    category = Column(String(100), nullable=False)
    reference_no = Column(String(100), nullable=False, index=True)
    submitted_date = Column(String(50), nullable=False)
    last_updated = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False, default="Needs Review", index=True)
    priority = Column(String(50), nullable=False, default="Medium", index=True)
    risk_level = Column(String(50), nullable=False, default="Medium")
    assigned_reviewer = Column(String(100), default="Compliance Reviewer")
    contact_email = Column(String(100), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    compliance_score = Column(Integer, default=85)
    findings_high = Column(Integer, default=0)
    findings_warning = Column(Integer, default=0)
    findings_info = Column(Integer, default=0)
    timeline_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships with strict cascade deletion
    documents = relationship(
        "DocumentModel",
        back_populates="application",
        cascade="all, delete-orphan",
        order_by="DocumentModel.id.desc()"
    )
    findings = relationship(
        "FindingModel",
        back_populates="application",
        cascade="all, delete-orphan",
        order_by="FindingModel.id.asc()"
    )
    reports = relationship(
        "ReportModel",
        back_populates="application",
        cascade="all, delete-orphan",
        order_by="ReportModel.id.desc()"
    )
    audit_events = relationship(
        "AuditEventModel",
        back_populates="application"
    )

    def to_schema(self) -> ApplicationResponse:
        timeline_items = []
        if self.timeline_json:
            try:
                raw_items = json.loads(self.timeline_json)
                timeline_items = [TimelineItem(**item) for item in raw_items]
            except Exception:
                pass

        doc_schemas = [doc.to_schema() for doc in self.documents] if self.documents else []
        finding_schemas = [f.to_schema() for f in self.findings] if self.findings else []

        return ApplicationResponse(
            id=self.id,
            title=self.title,
            applicantName=self.applicant_name,
            type=self.type,  # type: ignore
            category=self.category,
            referenceNo=self.reference_no,
            submittedDate=self.submitted_date,
            lastUpdated=self.last_updated,
            documentsCount=len(doc_schemas),
            documents=doc_schemas,
            status=self.status,  # type: ignore
            priority=self.priority,  # type: ignore
            riskLevel=self.risk_level,  # type: ignore
            assignedReviewer=self.assigned_reviewer,
            contactEmail=self.contact_email,
            contactPhone=self.contact_phone,
            complianceScore=self.compliance_score,
            findingsCount=FindingsCount(
                high=self.findings_high,
                warning=self.findings_warning,
                info=self.findings_info
            ),
            findings=finding_schemas,
            timeline=timeline_items
        )


class DocumentModel(Base):
    __tablename__ = "documents"

    id = Column(String(50), primary_key=True, index=True)
    application_id = Column(String(50), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    doc_type = Column(String(50), nullable=False, index=True)
    size = Column(String(50), nullable=False)
    uploaded_date = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False, default="Processed")
    ocr_status = Column(String(50), nullable=False, default="Completed")
    file_format = Column(String(20), nullable=False)
    page_count = Column(Integer, default=1)
    storage_path = Column(String(500), nullable=True)
    raw_text = Column(Text, nullable=True)
    extraction_method = Column(String(50), nullable=True)
    extracted_fields_json = Column(Text, nullable=True)
    authenticity_score = Column(Float, nullable=True)
    ocr_engine_available = Column(Boolean, default=True)
    processing_errors_json = Column(Text, nullable=True)
    demo_mode = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    application = relationship("ApplicationModel", back_populates="documents")

    def to_schema(self) -> DocumentItem:
        extracted = {}
        if self.extracted_fields_json:
            try:
                extracted = json.loads(self.extracted_fields_json)
            except Exception:
                pass

        errors = []
        if self.processing_errors_json:
            try:
                errors = json.loads(self.processing_errors_json)
            except Exception:
                pass

        return DocumentItem(
            id=self.id,
            name=self.name,
            type=self.doc_type,  # type: ignore
            size=self.size,
            applicationId=self.application_id,
            uploadedDate=self.uploaded_date,
            status=self.status,  # type: ignore
            ocrStatus=self.ocr_status,  # type: ignore
            fileFormat=self.file_format,  # type: ignore
            pageCount=self.page_count,
            storagePath=self.storage_path,
            rawText=self.raw_text,
            extractionMethod=self.extraction_method,
            extractedFields=extracted,
            authenticityScore=self.authenticity_score,
            ocrEngineAvailable=self.ocr_engine_available,
            processingErrors=errors,
            demo_mode=self.demo_mode
        )


class RuleModel(Base):
    __tablename__ = "compliance_rules"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=False)
    severity = Column(String(50), nullable=False, default="Medium")
    enabled = Column(Boolean, default=True, index=True)
    affected_fields_json = Column(Text, nullable=True)
    last_triggered = Column(String(50), nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def to_schema(self) -> ComplianceRule:
        fields = []
        if self.affected_fields_json:
            try:
                fields = json.loads(self.affected_fields_json)
            except Exception:
                pass

        return ComplianceRule(
            id=self.id,
            name=self.name,
            category=self.category,
            description=self.description,
            severity=self.severity,  # type: ignore
            enabled=self.enabled,
            affectedFields=fields,
            lastTriggered=self.last_triggered
        )


class FindingModel(Base):
    __tablename__ = "findings"

    id = Column(String(100), primary_key=True, index=True)
    application_id = Column(String(50), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_id = Column(String(50), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    severity = Column(String(50), nullable=False, index=True)
    category = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    field_name = Column(String(100), nullable=True)
    source_doc = Column(String(255), nullable=True)
    source_doc_id = Column(String(50), nullable=True)
    compared_doc = Column(String(255), nullable=True)
    field_a = Column(String(100), nullable=True)
    value_a = Column(Text, nullable=True)
    field_b = Column(String(100), nullable=True)
    value_b = Column(Text, nullable=True)
    comparison_result = Column(Text, nullable=True)
    evidence_references_json = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)
    review_status = Column(String(50), default="Pending")
    reviewer_notes = Column(Text, nullable=True)
    reviewed_by = Column(String(100), nullable=True)
    reviewed_at = Column(String(50), nullable=True)
    timestamp = Column(String(50), nullable=True)

    application = relationship("ApplicationModel", back_populates="findings")

    def to_schema(self) -> VerificationFinding:
        evidence = []
        if self.evidence_references_json:
            try:
                evidence = json.loads(self.evidence_references_json)
            except Exception:
                pass

        return VerificationFinding(
            id=self.id,
            applicationId=self.application_id,
            ruleId=self.rule_id,
            title=self.title,
            severity=self.severity,  # type: ignore
            category=self.category,  # type: ignore
            description=self.description,
            fieldName=self.field_name,
            sourceDoc=self.source_doc,
            sourceDocId=self.source_doc_id,
            comparedDoc=self.compared_doc,
            fieldA=self.field_a,
            valueA=self.value_a,
            fieldB=self.field_b,
            valueB=self.value_b,
            comparisonResult=self.comparison_result,
            evidenceReferences=evidence,
            recommendation=self.recommendation,
            reviewStatus=self.review_status,  # type: ignore
            reviewerNotes=self.reviewer_notes,
            reviewedBy=self.reviewed_by,
            reviewedAt=self.reviewed_at,
            timestamp=self.timestamp
        )


class ReportModel(Base):
    __tablename__ = "verification_reports"

    id = Column(String(50), primary_key=True, index=True)
    application_id = Column(String(50), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    applicant_name = Column(String(255), nullable=False)
    generated_date = Column(String(50), nullable=False)
    findings_count = Column(Integer, default=0)
    compliance_score = Column(Integer, default=100)
    status = Column(String(50), default="Needs Review")
    summary = Column(Text, nullable=False)
    verified_by = Column(String(255), default="VeriTrust AI Compliance Engine v3.2")
    download_url = Column(String(255), nullable=True)
    file_path = Column(String(500), nullable=True)
    audit_hash = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    application = relationship("ApplicationModel", back_populates="reports")

    def to_schema(self) -> VerificationReport:
        return VerificationReport(
            id=self.id,
            applicationId=self.application_id,
            applicantName=self.applicant_name,
            generatedDate=self.generated_date,
            findingsCount=self.findings_count,
            complianceScore=self.compliance_score,
            status=self.status,  # type: ignore
            summary=self.summary,
            verifiedBy=self.verified_by,
            downloadUrl=self.download_url
        )


class AuditEventModel(Base):
    __tablename__ = "audit_events"

    id = Column(String(50), primary_key=True, index=True)
    timestamp = Column(String(50), nullable=False)
    user = Column(String(100), nullable=False)
    user_role = Column(String(50), nullable=False, default="reviewer")
    action = Column(String(100), nullable=False, index=True)
    application_id = Column(String(50), ForeignKey("applications.id", ondelete="SET NULL"), nullable=True, index=True)
    details = Column(Text, nullable=False)
    prev_hash = Column(String(100), nullable=True)
    hash = Column(String(100), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    application = relationship("ApplicationModel", back_populates="audit_events")

    def to_schema(self) -> AuditEvent:
        valid_roles = ["applicant", "reviewer", "administrator", "System"]
        safe_role = self.user_role if self.user_role in valid_roles else "reviewer"
        return AuditEvent(
            id=self.id,
            timestamp=self.timestamp,
            user=self.user,
            userRole=safe_role,  # type: ignore
            action=self.action,
            applicationId=self.application_id or "",
            details=self.details,
            hash=self.hash
        )
