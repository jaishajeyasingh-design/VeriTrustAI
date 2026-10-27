import type { Application, ComplianceRule, VerificationReport, AuditEvent, UserProfile, DocumentItem } from '../types';

export const initialUserProfile: UserProfile = {
  name: 'Compliance Reviewer',
  role: 'reviewer',
  roleLabel: 'Senior Compliance Officer',
  email: 'reviewer@veritrust.in',
  department: 'Higher Education Regulatory Audit',
  phone: '+91 98765 43210',
  organization: 'AICTE (Regulatory Authority Demo)',
  timezone: 'Asia/Kolkata (IST)',
  notifications: {
    emailNotifications: true,
    reviewAlerts: true,
    weeklySummary: false,
    slackAlerts: true,
  },
};

export const initialDocuments: DocumentItem[] = [
  {
    id: 'DOC-1001',
    name: 'Application_Form.pdf',
    type: 'Application',
    size: '2.4 MB',
    applicationId: 'APP2026001',
    uploadedDate: '28-Oct-26',
    status: 'Processed',
    ocrStatus: 'Completed',
    fileFormat: 'PDF',
    authenticityScore: 99.2,
    extractedFields: {
      'Applicant Legal Name': 'ABC College of Engineering & Tech',
      'Registration Number': 'REG1324',
      'Established Year': '2004',
      'Campus Land Area': '12.4 Acres',
      'Head of Institute': 'Dr. S. K. Ramanathan',
      'Annual Intake Capacity': '420 Students'
    }
  },
  {
    id: 'DOC-1002',
    name: 'Registration_Certificate.jpg',
    type: 'Certificate',
    size: '1.8 MB',
    applicationId: 'APP2026001',
    uploadedDate: '28-Oct-26',
    status: 'Processed',
    ocrStatus: 'Completed',
    fileFormat: 'JPG',
    authenticityScore: 94.6,
    extractedFields: {
      'Certificate ID': 'CERT/REG/9821',
      'Issued Name': 'ABC College of Engineering',
      'Registration Number': 'REG1029', // Intentionally mismatched to demonstrate simulated OCR finding
      'Issuing Authority': 'State Directorate of Technical Education',
      'Issue Date': '14-May-2004'
    }
  },
  {
    id: 'DOC-1003',
    name: 'Affidavit.pdf',
    type: 'Affidavit',
    size: '1.2 MB',
    applicationId: 'APP2026001',
    uploadedDate: '28-Oct-26',
    status: 'Processed',
    ocrStatus: 'Completed',
    fileFormat: 'PDF',
    authenticityScore: 98.1,
    extractedFields: {
      'Notary Seal Verified': 'True',
      'Stamp Paper No': 'ST-492019-IN',
      'Deponent Name': 'Dr. S. K. Ramanathan',
      'Non-encumbrance Clause': 'Satisfied'
    }
  },
  {
    id: 'DOC-1004',
    name: 'IB_Proof.png',
    type: 'Identity',
    size: '890 KB',
    applicationId: 'APP2026002',
    uploadedDate: '27-Oct-26',
    status: 'Processed',
    ocrStatus: 'Completed',
    fileFormat: 'PNG',
    authenticityScore: 99.5,
    extractedFields: {
      'National ID Ref': 'IN-AAD-9041-8910',
      'Authorized Signatory': 'Prof. Ananya Sen'
    }
  },
  {
    id: 'DOC-1005',
    name: 'Approval_Letter.pdf',
    type: 'Approval',
    size: '3.1 MB',
    applicationId: 'APP2026003',
    uploadedDate: '27-Oct-26',
    status: 'Processing',
    ocrStatus: 'In Progress',
    fileFormat: 'PDF',
    authenticityScore: 88.0,
    extractedFields: {
      'Sanction Order': 'ED/2025/APP-310'
    }
  },
  {
    id: 'DOC-1006',
    name: 'Fire_Safety_NOC.pdf',
    type: 'NOC',
    size: '1.6 MB',
    applicationId: 'APP2026001',
    uploadedDate: '28-Oct-26',
    status: 'Processed',
    ocrStatus: 'Flagged',
    fileFormat: 'PDF',
    authenticityScore: 82.4,
    extractedFields: {
      'Issuing Station': 'District Fire Service HQ',
      'Validity Period': 'Expires in 14 days (Renewal Required)'
    }
  },
  {
    id: 'DOC-1007',
    name: 'Audit_Statement_2025.pdf',
    type: 'Financial',
    size: '4.5 MB',
    applicationId: 'APP2026004',
    uploadedDate: '26-Oct-26',
    status: 'Processed',
    ocrStatus: 'Completed',
    fileFormat: 'PDF',
    authenticityScore: 97.8
  }
];

