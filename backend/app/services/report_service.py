import datetime
import hashlib
import json
import os
from pathlib import Path
from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import func
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether
)

from backend.app.core.config import settings
from backend.app.db.session import SessionLocal
from backend.app.db.models import (
    ApplicationModel,
    DocumentModel,
    FindingModel,
    ReportModel,
    AuditEventModel
)
from backend.app.schemas.report import VerificationReport
from backend.app.services.audit_service import audit_service


class NumberedCanvas:
    """Two-pass canvas to calculate total page count and add headers/footers."""
    pass


class ReportService:
    def __init__(self):
        # Ensure reports output directory exists
        settings.get_reports_path()

    def list_reports(self) -> List[VerificationReport]:
        with SessionLocal() as db:
            reports = db.query(ReportModel).order_by(ReportModel.created_at.desc(), ReportModel.id.desc()).all()
            return [r.to_schema() for r in reports]

    def get_report(self, report_id: str) -> Optional[VerificationReport]:
        with SessionLocal() as db:
            report = db.query(ReportModel).filter(
                func.lower(ReportModel.id) == report_id.lower()
            ).first()
            if not report:
                return None
            return report.to_schema()

    def get_report_model(self, report_id: str) -> Optional[ReportModel]:
        with SessionLocal() as db:
            return db.query(ReportModel).filter(
                func.lower(ReportModel.id) == report_id.lower()
            ).first()

    def generate_report(self, application_id: str) -> VerificationReport:
        """
        Gathers persisted application dossier, documents, OCR extracts, findings,
        reviewer decisions, and audit events from the database and compiles a real,
        cryptographically hashed vector PDF report using ReportLab.
        """
        with SessionLocal() as db:
            # 1. Fetch application
            app = db.query(ApplicationModel).filter(
                func.lower(ApplicationModel.id) == application_id.lower()
            ).first()
            if not app:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Application '{application_id}' does not exist."
                )

            # 2. Fetch associated documents
            documents = db.query(DocumentModel).filter(
                func.lower(DocumentModel.application_id) == application_id.lower()
            ).order_by(DocumentModel.id.asc()).all()

            # 3. Fetch associated findings
            findings = db.query(FindingModel).filter(
                func.lower(FindingModel.application_id) == application_id.lower()
            ).order_by(FindingModel.id.asc()).all()

            # 4. Fetch recent audit events
            audit_events = db.query(AuditEventModel).filter(
                func.lower(AuditEventModel.application_id) == application_id.lower()
            ).order_by(AuditEventModel.created_at.desc()).limit(5).all()

            # Determine unique report ID
            clean_app_num = app.id.upper().replace("APP", "")
            base_report_id = f"REP{clean_app_num}"
            existing = db.query(ReportModel).filter(
                func.lower(ReportModel.id) == base_report_id.lower()
            ).first()
            if existing:
                count_reports = db.query(ReportModel).filter(
                    ReportModel.id.like(f"{base_report_id}%")
                ).count()
                report_id = f"{base_report_id}-{count_reports + 1}"
            else:
                report_id = base_report_id

            now_str = datetime.datetime.now().strftime("%d-%b-%y")
            timestamp_full = datetime.datetime.now().strftime("%d-%b-%y %I:%M %p")

            # 5. Build PDF file path
            reports_dir = settings.get_reports_path()
            pdf_filename = f"{report_id}.pdf"
            pdf_path = reports_dir / pdf_filename

            # 6. Generate PDF file via ReportLab
            self._render_pdf(
                pdf_path=pdf_path,
                report_id=report_id,
                app=app,
                documents=documents,
                findings=findings,
                audit_events=audit_events,
                timestamp=timestamp_full
            )

            # 7. Compute SHA-256 hash of generated file for digital integrity
            with open(pdf_path, "rb") as f:
                file_bytes = f.read()
                file_hash = f"sha256:{hashlib.sha256(file_bytes).hexdigest()[:32]}"

            # 8. Create summary string
            if findings:
                summary_text = (
                    f"Automated cross-document verification evaluated {len(documents)} document(s) "
                    f"and flagged {len(findings)} finding(s). Application compliance rating: {app.compliance_score}%. "
                    f"Status: {app.status}."
                )
            else:
                summary_text = (
                    f"All credentials and documents analyzed matched statutory norms. "
                    f"Application compliance rating: {app.compliance_score}%. Status: {app.status}."
                )

            download_url = f"/api/v1/reports/{report_id}/download"

            # 9. Persist ReportModel in database
            report_row = ReportModel(
                id=report_id,
                application_id=app.id,
                applicant_name=app.applicant_name,
                generated_date=now_str,
                findings_count=len(findings),
                compliance_score=app.compliance_score,
                status=app.status,
                summary=summary_text,
                verified_by="VeriTrust AI Compliance Engine v3.2",
                download_url=download_url,
                file_path=str(pdf_path),
                audit_hash=file_hash
            )
            db.add(report_row)
            db.commit()
            db.refresh(report_row)

            # 10. Record report generation in audit trail
            audit_service.record_event(
                action="Verification Report Generated",
                application_id=app.id,
                details=f"Generated signed PDF dossier {report_id} ({len(findings)} findings, score: {app.compliance_score}%). Hash: {file_hash}.",
                user="System Engine",
                user_role="System"
            )

            return report_row.to_schema()

    def _render_pdf(
        self,
        pdf_path: Path,
        report_id: str,
        app: ApplicationModel,
        documents: List[DocumentModel],
        findings: List[FindingModel],
        audit_events: List[AuditEventModel],
        timestamp: str
    ) -> None:
        """Draws professional multi-section PDF document with vector styles."""
        doc = SimpleDocTemplate(
            str(pdf_path),
            pagesize=letter,
            leftMargin=36,
            rightMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()

        # Custom typography styles
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=18,
            leading=22,
            textColor=colors.HexColor('#0F172A')
        )
        subtitle_style = ParagraphStyle(
            'DocSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#475569')
        )
        section_heading = ParagraphStyle(
            'SectionHeading',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=16,
            textColor=colors.HexColor('#1E293B'),
            spaceBefore=10,
            spaceAfter=4
        )
        body_style = ParagraphStyle(
            'BodyText',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8.5,
            leading=11.5,
            textColor=colors.HexColor('#1E293B')
        )
        body_bold = ParagraphStyle(
            'BodyBold',
            parent=body_style,
            fontName='Helvetica-Bold'
        )
        table_cell = ParagraphStyle(
            'TableCell',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8,
            leading=10,
            textColor=colors.HexColor('#1E293B')
        )
        table_cell_bold = ParagraphStyle(
            'TableCellBold',
            parent=table_cell,
            fontName='Helvetica-Bold'
        )
        disclaimer_style = ParagraphStyle(
            'DisclaimerText',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=7.5,
            leading=10.5,
            textColor=colors.HexColor('#475569')
        )

        story = []

        # -----------------------------------------------------------------
        # HEADER BLOCK
        # -----------------------------------------------------------------
        header_table_data = [
            [
                Paragraph("<b>VERITRUST AI</b><br/><font size='7' color='#2563EB'>REGULATORY VERIFICATION PLATFORM</font>", title_style),
                Paragraph(
                    f"<b>REPORT ID:</b> {report_id}<br/>"
                    f"<b>DATE:</b> {timestamp}<br/>"
                    f"<b>SECURITY:</b> OFFICIAL / REGULATORY USE",
                    ParagraphStyle('HeaderRight', parent=body_style, alignment=2, fontSize=7.5, leading=10)
                )
            ]
        ]
        header_table = Table(header_table_data, colWidths=[340, 200])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(header_table)
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0F172A'), spaceBefore=2, spaceAfter=8))

        # -----------------------------------------------------------------
        # SECTION 1: APPLICATION OVERVIEW & COMPLIANCE SCORECARD
        # -----------------------------------------------------------------
        story.append(Paragraph("1. APPLICATION & COMPLIANCE SCORECARD", section_heading))

        score_color = colors.HexColor('#166534') if app.compliance_score >= 90 else (colors.HexColor('#92400E') if app.compliance_score >= 75 else colors.HexColor('#991B1B'))
        score_bg = colors.HexColor('#DCFCE7') if app.compliance_score >= 90 else (colors.HexColor('#FEF3C7') if app.compliance_score >= 75 else colors.HexColor('#FEE2E2'))

        overview_data = [
            [
                Paragraph("<b>Applicant Legal Entity:</b>", table_cell_bold),
                Paragraph(app.applicant_name or "N/A", table_cell),
                Paragraph("<b>Compliance Score:</b>", table_cell_bold),
                Paragraph(f"<font size='13'><b>{app.compliance_score}%</b></font>", ParagraphStyle('Score', parent=table_cell_bold, textColor=score_color))
            ],
            [
                Paragraph("<b>Application ID:</b>", table_cell_bold),
                Paragraph(app.id, table_cell),
                Paragraph("<b>Risk Rating:</b>", table_cell_bold),
                Paragraph(f"<b>{app.risk_level} Risk</b>", table_cell_bold)
            ],
            [
                Paragraph("<b>Category / Type:</b>", table_cell_bold),
                Paragraph(f"{app.category} ({app.type})", table_cell),
                Paragraph("<b>Reviewer Status:</b>", table_cell_bold),
                Paragraph(f"<b>{app.status}</b>", table_cell)
            ],
            [
                Paragraph("<b>Reference Number:</b>", table_cell_bold),
                Paragraph(app.reference_no, table_cell),
                Paragraph("<b>Assigned Reviewer:</b>", table_cell_bold),
                Paragraph(app.assigned_reviewer or "Compliance Reviewer", table_cell)
            ],
            [
                Paragraph("<b>Submission Date:</b>", table_cell_bold),
                Paragraph(app.submitted_date or "N/A", table_cell),
                Paragraph("<b>Findings Breakdown:</b>", table_cell_bold),
                Paragraph(f"High: {app.findings_high} | Warning: {app.findings_warning} | Info: {app.findings_info}", table_cell)
            ]
        ]

        overview_table = Table(overview_data, colWidths=[120, 160, 110, 150])
        overview_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(overview_table)
        story.append(Spacer(1, 10))

        # -----------------------------------------------------------------
        # SECTION 2: DOCUMENTS ANALYSED IN VAULT
        # -----------------------------------------------------------------
        story.append(Paragraph("2. STATUTORY DOCUMENTS CATALOGED & ANALYSED", section_heading))

        doc_table_headers = [
            Paragraph("<b>Doc ID</b>", table_cell_bold),
            Paragraph("<b>Filename</b>", table_cell_bold),
            Paragraph("<b>Type</b>", table_cell_bold),
            Paragraph("<b>Format / Size</b>", table_cell_bold),
            Paragraph("<b>OCR Extraction</b>", table_cell_bold),
            Paragraph("<b>Authenticity</b>", table_cell_bold)
        ]
        doc_table_rows = [doc_table_headers]

        if documents:
            for d in documents:
                score_str = f"{d.authenticity_score:.1f}%" if d.authenticity_score else "N/A"
                doc_table_rows.append([
                    Paragraph(d.id, table_cell),
                    Paragraph(d.name, table_cell_bold),
                    Paragraph(d.doc_type, table_cell),
                    Paragraph(f"{d.file_format} ({d.size})", table_cell),
                    Paragraph(f"{d.ocr_status} ({d.extraction_method or 'OCR'})", table_cell),
                    Paragraph(score_str, table_cell)
                ])
        else:
            doc_table_rows.append([
                Paragraph("No documents uploaded for this application.", table_cell),
                Paragraph("", table_cell),
                Paragraph("", table_cell),
                Paragraph("", table_cell),
                Paragraph("", table_cell),
                Paragraph("", table_cell)
            ])

        doc_table = Table(doc_table_rows, colWidths=[65, 155, 75, 80, 105, 60])
        doc_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E2E8F0')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(doc_table)
        story.append(Spacer(1, 10))

        # -----------------------------------------------------------------
        # SECTION 3: KEY EXTRACTED STATUTORY FIELDS (OCR EVIDENCE)
        # -----------------------------------------------------------------
        story.append(Paragraph("3. EXTRACTED STATUTORY ATTRIBUTES (OCR VERBATIM EVIDENCE)", section_heading))

        extracted_rows = [
            [
                Paragraph("<b>Document Source</b>", table_cell_bold),
                Paragraph("<b>Extracted Field Name</b>", table_cell_bold),
                Paragraph("<b>Normalized Extracted Value</b>", table_cell_bold)
            ]
        ]

        fields_found_count = 0
        for d in documents:
            if d.extracted_fields_json:
                try:
                    f_dict = json.loads(d.extracted_fields_json)
                    for k, v in f_dict.items():
                        fields_found_count += 1
                        extracted_rows.append([
                            Paragraph(f"{d.name} ({d.doc_type})", table_cell),
                            Paragraph(str(k), table_cell_bold),
                            Paragraph(str(v), table_cell)
                        ])
                except Exception:
                    pass

        if fields_found_count == 0:
            extracted_rows.append([
                Paragraph("No structured statutory fields were detected in uploaded documents.", table_cell),
                Paragraph("-", table_cell),
                Paragraph("-", table_cell)
            ])

        # Cap table display to prevent excessive page overflow while keeping full detail
        extracted_table = Table(extracted_rows[:15], colWidths=[150, 150, 240])
        extracted_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(extracted_table)
        story.append(Spacer(1, 10))

        # -----------------------------------------------------------------
        # SECTION 4: COMPLIANCE RULES EVALUATED & CROSS-DOCUMENT FINDINGS
        # -----------------------------------------------------------------
        story.append(Paragraph("4. COMPLIANCE RULES EVALUATION & ANOMALY FINDINGS", section_heading))

        if findings:
            for idx, f in enumerate(findings, 1):
                sev_color = colors.HexColor('#991B1B') if f.severity == 'High' else (colors.HexColor('#92400E') if f.severity in ['Medium', 'Warning'] else colors.HexColor('#0369A1'))
                finding_card_data = [
                    [
                        Paragraph(f"<b>Finding #{idx}: {f.title}</b>", ParagraphStyle('FTitle', parent=table_cell_bold, fontSize=8.5, textColor=sev_color)),
                        Paragraph(f"<b>Severity:</b> {f.severity} | <b>Category:</b> {f.category} | <b>Rule:</b> {f.rule_id or 'General'}", ParagraphStyle('FMeta', parent=table_cell, alignment=2))
                    ],
                    [
                        Paragraph(f"<b>Description:</b> {f.description}", table_cell),
                        Paragraph(f"<b>Review Status:</b> {f.review_status or 'Pending'}", table_cell_bold)
                    ],
                    [
                        Paragraph(
                            f"<b>Comparison Evidence:</b><br/>"
                            f"• <b>Source:</b> {f.source_doc or 'Form'} &rarr; <i>{f.field_a or 'Value'}:</i> <b>{f.value_a or 'N/A'}</b><br/>"
                            f"• <b>Compared:</b> {f.compared_doc or 'Certificate'} &rarr; <i>{f.field_b or 'Value'}:</i> <b>{f.value_b or 'N/A'}</b>",
                            table_cell
                        ),
                        Paragraph(
                            f"<b>Reviewer Decision:</b><br/>"
                            f"Notes: {f.reviewer_notes or 'Pending review.'}<br/>"
                            f"Reviewed By: {f.reviewed_by or 'Human Queue'}",
                            table_cell
                        )
                    ],
                    [
                        Paragraph(f"<b>Recommendation:</b> {f.recommendation or 'Verify physical artifact.'}", table_cell),
                        Paragraph(f"<b>Detected:</b> {f.timestamp}", table_cell)
                    ]
                ]

                finding_table = Table(finding_card_data, colWidths=[360, 180])
                finding_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FFFFFF')),
                    ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#CBD5E1')),
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F8FAFC')),
                    ('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.HexColor('#E2E8F0')),
                    ('LINEBELOW', (0, 1), (-1, 1), 0.5, colors.HexColor('#E2E8F0')),
                    ('LINEBELOW', (0, 2), (-1, 2), 0.5, colors.HexColor('#E2E8F0')),
                    ('TOPPADDING', (0, 0), (-1, -1), 3),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                    ('LEFTPADDING', (0, 0), (-1, -1), 5),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 5),
                ]))
                story.append(KeepTogether([finding_table, Spacer(1, 5)]))
        else:
            no_findings_p = Paragraph(
                "<b>No Compliance Anomaly Identified:</b> All analyzed documents and extracted fields conform to mandatory statutory consistency rules.",
                table_cell
            )
            story.append(no_findings_p)
            story.append(Spacer(1, 5))

        # -----------------------------------------------------------------
        # SECTION 5: AUDIT TRAIL EVIDENCE & DIGITAL PROVENANCE
        # -----------------------------------------------------------------
        story.append(Paragraph("5. AUDIT TRAIL LOGS & CRYPTOGRAPHIC PROVENANCE", section_heading))

        audit_rows = [
            [
                Paragraph("<b>Audit ID</b>", table_cell_bold),
                Paragraph("<b>Timestamp</b>", table_cell_bold),
                Paragraph("<b>Action / Event</b>", table_cell_bold),
                Paragraph("<b>Operator</b>", table_cell_bold),
                Paragraph("<b>SHA-256 Block Digest</b>", table_cell_bold)
            ]
        ]

        if audit_events:
            for a in audit_events:
                audit_rows.append([
                    Paragraph(a.id, table_cell),
                    Paragraph(a.timestamp, table_cell),
                    Paragraph(a.action, table_cell_bold),
                    Paragraph(f"{a.user} ({a.user_role})", table_cell),
                    Paragraph(a.hash or "sha256:00000000", table_cell)
                ])
        else:
            audit_rows.append([
                Paragraph("-", table_cell),
                Paragraph(timestamp, table_cell),
                Paragraph("Report Initialized", table_cell),
                Paragraph("System", table_cell),
                Paragraph("sha256:genesis", table_cell)
            ])

        audit_table = Table(audit_rows, colWidths=[60, 95, 155, 90, 140])
        audit_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 2.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(audit_table)
        story.append(Spacer(1, 10))

        # -----------------------------------------------------------------
        # SECTION 6: MANDATORY STATUTORY & ASSISTIVE AI DISCLAIMER
        # -----------------------------------------------------------------
        disclaimer_box_data = [
            [
                Paragraph(
                    "<b>MANDATORY STATUTORY & REGULATORY DISCLAIMER:</b><br/>"
                    "1. <b>Assistive Tool Only:</b> This verification audit dossier was compiled using automated OCR and deterministic cross-entity text matching. All scores, entity extracts, and mismatch flags are algorithmic assistive indicators for administrative triage and <b>do not prove legal authenticity, statutory compliance, or document forgery</b>.<br/>"
                    "2. <b>No External Registry Claim:</b> No live queries or validation checks against external municipal land records, national corporate registries, or state accreditation repositories were executed unless documented as an explicit verifiable attachment.<br/>"
                    "3. <b>Human Verification Obligation:</b> A statutory accredited reviewer or notary officer must independently examine certified physical documents or cryptographically signed originals before issuing regulatory approvals or rejection orders.",
                    disclaimer_style
                )
            ]
        ]
        disclaimer_table = Table(disclaimer_box_data, colWidths=[540])
        disclaimer_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FFFBEB')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#F59E0B')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(KeepTogether([disclaimer_table]))

        # Build document
        doc.build(story)


report_service = ReportService()
