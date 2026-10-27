const SEED_RULES = [
  {
    id: "R001",
    name: "Required document missing",
    category: "General",
    description: "Enforces presence of all mandatory statutory documents based on the approval category.",
    severity: "High",
    enabled: true,
    affectedFields: ["Affidavit", "Registration Certificate", "Application"],
    lastTriggered: "28-Oct-26 10:30 AM"
  },
  {
    id: "R002",
    name: "Applicant name mismatch",
    category: "Data Check",
    description: "Compares applicant name across Application Form, Pan Card, Land Deed and Registration Certificate with phonetic and fuzzy tolerance.",
    severity: "High",
    enabled: true,
    affectedFields: ["Applicant Name", "Trust / Society Name"],
    lastTriggered: "28-Oct-26 10:34 AM"
  },
  {
    id: "R003",
    name: "Date inconsistency",
    category: "Data Check",
    description: "Ensures certificates and affidavits precede submission date and have not expired or predated legal incorporation.",
    severity: "Medium",
    enabled: true,
    affectedFields: ["Issue Date", "Validity Period", "Submission Date"],
    lastTriggered: "27-Oct-26 02:45 PM"
  },
  {
    id: "R004",
    name: "Expired document",
    category: "Document",
    description: "Verifies that clearances (e.g. Fire NOC, Building Safety Certificate) have a valid validity horizon of at least 90 days.",
    severity: "Medium",
    enabled: true,
    affectedFields: ["NOC Validity", "Pollution Control Clearance"],
    lastTriggered: "28-Oct-26 10:32 AM"
  },
  {
    id: "R005",
    name: "Required field missing",
    category: "Field Validation",
    description: "Validates that high-order schema fields (e.g. Pin code, PAN, Society Registration Number) are not left blank.",
    severity: "High",
    enabled: true,
    affectedFields: ["Registration Number", "Land Area Sq. Meters"],
    lastTriggered: "26-Oct-26 05:20 PM"
  },
  {
    id: "R006",
    name: "Jurisdiction & Zoning conflict",
    category: "Jurisdiction",
    description: "Ensures municipal clearance matches state land revenue records and regional AICTE council boundary.",
    severity: "Low",
    enabled: false,
    affectedFields: ["District", "Revenue Survey Number"],
    lastTriggered: "24-Oct-26 09:12 AM"
  },
  {
    id: "R007",
    name: "Registration number mismatch",
    category: "Data Check",
    description: "Detects cross-document divergence in statutory registration and accreditation numbers between the application dossier and certificate of incorporation.",
    severity: "High",
    enabled: true,
    affectedFields: ["Registration Number", "Certificate ID"],
    lastTriggered: "28-Oct-26 10:34 AM"
  }
];

const SEED_DOCUMENTS = [
  {
    id: "DOC-1001",
    name: "Application_Form.pdf",
    type: "Application",
    size: "2.4 MB",
    applicationId: "APP2026001",
    uploadedDate: "28-Oct-26",
    status: "Processed",
    ocrStatus: "Completed",
    fileFormat: "PDF",
    authenticityScore: 99.2,
    extractedFields: {
      "Applicant Legal Name": "ABC College of Engineering & Tech",
      "Registration Number": "REG1324",
      "Established Year": "2004",
      "Campus Land Area": "12.4 Acres",
      "Head of Institute": "Dr. S. K. Ramanathan",
      "Annual Intake Capacity": "420 Students"
    }
  },
  {
    id: "DOC-1002",
    name: "Registration_Certificate.jpg",
    type: "Certificate",
    size: "1.8 MB",
    applicationId: "APP2026001",
    uploadedDate: "28-Oct-26",
    status: "Processed",
    ocrStatus: "Completed",
    fileFormat: "JPG",
    authenticityScore: 94.6,
    extractedFields: {
      "Certificate ID": "CERT/REG/9821",
      "Issued Name": "ABC College of Engineering",
      "Registration Number": "REG1029",
      "Issuing Authority": "State Directorate of Technical Education",
      "Issue Date": "14-May-2004"
    }
  },
  {
    id: "DOC-1003",
    name: "Affidavit.pdf",
    type: "Affidavit",
    size: "1.2 MB",
    applicationId: "APP2026001",
    uploadedDate: "28-Oct-26",
    status: "Processed",
    ocrStatus: "Completed",
    fileFormat: "PDF",
    authenticityScore: 98.1,
    extractedFields: {
      "Notary Seal Verified": "True",
      "Stamp Paper No": "ST-492019-IN",
      "Deponent Name": "Dr. S. K. Ramanathan"
    }
  },
  {
    id: "DOC-1006",
    name: "Fire_Safety_NOC.pdf",
    type: "NOC",
    size: "1.6 MB",
    applicationId: "APP2026001",
    uploadedDate: "28-Oct-26",
    status: "Processed",
    ocrStatus: "Flagged",
    fileFormat: "PDF",
    authenticityScore: 82.4,
    extractedFields: {
      "Issuing Station": "District Fire Service HQ",
      "Validity Period": "Expires in 14 days (Renewal Required)"
    }
  }
];