export const initialApplications: Application[] = [
  {
    id: 'APP2026001',
    title: 'AICTE Approval Application',
    applicantName: 'ABC College of Engineering',
    type: 'Institutional',
    category: 'Institutional Approval',
    referenceNo: 'AICTE/APP/2026/1024',
    submittedDate: '28-Oct-26',
    lastUpdated: '28-Oct-26 10:34 AM',
    documentsCount: 5,
    status: 'Needs Review',
    priority: 'High',
    riskLevel: 'High',
    assignedReviewer: 'Compliance Reviewer',
    contactEmail: 'registrar@abccollege.edu.in',
    contactPhone: '+91 80 2345 6789',
    complianceScore: 74,
    findingsCount: {
      high: 2,
      warning: 1,
      info: 3
    },
    documents: [
      initialDocuments[0],
      initialDocuments[1],
      initialDocuments[2],
      initialDocuments[5]
    ],
    findings: [
      {
        id: 'FIND-001',
        title: 'Registration Number Mismatch',
        severity: 'High',
        category: 'Mismatch',
        description: 'The institution registration number in the Application Form does not match the State Registration Certificate.',
        sourceDoc: 'Application_Form.pdf',
        fieldA: 'Registration Number (Form)',
        valueA: 'REG1324',
        comparedDoc: 'Registration_Certificate.jpg',
        fieldB: 'Registration Number (Certificate)',
        valueB: 'REG1029',
        recommendation: 'Request official clarifying affidavit or verify against State Portal Registry records.'
      },
      {
        id: 'FIND-002',
        title: 'Institution Legal Name Slight Deviation',
        severity: 'High',
        category: 'Mismatch',
        description: 'Application states "ABC College of Engineering & Tech" while certificate states "ABC College of Engineering".',
        sourceDoc: 'Application_Form.pdf',
        fieldA: 'Institution Name',
        valueA: 'ABC College of Engineering & Tech',
        comparedDoc: 'Registration_Certificate.jpg',
        fieldB: 'Certificate Name',
        valueB: 'ABC College of Engineering',
        recommendation: 'Check whether a formal gazette name change amendment was appended.'
      },
      {
        id: 'FIND-003',
        title: 'Fire Safety NOC Approaching Expiry',
        severity: 'Warning',
        category: 'Validity',
        description: 'Fire & Rescue Services clearance certificate expires within 14 calendar days.',
        sourceDoc: 'Fire_Safety_NOC.pdf',
        fieldA: 'Expiration Window',
        valueA: '14 Days remaining',
        recommendation: 'Require applicant to provide receipt of renewal application before granting final clearance.'
      },
      {
        id: 'FIND-004',
        title: 'Digital Notary Watermark Verified',
        severity: 'Info',
        category: 'Format',
        description: 'E-stamp QR code resolved cleanly against Central Stamp Repository.',
        sourceDoc: 'Affidavit.pdf',
        fieldA: 'Stamp Token',
        valueA: 'ST-492019-IN [Verified]'
      }
    ],
    timeline: [
      { step: 'Application Submitted', timestamp: '28-Oct-26 09:15 AM', status: 'completed', details: 'Submitted via applicant portal by Registrar' },
      { step: 'Document Ingestion & OCR', timestamp: '28-Oct-26 09:22 AM', status: 'completed', details: 'Extracted 42 key fields across 5 documents' },
      { step: 'Automated Regulatory Cross-Check', timestamp: '28-Oct-26 09:30 AM', status: 'completed', details: 'Simulated compliance rules flagged 2 anomalies' },
      { step: 'Assigned to Reviewer', timestamp: '28-Oct-26 10:15 AM', status: 'current', details: 'Under assessment by Compliance Reviewer' },
      { step: 'Final Regulatory Decision', timestamp: 'Pending', status: 'pending', details: 'Awaiting reviewer sign-off' }
    ]
  },
  {
    id: 'APP2026002',
    title: 'University Affiliation Renewal',
    applicantName: 'XYZ Institute of Technology',
    type: 'Affiliation',
    category: 'University Affiliation',
    referenceNo: 'UGC/AFF/2026/8940',
    submittedDate: '27-Oct-26',
    lastUpdated: '27-Oct-26 04:12 PM',
    documentsCount: 4,
    status: 'Verified',
    priority: 'Low',
    riskLevel: 'Low',
    assignedReviewer: 'Senior Officer Patel',
    contactEmail: 'director@xyzinstitute.ac.in',
    contactPhone: '+91 22 2890 1122',
    complianceScore: 98,
    findingsCount: { high: 0, warning: 0, info: 4 },
    documents: [initialDocuments[3]],
    findings: [],
    timeline: [
      { step: 'Application Submitted', timestamp: '27-Oct-26 11:00 AM', status: 'completed' },
      { step: 'Document Ingestion & OCR', timestamp: '27-Oct-26 11:15 AM', status: 'completed' },
      { step: 'Cross-Verification', timestamp: '27-Oct-26 11:30 AM', status: 'completed' },
      { step: 'Reviewer Approval', timestamp: '27-Oct-26 04:12 PM', status: 'completed' }
    ]
  },
  {
    id: 'APP2026003',
    title: 'Course Extension & Intake Expansion',
    applicantName: 'Sunrise Academy of Sciences',
    type: 'Affiliation',
    category: 'Course Extension',
    referenceNo: 'AICTE/EXT/2026/4011',
    submittedDate: '27-Oct-26',
    lastUpdated: '27-Oct-26 02:45 PM',
    documentsCount: 3,
    status: 'Pending',
    priority: 'Medium',
    riskLevel: 'Medium',
    assignedReviewer: 'Compliance Reviewer',
    contactEmail: 'admin@sunriseacademy.org',
    contactPhone: '+91 11 4156 7890',
    complianceScore: 82,
    findingsCount: { high: 0, warning: 2, info: 1 },
    documents: [initialDocuments[4]],
    findings: [],
    timeline: [
      { step: 'Application Submitted', timestamp: '27-Oct-26 01:00 PM', status: 'completed' },
      { step: 'Document Ingestion & OCR', timestamp: '27-Oct-26 01:25 PM', status: 'completed' },
      { step: 'Pending Secondary Review', timestamp: '27-Oct-26 02:45 PM', status: 'current' }
    ]
  },
  {
    id: 'APP2026004',
    title: 'New Campus Expansion Clearance',
    applicantName: 'Global Tech Polytechnic',
    type: 'Extension',
    category: 'Campus Expansion',
    referenceNo: 'AICTE/CAMP/2026/092',
    submittedDate: '26-Oct-26',
    lastUpdated: '26-Oct-26 05:20 PM',
    documentsCount: 5,
    status: 'Needs Review',
    priority: 'High',
    riskLevel: 'High',
    assignedReviewer: 'Dr. M. K. Rao',
    contactEmail: 'principal@globaltechpoly.in',
    contactPhone: '+91 44 2234 5678',
    complianceScore: 68,
    findingsCount: { high: 3, warning: 1, info: 2 },
    documents: [initialDocuments[6]],
    findings: [],
    timeline: [
      { step: 'Application Submitted', timestamp: '26-Oct-26 03:00 PM', status: 'completed' },
      { step: 'OCR Processing', timestamp: '26-Oct-26 03:30 PM', status: 'completed' },
      { step: 'Needs Review', timestamp: '26-Oct-26 05:20 PM', status: 'current' }
    ]
  },
  {
    id: 'APP2026005',
    title: 'Deemed University Recognition',
    applicantName: 'Modern College of Pharmacy',
    type: 'Institutional',
    category: 'Institutional Approval',
    referenceNo: 'PCI/INS/2026/778',
    submittedDate: '25-Oct-26',
    lastUpdated: '25-Oct-26 06:00 PM',
    documentsCount: 4,
    status: 'Rejected',
    priority: 'High',
    riskLevel: 'High',
    assignedReviewer: 'Dr. M. K. Rao',
    contactEmail: 'dean@modernpharmacy.edu',
    contactPhone: '+91 20 2567 8901',
    complianceScore: 42,
    findingsCount: { high: 4, warning: 2, info: 0 },
    documents: [],
    findings: [],
    timeline: [
      { step: 'Application Submitted', timestamp: '25-Oct-26 10:00 AM', status: 'completed' },
      { step: 'AI Fraud Check', timestamp: '25-Oct-26 11:30 AM', status: 'completed' },
      { step: 'Rejected for Altered Land Title Deed', timestamp: '25-Oct-26 06:00 PM', status: 'completed' }
    ]
  },
  {
    id: 'APP2026006',
    title: 'Postgraduate Program Accreditation',
    applicantName: 'Apex Institute of Business Studies',
    type: 'Accreditation',
    category: 'Accreditation Renewal',
    referenceNo: 'NBA/ACC/2026/5120',
    submittedDate: '24-Oct-26',
    lastUpdated: '24-Oct-26 03:10 PM',
    documentsCount: 6,
    status: 'Verified',
    priority: 'Low',
    riskLevel: 'Low',
    assignedReviewer: 'Senior Officer Patel',
    contactEmail: 'dean.academics@apexbusiness.org',
    contactPhone: '+91 120 4987 654',
    complianceScore: 95,
    findingsCount: { high: 0, warning: 1, info: 5 },
    documents: [],
    findings: [],
    timeline: []
  }
];

