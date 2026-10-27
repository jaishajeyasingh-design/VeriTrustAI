from typing import List, Dict
from backend.app.schemas.application import ApplicationResponse, TimelineItem, FindingsCount
from backend.app.schemas.document import DocumentItem
from backend.app.schemas.finding import VerificationFinding

SEED_DOCUMENTS: List[DocumentItem] = [
    DocumentItem(
        id="DOC-1001",
        name="Application_Form.pdf",
        type="Application",
        size="2.4 MB",
        applicationId="APP2026001",
        uploadedDate="28-Oct-26",
        status="Processed",
        ocrStatus="Completed",
        fileFormat="PDF",
        authenticityScore=99.2,
        extractedFields={
            "Applicant Legal Name": "ABC College of Engineering & Tech",
            "Registration Number": "REG1324",
            "Established Year": "2004",
            "Campus Land Area": "12.4 Acres",
            "Head of Institute": "Dr. S. K. Ramanathan",
            "Annual Intake Capacity": "420 Students"
        }
    ),
    DocumentItem(
        id="DOC-1002",
        name="Registration_Certificate.jpg",
        type="Certificate",
        size="1.8 MB",
        applicationId="APP2026001",
        uploadedDate="28-Oct-26",
        status="Processed",
        ocrStatus="Completed",
        fileFormat="JPG",
        authenticityScore=94.6,
        extractedFields={
            "Certificate ID": "CERT/REG/9821",
            "Issued Name": "ABC College of Engineering",
            "Registration Number": "REG1029",  # Simulated mismatch with form REG1324
            "Issuing Authority": "State Directorate of Technical Education",
            "Issue Date": "14-May-2004"
        }
    ),
    DocumentItem(
        id="DOC-1003",
        name="Affidavit.pdf",
        type="Affidavit",
        size="1.2 MB",
        applicationId="APP2026001",
        uploadedDate="28-Oct-26",
        status="Processed",
        ocrStatus="Completed",
        fileFormat="PDF",
        authenticityScore=98.1,
        extractedFields={
            "Notary Seal Verified": "True",
            "Stamp Paper No": "ST-492019-IN",
            "Deponent Name": "Dr. S. K. Ramanathan"
        }
    ),
    DocumentItem(
        id="DOC-1006",
        name="Fire_Safety_NOC.pdf",
        type="NOC",
        size="1.6 MB",
        applicationId="APP2026001",
        uploadedDate="28-Oct-26",
        status="Processed",
        ocrStatus="Flagged",
        fileFormat="PDF",
        authenticityScore=82.4,
        extractedFields={
            "Issuing Station": "District Fire Service HQ",
            "Validity Period": "Expires in 14 days (Renewal Required)"
        }
    )
]

