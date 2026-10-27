export type UserRole = 'applicant' | 'reviewer' | 'administrator';

export type ApplicationStatus = 'Needs Review' | 'Verified' | 'Pending' | 'Rejected' | 'Processing';
export type PriorityLevel = 'High' | 'Medium' | 'Low';
export type RiskLevel = 'High' | 'Medium' | 'Low';

export interface OCRPageResult {
  page_number: number;
  text: string;
  char_count: number;
  confidence?: number | null;
}

export interface DocumentOCRResult {
  document_id: string;
  filename: string;
  file_format: 'PDF' | 'JPG' | 'PNG';
  page_count: number;
  extraction_method: string;
  text_extracted: boolean;
  raw_text: string;
  normalized_fields: Record<string, string>;
  pages: OCRPageResult[];
  confidence?: number | null;
  ocr_engine_available: boolean;
  processing_errors: string[];
  demo_mode: boolean;
  disclaimer: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  type: 'Application' | 'Certificate' | 'Affidavit' | 'Identity' | 'Approval' | 'NOC' | 'Financial';
  size: string;
  applicationId: string;
  uploadedDate: string;
  status: 'Processed' | 'Processing' | 'Failed' | 'Pending';
  ocrStatus?: 'Completed' | 'In Progress' | 'Flagged';
  url?: string;
  fileFormat: 'PDF' | 'JPG' | 'PNG';
  extractedFields?: Record<string, string>;
  authenticityScore?: number;
  pageCount?: number;
  rawText?: string;
  extractionMethod?: string;
  ocrEngineAvailable?: boolean;
  processingErrors?: string[];
  demo_mode?: boolean;
}


export type FindingReviewStatus = 'Pending' | 'Verified_Accurate' | 'False_Positive' | 'Escalated' | 'Reviewed' | 'Dismissed' | 'Resolved';

export interface VerificationFinding {
  id: string;
  applicationId?: string;
  ruleId?: string;
  title: string;
  severity: 'High' | 'Medium' | 'Low' | 'Warning' | 'Info';
  category: 'Mismatch' | 'Missing Document' | 'Validity' | 'Compliance' | 'Format';
  description: string;
  fieldName?: string;
  sourceDoc?: string;
  sourceDocId?: string;
  comparedDoc?: string;
  comparedDocId?: string;
  fieldA?: string;
  valueA?: string;
  fieldB?: string;
  valueB?: string;
  comparisonResult?: string;
  evidenceReferences?: string[];
  recommendation?: string;
  reviewStatus?: FindingReviewStatus;
  reviewerNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  timestamp?: string;
}

export interface ValidationSummaryResponse {
  application_id: string;
  status: ApplicationStatus;
  compliance_score: number;
  risk_level: RiskLevel;
  findings_count: {
    high: number;
    medium?: number;
    low?: number;
    warning?: number;
    info?: number;
  };
  findings: VerificationFinding[];
  rules_evaluated?: number;
  rules_triggered?: number;
  documents_analyzed?: number;
  validation_timestamp?: string;
  disclaimer: string;
}

export interface Application {
  id: string; // e.g. APP2026001
  title: string;
  applicantName: string;
  type: 'Institutional' | 'Affiliation' | 'Extension' | 'Accreditation';
  category: string;
  referenceNo: string;
  submittedDate: string;
  lastUpdated: string;
  documentsCount: number;
  documents: DocumentItem[];
  status: ApplicationStatus;
  priority: PriorityLevel;
  riskLevel: RiskLevel;
  assignedReviewer?: string;
  contactEmail: string;
  contactPhone: string;
  findingsCount: {
    high: number;
    warning: number;
    info: number;
  };
  findings: VerificationFinding[];
  complianceScore: number;
  timeline: {
    step: string;
    timestamp: string;
    status: 'completed' | 'current' | 'pending';
    details?: string;
  }[];
}

export interface ComplianceRule {
  id: string; // e.g. R001
  name: string;
  category: 'General' | 'Data Check' | 'Document' | 'Field Validation' | 'Jurisdiction';
  description: string;
  severity: PriorityLevel;
  enabled: boolean;
  affectedFields: string[];
  lastTriggered?: string;
}

export interface VerificationReport {
  id: string; // e.g. REP2026001
  applicationId: string;
  applicantName: string;
  generatedDate: string;
  findingsCount: number;
  complianceScore: number;
  status: ApplicationStatus;
  summary: string;
  verifiedBy: string;
  downloadUrl?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  userRole: UserRole | 'System';
  avatar?: string;
  action: string;
  applicationId: string;
  details: string;
  hash: string;
}

export interface UserProfile {
  name: string;
  role: UserRole;
  roleLabel: string;
  email: string;
  department: string;
  phone: string;
  organization: string;
  timezone: string;
  notifications: {
    emailNotifications: boolean;
    reviewAlerts: boolean;
    weeklySummary: boolean;
    slackAlerts: boolean;
  };
}