const SEED_FINDINGS = [
  {
    id: "FIND-001",
    applicationId: "APP2026001",
    ruleId: "R007",
    title: "Registration Number Mismatch",
    severity: "High",
    category: "Mismatch",
    description: "The institution registration number in the Application Form does not match the State Registration Certificate.",
    fieldName: "Registration Number",
    sourceDoc: "Application_Form.pdf",
    sourceDocId: "DOC-1001",
    fieldA: "Registration Number (Form)",
    valueA: "REG1324",
    comparedDoc: "Registration_Certificate.jpg",
    comparedDocId: "DOC-1002",
    fieldB: "Registration Number (Certificate)",
    valueB: "REG1029",
    comparisonResult: "Divergence between form and certificate records",
    evidenceReferences: ["Application_Form.pdf: Section 1.2", "Registration_Certificate.jpg: Header"],
    recommendation: "Request official clarifying affidavit or verify against State Portal Registry records.",
    reviewStatus: "Pending"
  },
  {
    id: "FIND-002",
    applicationId: "APP2026001",
    ruleId: "R002",
    title: "Institution Legal Name Slight Deviation",
    severity: "High",
    category: "Mismatch",
    description: 'Application states "ABC College of Engineering & Tech" while certificate states "ABC College of Engineering".',
    fieldName: "Institution Name",
    sourceDoc: "Application_Form.pdf",
    sourceDocId: "DOC-1001",
    fieldA: "Institution Name",
    valueA: "ABC College of Engineering & Tech",
    comparedDoc: "Registration_Certificate.jpg",
    comparedDocId: "DOC-1002",
    fieldB: "Certificate Name",
    valueB: "ABC College of Engineering",
    comparisonResult: "Minor abbreviation divergence: '& Tech' appended",
    evidenceReferences: ["Application_Form.pdf: Header", "Registration_Certificate.jpg: Line 3"],
    recommendation: "Check whether a formal gazette name change amendment was appended.",
    reviewStatus: "Pending"
  },
  {
    id: "FIND-003",
    applicationId: "APP2026001",
    ruleId: "R004",
    title: "Fire Safety NOC Approaching Expiry",
    severity: "Warning",
    category: "Validity",
    description: "Fire & Rescue Services clearance certificate expires within 14 calendar days.",
    fieldName: "Validity Period",
    sourceDoc: "Fire_Safety_NOC.pdf",
    sourceDocId: "DOC-1006",
    fieldA: "Expiration Window",
    valueA: "14 Days remaining",
    recommendation: "Require applicant to provide receipt of renewal application before granting final clearance.",
    reviewStatus: "Pending"
  }
];