SEED_APPLICATIONS: List[ApplicationResponse] = [
    ApplicationResponse(
        id="APP2026001",
        title="AICTE Approval Application",
        applicantName="ABC College of Engineering",
        type="Institutional",
        category="Institutional Approval",
        referenceNo="AICTE/APP/2026/1024",
        submittedDate="28-Oct-26",
        lastUpdated="28-Oct-26 10:34 AM",
        documentsCount=4,
        status="Needs Review",
        priority="High",
        riskLevel="High",
        assignedReviewer="Compliance Reviewer",
        contactEmail="registrar@abccollege.edu.in",
        contactPhone="+91 80 2345 6789",
        complianceScore=74,
        findingsCount=FindingsCount(high=2, warning=1, info=3),
        documents=SEED_DOCUMENTS,
        findings=[
            VerificationFinding(
                id="FIND-001",
                title="Registration Number Mismatch",
                severity="High",
                category="Mismatch",
                description="The institution registration number in the Application Form does not match the State Registration Certificate.",
                sourceDoc="Application_Form.pdf",
                fieldA="Registration Number (Form)",
                valueA="REG1324",
                comparedDoc="Registration_Certificate.jpg",
                fieldB="Registration Number (Certificate)",
                valueB="REG1029",
                recommendation="Request official clarifying affidavit or verify against State Portal Registry records."
            ),
            VerificationFinding(
                id="FIND-002",
                title="Institution Legal Name Slight Deviation",
                severity="High",
                category="Mismatch",
                description='Application states "ABC College of Engineering & Tech" while certificate states "ABC College of Engineering".',
                sourceDoc="Application_Form.pdf",
                fieldA="Institution Name",
                valueA="ABC College of Engineering & Tech",
                comparedDoc="Registration_Certificate.jpg",
                fieldB="Certificate Name",
                valueB="ABC College of Engineering",
                recommendation="Check whether a formal gazette name change amendment was appended."
            ),
            VerificationFinding(
                id="FIND-003",
                title="Fire Safety NOC Approaching Expiry",
                severity="Warning",
                category="Validity",
                description="Fire & Rescue Services clearance certificate expires within 14 calendar days.",
                sourceDoc="Fire_Safety_NOC.pdf",
                fieldA="Expiration Window",
                valueA="14 Days remaining",
                recommendation="Require applicant to provide receipt of renewal application before granting final clearance."
            )
        ],
        timeline=[
            TimelineItem(step="Application Submitted", timestamp="28-Oct-26 09:15 AM", status="completed", details="Submitted via applicant portal by Registrar"),
            TimelineItem(step="Document Ingestion & OCR", timestamp="28-Oct-26 09:22 AM", status="completed", details="Extracted key fields across statutory documents"),
            TimelineItem(step="Automated Regulatory Cross-Check", timestamp="28-Oct-26 09:30 AM", status="completed", details="Simulated compliance rules flagged 2 anomalies"),
            TimelineItem(step="Assigned to Reviewer", timestamp="28-Oct-26 10:15 AM", status="current", details="Under assessment by Compliance Reviewer"),
            TimelineItem(step="Final Regulatory Decision", timestamp="Pending", status="pending", details="Awaiting reviewer sign-off")
        ]
    ),
    ApplicationResponse(
        id="APP2026002",
        title="University Affiliation Renewal",
        applicantName="XYZ Institute of Technology",
        type="Affiliation",
        category="University Affiliation",
        referenceNo="UGC/AFF/2026/8940",
        submittedDate="27-Oct-26",
        lastUpdated="27-Oct-26 04:12 PM",
        documentsCount=4,
        status="Verified",
        priority="Low",
        riskLevel="Low",
        assignedReviewer="Senior Officer Patel",
        contactEmail="director@xyzinstitute.ac.in",
        contactPhone="+91 22 2890 1122",
        complianceScore=98,
        findingsCount=FindingsCount(high=0, warning=0, info=4),
        documents=[],
        findings=[],
        timeline=[
            TimelineItem(step="Application Submitted", timestamp="27-Oct-26 11:00 AM", status="completed"),
            TimelineItem(step="Document Ingestion & OCR", timestamp="27-Oct-26 11:15 AM", status="completed"),
            TimelineItem(step="Reviewer Approval", timestamp="27-Oct-26 04:12 PM", status="completed")
        ]
    ),
    ApplicationResponse(
        id="APP2026003",
        title="Course Extension & Intake Expansion",
        applicantName="Sunrise Academy of Sciences",
        type="Affiliation",
        category="Course Extension",
        referenceNo="AICTE/EXT/2026/4011",
        submittedDate="27-Oct-26",
        lastUpdated="27-Oct-26 02:45 PM",
        documentsCount=3,
        status="Pending",
        priority="Medium",
        riskLevel="Medium",
        assignedReviewer="Compliance Reviewer",
        contactEmail="admin@sunriseacademy.org",
        contactPhone="+91 11 4156 7890",
        complianceScore=82,
        findingsCount=FindingsCount(high=0, warning=2, info=1),
        documents=[],
        findings=[],
        timeline=[
            TimelineItem(step="Application Submitted", timestamp="27-Oct-26 01:00 PM", status="completed"),
            TimelineItem(step="Pending Secondary Review", timestamp="27-Oct-26 02:45 PM", status="current")
        ]
    ),
    ApplicationResponse(
        id="APP2026004",
        title="New Campus Expansion Clearance",
        applicantName="Global Tech Polytechnic",
        type="Extension",
        category="Campus Expansion",
        referenceNo="AICTE/CAMP/2026/092",
        submittedDate="26-Oct-26",
        lastUpdated="26-Oct-26 05:20 PM",
        documentsCount=5,
        status="Needs Review",
        priority="High",
        riskLevel="High",
        assignedReviewer="Dr. M. K. Rao",
        contactEmail="principal@globaltechpoly.in",
        contactPhone="+91 44 2234 5678",
        complianceScore=68,
        findingsCount=FindingsCount(high=3, warning=1, info=2),
        documents=[],
        findings=[],
        timeline=[
            TimelineItem(step="Application Submitted", timestamp="26-Oct-26 03:00 PM", status="completed"),
            TimelineItem(step="Needs Review", timestamp="26-Oct-26 05:20 PM", status="current")
        ]
    ),
    ApplicationResponse(
        id="APP2026005",
        title="Deemed University Recognition",
        applicantName="Modern College of Pharmacy",
        type="Institutional",
        category="Institutional Approval",
        referenceNo="PCI/INS/2026/778",
        submittedDate="25-Oct-26",
        lastUpdated="25-Oct-26 06:00 PM",
        documentsCount=4,
        status="Rejected",
        priority="High",
        riskLevel="High",
        assignedReviewer="Dr. M. K. Rao",
        contactEmail="dean@modernpharmacy.edu",
        contactPhone="+91 20 2567 8901",
        complianceScore=42,
        findingsCount=FindingsCount(high=4, warning=2, info=0),
        documents=[],
        findings=[],
        timeline=[
            TimelineItem(step="Application Submitted", timestamp="25-Oct-26 10:00 AM", status="completed"),
            TimelineItem(step="Rejected for Altered Land Title Deed", timestamp="25-Oct-26 06:00 PM", status="completed")
        ]
    ),
    ApplicationResponse(
        id="APP2026006",
        title="Postgraduate Program Accreditation",
        applicantName="Apex Institute of Business Studies",
        type="Accreditation",
        category="Accreditation Renewal",
        referenceNo="NBA/ACC/2026/5120",
        submittedDate="24-Oct-26",
        lastUpdated="24-Oct-26 03:10 PM",
        documentsCount=6,
        status="Verified",
        priority="Low",
        riskLevel="Low",
        assignedReviewer="Senior Officer Patel",
        contactEmail="dean.academics@apexbusiness.org",
        contactPhone="+91 120 4987 654",
        complianceScore=95,
        findingsCount=FindingsCount(high=0, warning=1, info=5),
        documents=[],
        findings=[],
        timeline=[]
    )
]