export const initialComplianceRules: ComplianceRule[] = [
  {
    id: 'R001',
    name: 'Required document missing',
    category: 'General',
    description: 'Enforces presence of all mandatory statutory documents based on the approval category.',
    severity: 'High',
    enabled: true,
    affectedFields: ['Affidavit', 'Registration Certificate', 'Site Plan'],
    lastTriggered: '28-Oct-26 10:30 AM'
  },
  {
    id: 'R002',
    name: 'Applicant name mismatch',
    category: 'Data Check',
    description: 'Compares applicant name across Application Form, Pan Card, Land Deed and Registration Certificate with phonetic and fuzzy tolerance.',
    severity: 'High',
    enabled: true,
    affectedFields: ['Applicant Name', 'Trust / Society Name'],
    lastTriggered: '28-Oct-26 10:34 AM'
  },
  {
    id: 'R003',
    name: 'Date inconsistency',
    category: 'Data Check',
    description: 'Ensures certificates and affidavits precede submission date and have not expired or predated legal incorporation.',
    severity: 'Medium',
    enabled: true,
    affectedFields: ['Issue Date', 'Validity Period', 'Submission Date'],
    lastTriggered: '27-Oct-26 02:45 PM'
  },
  {
    id: 'R004',
    name: 'Expired document',
    category: 'Document',
    description: 'Verifies that clearances (e.g. Fire NOC, Building Safety Certificate) have a valid validity horizon of at least 90 days.',
    severity: 'Medium',
    enabled: true,
    affectedFields: ['NOC Validity', 'Pollution Control Clearance'],
    lastTriggered: '28-Oct-26 10:32 AM'
  },
  {
    id: 'R005',
    name: 'Required field missing',
    category: 'Field Validation',
    description: 'Validates that high-order schema fields (e.g. Pin code, PAN, Society Registration Number) are not left blank.',
    severity: 'High',
    enabled: true,
    affectedFields: ['Registration Number', 'Land Area Sq. Meters'],
    lastTriggered: '26-Oct-26 05:20 PM'
  },
  {
    id: 'R006',
    name: 'Jurisdiction & Zoning conflict',
    category: 'Jurisdiction',
    description: 'Ensures municipal clearance matches state land revenue records and regional AICTE council boundary.',
    severity: 'Low',
    enabled: false,
    affectedFields: ['District', 'Revenue Survey Number'],
    lastTriggered: '24-Oct-26 09:12 AM'
  }
];