const SEED_APPLICATIONS = [
  {
    id: "APP2026001",
    title: "AICTE Approval Application",
    applicantName: "ABC College of Engineering",
    type: "Institutional",
    category: "Institutional Approval",
    referenceNo: "AICTE/APP/2026/1024",
    submittedDate: "28-Oct-26",
    lastUpdated: "28-Oct-26 10:34 AM",
    documentsCount: 4,
    status: "Needs Review",
    priority: "High",
    riskLevel: "High",
    assignedReviewer: "Compliance Reviewer",
    contactEmail: "registrar@abccollege.edu.in",
    contactPhone: "+91 80 2345 6789",
    complianceScore: 74,
    findingsCount: { high: 2, warning: 1, info: 3 },
    timeline: [
      { step: "Application Submitted", timestamp: "28-Oct-26 09:15 AM", status: "completed", details: "Submitted via applicant portal by Registrar" },
      { step: "Document Ingestion & OCR", timestamp: "28-Oct-26 09:22 AM", status: "completed", details: "Extracted key fields across statutory documents" },
      { step: "Automated Regulatory Cross-Check", timestamp: "28-Oct-26 09:30 AM", status: "completed", details: "Simulated compliance rules flagged 2 anomalies" },
      { step: "Assigned to Reviewer", timestamp: "28-Oct-26 10:15 AM", status: "current", details: "Under assessment by Compliance Reviewer" },
      { step: "Final Regulatory Decision", timestamp: "Pending", status: "pending", details: "Awaiting reviewer sign-off" }
    ]
  },
  {
    id: "APP2026002",
    title: "University Affiliation Renewal",
    applicantName: "XYZ Institute of Technology",
    type: "Affiliation",
    category: "University Affiliation",
    referenceNo: "UGC/AFF/2026/8940",
    submittedDate: "27-Oct-26",
    lastUpdated: "27-Oct-26 04:12 PM",
    documentsCount: 4,
    status: "Verified",
    priority: "Low",
    riskLevel: "Low",
    assignedReviewer: "Senior Officer Patel",
    contactEmail: "director@xyzinstitute.ac.in",
    contactPhone: "+91 22 2890 1122",
    complianceScore: 98,
    findingsCount: { high: 0, warning: 0, info: 4 },
    timeline: [
      { step: "Application Submitted", timestamp: "27-Oct-26 11:00 AM", status: "completed" },
      { step: "Document Ingestion & OCR", timestamp: "27-Oct-26 11:15 AM", status: "completed" },
      { step: "Reviewer Approval", timestamp: "27-Oct-26 04:12 PM", status: "completed" }
    ]
  },
  {
    id: "APP2026003",
    title: "Course Extension & Intake Expansion",
    applicantName: "Sunrise Academy of Sciences",
    type: "Affiliation",
    category: "Course Extension",
    referenceNo: "AICTE/EXT/2026/4011",
    submittedDate: "27-Oct-26",
    lastUpdated: "27-Oct-26 02:45 PM",
    documentsCount: 3,
    status: "Pending",
    priority: "Medium",
    riskLevel: "Medium",
    assignedReviewer: "Compliance Reviewer",
    contactEmail: "admin@sunriseacademy.org",
    contactPhone: "+91 11 4156 7890",
    complianceScore: 82,
    findingsCount: { high: 0, warning: 2, info: 1 },
    timeline: [
      { step: "Application Submitted", timestamp: "27-Oct-26 01:00 PM", status: "completed" },
      { step: "Pending Secondary Review", timestamp: "27-Oct-26 02:45 PM", status: "current" }
    ]
  },
  {
    id: "APP2026004",
    title: "New Campus Expansion Clearance",
    applicantName: "Global Tech Polytechnic",
    type: "Extension",
    category: "Campus Expansion",
    referenceNo: "AICTE/CAMP/2026/092",
    submittedDate: "26-Oct-26",
    lastUpdated: "26-Oct-26 05:20 PM",
    documentsCount: 5,
    status: "Needs Review",
    priority: "High",
    riskLevel: "High",
    assignedReviewer: "Dr. M. K. Rao",
    contactEmail: "principal@globaltechpoly.in",
    contactPhone: "+91 44 2234 5678",
    complianceScore: 68,
    findingsCount: { high: 3, warning: 1, info: 2 },
    timeline: [
      { step: "Application Submitted", timestamp: "26-Oct-26 03:00 PM", status: "completed" },
      { step: "Needs Review", timestamp: "26-Oct-26 05:20 PM", status: "current" }
    ]
  },
  {
    id: "APP2026005",
    title: "Deemed University Recognition",
    applicantName: "Modern College of Pharmacy",
    type: "Institutional",
    category: "Institutional Approval",
    referenceNo: "PCI/INS/2026/778",
    submittedDate: "25-Oct-26",
    lastUpdated: "25-Oct-26 06:00 PM",
    documentsCount: 4,
    status: "Rejected",
    priority: "High",
    riskLevel: "High",
    assignedReviewer: "Dr. M. K. Rao",
    contactEmail: "dean@modernpharmacy.edu",
    contactPhone: "+91 20 2567 8901",
    complianceScore: 42,
    findingsCount: { high: 4, warning: 2, info: 0 },
    timeline: [
      { step: "Application Submitted", timestamp: "25-Oct-26 10:00 AM", status: "completed" },
      { step: "Rejected for Altered Land Title Deed", timestamp: "25-Oct-26 06:00 PM", status: "completed" }
    ]
  },
  {
    id: "APP2026006",
    title: "Postgraduate Program Accreditation",
    applicantName: "Apex Institute of Business Studies",
    type: "Accreditation",
    category: "Accreditation Renewal",
    referenceNo: "NBA/ACC/2026/5120",
    submittedDate: "24-Oct-26",
    lastUpdated: "24-Oct-26 03:10 PM",
    documentsCount: 6,
    status: "Verified",
    priority: "Low",
    riskLevel: "Low",
    assignedReviewer: "Senior Officer Patel",
    contactEmail: "dean.academics@apexbusiness.org",
    contactPhone: "+91 120 4987 654",
    complianceScore: 95,
    findingsCount: { high: 0, warning: 1, info: 5 },
    timeline: []
  }
];

const SEED_AUDIT = [
  {
    id: "AUD-991",
    timestamp: "28-Oct-26 10:34 AM",
    user: "Compliance Reviewer",
    userRole: "reviewer",
    action: "Verification Completed",
    applicationId: "APP2026001",
    details: "Simulated verification results generated. Cross-document comparison flagged 2 mismatches.",
    prevHash: "sha256:7b1a9e33c4d5f6a89012bcde3456789",
    hash: "sha256:8f4c2e19b0d1a4e76317bcde89a241e"
  },
  {
    id: "AUD-990",
    timestamp: "28-Oct-26 10:30 AM",
    user: "System Engine",
    userRole: "System",
    action: "Document Processed",
    applicationId: "APP2026001",
    details: "OCR extraction completed for Application_Form.pdf (Confidence: 99.2%).",
    prevHash: "sha256:9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4",
    hash: "sha256:7b1a9e33c4d5f6a89012bcde3456789"
  },
  {
    id: "AUD-987",
    timestamp: "27-Oct-26 04:12 PM",
    user: "Senior Officer Patel",
    userRole: "reviewer",
    action: "Application Approved",
    applicationId: "APP2026002",
    details: "Approval granted for University Affiliation Renewal. Regulatory compliance rating 98%.",
    prevHash: null,
    hash: "sha256:9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4"
  }
];

const SEED_REPORTS = [
  {
    id: "REP2026001",
    applicationId: "APP2026001",
    applicantName: "ABC College of Engineering",
    generatedDate: "28-Oct-26",
    findingsCount: 3,
    complianceScore: 74,
    status: "Needs Review",
    summary: "Cross-document OCR detected registration number divergence between Form (REG1324) and Certificate (REG1029). NOC requires renewal within 14 days.",
    verifiedBy: "VeriTrust AI Compliance Engine v3.2 (MERN Edition)",
    downloadUrl: "/api/v1/reports/REP2026001/download"
  },
  {
    id: "REP2026002",
    applicationId: "APP2026002",
    applicantName: "XYZ Institute of Technology",
    generatedDate: "27-Oct-26",
    findingsCount: 1,
    complianceScore: 98,
    status: "Verified",
    summary: "All credentials, digital signatures, land encumbrance certificates and state board resolutions match statutory norms.",
    verifiedBy: "VeriTrust AI Compliance Engine v3.2 (MERN Edition)",
    downloadUrl: "/api/v1/reports/REP2026002/download"
  }
];

module.exports = {
  SEED_RULES,
  SEED_DOCUMENTS,
  SEED_FINDINGS,
  SEED_APPLICATIONS,
  SEED_AUDIT,
  SEED_REPORTS
};