export const initialVerificationReports: VerificationReport[] = [
  {
    id: 'REP2026001',
    applicationId: 'APP2026001',
    applicantName: 'ABC College of Engineering',
    generatedDate: '28-Oct-26',
    findingsCount: 5,
    complianceScore: 74,
    status: 'Needs Review',
    summary: 'Cross-document OCR detected registration number divergence between Form (REG1324) and Certificate (REG1029). NOC requires renewal within 14 days.',
    verifiedBy: 'AI Engine v3.2 (Simulated) + Human Queue'
  },
  {
    id: 'REP2026002',
    applicationId: 'APP2026002',
    applicantName: 'XYZ Institute of Technology',
    generatedDate: '27-Oct-26',
    findingsCount: 1,
    complianceScore: 98,
    status: 'Verified',
    summary: 'All credentials, digital signatures, land encumbrance certificates and state board resolutions match statutory norms perfectly.',
    verifiedBy: 'AI Engine v3.2 (Simulated) + Senior Officer Patel'
  },
  {
    id: 'REP2026003',
    applicationId: 'APP2026003',
    applicantName: 'Sunrise Academy of Sciences',
    generatedDate: '27-Oct-26',
    findingsCount: 3,
    complianceScore: 82,
    status: 'Pending',
    summary: 'Affidavit notary verified. Awaiting clarification regarding proposed civil engineering lab capacity allocation.',
    verifiedBy: 'AI Engine v3.2 (Simulated)'
  },
  {
    id: 'REP2026004',
    applicationId: 'APP2026004',
    applicantName: 'Global Tech Polytechnic',
    generatedDate: '26-Oct-26',
    findingsCount: 4,
    complianceScore: 68,
    status: 'Needs Review',
    summary: 'Audited balance sheet contains incomplete ledger schedules. Needs reviewer follow-up.',
    verifiedBy: 'AI Engine v3.2 (Simulated)'
  }
];

export const initialAuditTrail: AuditEvent[] = [
  {
    id: 'AUD-991',
    timestamp: '28-Oct-26 10:34 AM',
    user: 'Compliance Reviewer',
    userRole: 'reviewer',
    action: 'Verification Completed',
    applicationId: 'APP2026001',
    details: 'Simulated verification results generated. Cross-document comparison flagged 2 mismatches.',
    hash: 'sha256:8f4c2e19b0d1a4e76317bcde89a241e'
  },
  {
    id: 'AUD-990',
    timestamp: '28-Oct-26 10:30 AM',
    user: 'System Engine',
    userRole: 'System',
    action: 'Document Processed',
    applicationId: 'APP2026001',
    details: 'OCR extraction completed for Application_Form.pdf (Confidence: 99.2%).',
    hash: 'sha256:7b1a9e33c4d5f6a89012bcde3456789'
  },
  {
    id: 'AUD-989',
    timestamp: '28-Oct-26 10:15 AM',
    user: 'Applicant (ABC College)',
    userRole: 'applicant',
    action: 'Document Uploaded',
    applicationId: 'APP2026001',
    details: 'Registration_Certificate.jpg uploaded via Web Portal (1.8 MB).',
    hash: 'sha256:4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9'
  },
  {
    id: 'AUD-988',
    timestamp: '28-Oct-26 09:15 AM',
    user: 'Applicant (ABC College)',
    userRole: 'applicant',
    action: 'Application Submitted',
    applicationId: 'APP2026001',
    details: 'Initial dossier created with reference AICTE/APP/2026/1024.',
    hash: 'sha256:3f2e1d0c9b8a796e5d4c3b2a1098765'
  },
  {
    id: 'AUD-987',
    timestamp: '27-Oct-26 04:12 PM',
    user: 'Senior Officer Patel',
    userRole: 'reviewer',
    action: 'Application Approved',
    applicationId: 'APP2026002',
    details: 'Approval granted for University Affiliation Renewal. Regulatory compliance rating 98%.',
    hash: 'sha256:9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4'
  },
  {
    id: 'AUD-986',
    timestamp: '27-Oct-26 02:45 PM',
    user: 'System Engine',
    userRole: 'System',
    action: 'Rule Triggered',
    applicationId: 'APP2026003',
    details: 'Rule R003 (Date Inconsistency) flagged warning on tenure certificate.',
    hash: 'sha256:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6'
  },
  {
    id: 'AUD-985',
    timestamp: '25-Oct-26 06:00 PM',
    user: 'Dr. M. K. Rao',
    userRole: 'reviewer',
    action: 'Application Rejected',
    applicationId: 'APP2026005',
    details: 'Rejected due to failed authenticity checks on land survey records.',
    hash: 'sha256:5f4e3d2c1b0a9f8e7d6c5b4a3928172'
  }
];

export const verificationActivityTrend = [
  { date: 'Oct 01', applications: 28, verified: 20 },
  { date: 'Oct 05', applications: 45, verified: 32 },
  { date: 'Oct 10', applications: 62, verified: 48 },
  { date: 'Oct 15', applications: 54, verified: 39 },
  { date: 'Oct 20', applications: 82, verified: 65 },
  { date: 'Oct 25', applications: 95, verified: 78 },
  { date: 'Oct 28', applications: 110, verified: 88 }
];

export const aiSimulatedInsights = [
  { id: '1', text: '23 applications have name mismatches across documents', type: 'error', icon: 'AlertTriangle' },
  { id: '2', text: '15 documents appear to be expired or near expiration', type: 'warning', icon: 'Clock' },
  { id: '3', text: '12 applications missing mandatory municipal clearances', type: 'warning', icon: 'FileWarning' },
  { id: '4', text: '8 high priority reviews pending sign-off for > 48h', type: 'urgent', icon: 'Flame' }
];
