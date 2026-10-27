import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Trash2,
  AlertTriangle,
  Check,
  Layers
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { api } from '../../../services/apiClient';
import { DemoDisclaimer } from '../../common/DemoDisclaimer';
import type { Application, VerificationFinding, DocumentItem, ValidationSummaryResponse } from '../../../types';

export const NewVerificationModule: React.FC = () => {
  const { addApplication, showToast, backendConnected } = useApp();
  const navigate = useNavigate();

  // Wizard Step (1, 2, 3, 4)
  const [currentStep, setCurrentStep] = useState<number>(1);


  // Step 1: Application Details state
  const [appTitle, setAppTitle] = useState('AICTE Approval Application');
  const [applicantName, setApplicantName] = useState('ABC College of Engineering');
  const [appCategory, setAppCategory] = useState('Institutional Approval');
  const [referenceNo, setReferenceNo] = useState('AICTE/APP/2026/1024');
  const [submissionDate, setSubmissionDate] = useState('28-10-2026');
  const [contactEmail, setContactEmail] = useState('registrar@abccollege.edu.in');
  const [contactPhone, setContactPhone] = useState('+91 80 2345 6789');

  // Step 2: Uploaded Documents state
  const [uploadedDocs, setUploadedDocs] = useState<
    {
      id: string;
      name: string;
      format: 'PDF' | 'JPG' | 'PNG';
      size: string;
      progress: number;
      file?: File;
    }[]
  >([
    { id: '1', name: 'Application_Form.pdf', format: 'PDF', size: '2.4 MB', progress: 100 },
    { id: '2', name: 'Registration_Certificate.jpg', format: 'JPG', size: '1.8 MB', progress: 100 },
    { id: '3', name: 'Affidavit.pdf', format: 'PDF', size: '1.2 MB', progress: 100 }
  ]);

  // Step 3: Confirmation checkbox
  const [confirmedAuth, setConfirmedAuth] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);

  // Live Backend Validation State
  const [createdAppId, setCreatedAppId] = useState<string>('');
  const [liveFindings, setLiveFindings] = useState<VerificationFinding[]>([]);
  const [liveValidationSummary, setLiveValidationSummary] = useState<ValidationSummaryResponse | null>(null);
  const [isLiveValidated, setIsLiveValidated] = useState<boolean>(false);

  // Step 4: Active Tab
  const [resultsTab, setResultsTab] = useState<'mismatches' | 'extracted' | 'rules' | 'summary'>('mismatches');

  // Add sample files quickly
  const handleAddSampleFile = (name: string, format: 'PDF' | 'JPG' | 'PNG', size: string) => {
    const newDoc = {
      id: String(Date.now()),
      name,
      format,
      size,
      progress: 100
    };
    setUploadedDocs((prev) => [...prev, newDoc]);
    showToast(`Added ${name}`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const allowedExts = ['PDF', 'PNG', 'JPG', 'JPEG'];
      const validItems: typeof uploadedDocs = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop()?.toUpperCase() || '';
        if (!allowedExts.includes(ext)) {
          showToast(`File rejected: ${file.name} is not a PDF, PNG, or JPG`);
          continue;
        }
        if (file.size > 15 * 1024 * 1024) {
          showToast(`File rejected: ${file.name} exceeds 15 MB limit`);
          continue;
        }
        const format = ext === 'PNG' ? 'PNG' : ext === 'JPG' || ext === 'JPEG' ? 'JPG' : 'PDF';
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
        validItems.push({
          id: String(Date.now() + i),
          name: file.name,
          format: format as 'PDF' | 'JPG' | 'PNG',
          size: sizeMb,
          progress: 100,
          file: file
        });
      }

      if (validItems.length > 0) {
        setUploadedDocs((prev) => [...prev, ...validItems]);
        showToast(`Loaded ${validItems.length} document(s) for verification pipeline`);
      }
    }
  };

  const handleRemoveDoc = (id: string) => {
    setUploadedDocs((prev) => prev.filter((d) => d.id !== id));
  };

  // Submit and simulate verification pipeline
  const handleSubmitVerification = async () => {
    if (!confirmedAuth) {
      showToast('Please confirm legal authorization before proceeding.');
      return;
    }

    setIsVerifying(true);
    setVerificationProgress(15);

    const newAppId = 'APP2026' + Math.floor(100 + Math.random() * 900);
    setCreatedAppId(newAppId);

    // If backend connected, upload any real files selected by the user and execute live validation
    const uploadedBackEndDocs: DocumentItem[] = [];
    let liveSummary: ValidationSummaryResponse | null = null;

    if (backendConnected) {
      try {
        // Pre-create application so documents attach strictly to newAppId
        await api.applications.create({
          id: newAppId,
          title: appTitle,
          applicantName,
          type: 'Institutional',
          category: appCategory,
          referenceNo,
          submittedDate: submissionDate,
          status: 'Needs Review',
          priority: 'High',
          riskLevel: 'Medium',
          contactEmail,
          contactPhone,
          complianceScore: 100,
          findingsCount: { high: 0, warning: 0, info: 0 },
          documents: [],
          findings: [],
          timeline: [
            { step: 'Dossier Submitted', timestamp: 'Just now', status: 'completed' }
          ]
        });

        // Upload documents
        for (let i = 0; i < uploadedDocs.length; i++) {
          const item = uploadedDocs[i];
          const docType = i === 0 ? 'Application' : i === 1 ? 'Certificate' : 'Affidavit';
          if (item.file) {
            try {
              const uploaded = await api.documents.upload(item.file, newAppId, docType);
              uploadedBackEndDocs.push(uploaded);
            } catch (e) {
              console.warn(`Could not upload ${item.name} to backend:`, e);
            }
          }
        }

        // Run live validation rules engine on the newly attached documents
        try {
          liveSummary = await api.applications.validate(newAppId);
          setLiveValidationSummary(liveSummary);
          setLiveFindings(liveSummary.findings);
          setIsLiveValidated(true);
        } catch (valErr) {
          console.warn('FastAPI validation call failed, using heuristic demo rules:', valErr);
        }
      } catch (e) {
        console.warn('Backend workflow initialisation error:', e);
      }
    }

    const interval = setInterval(() => {
      setVerificationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsVerifying(false);
          setCurrentStep(4);

          const defaultFindings: VerificationFinding[] = [
            {
              id: 'FIND-SIM-1',
              title: 'Registration Number Mismatch',
              severity: 'High',
              category: 'Mismatch',
              description: 'The registration number in the Application Form does not match the Registration Certificate.',
              sourceDoc: 'Application_Form.pdf',
              fieldA: 'Application Form',
              valueA: 'REG1324',
              comparedDoc: 'Registration_Certificate.jpg',
              fieldB: 'Certificate',
              valueB: 'REG1029',
              comparisonResult: "Registration number Mismatch detected: Source is 'REG1324' while Compared document records 'REG1029'.",
              recommendation: 'The registration number differs between documents. Requires review.'
            },
            {
              id: 'FIND-SIM-2',
              title: 'Missing Mandatory Document',
              severity: 'Medium',
              category: 'Missing Document',
              description: 'Fire & Safety clearance NOC is expiring within statutory 30-day window.',
              sourceDoc: 'Fire_Safety_NOC.pdf',
              fieldA: 'Expiration Alert',
              valueA: '14 Days remaining',
              recommendation: 'Request updated renewal receipt.'
            }
          ];

          const findings: VerificationFinding[] = liveSummary ? liveSummary.findings : defaultFindings;

          // Use genuinely processed documents if available, else cataloged state
          const finalDocuments: DocumentItem[] =
            uploadedBackEndDocs.length > 0
              ? uploadedBackEndDocs
              : uploadedDocs.map((doc, idx) => ({
                  id: `DOC-GEN-${idx}`,
                  name: doc.name,
                  type: idx === 0 ? 'Application' : idx === 1 ? 'Certificate' : 'Affidavit',
                  size: doc.size,
                  applicationId: newAppId,
                  uploadedDate: submissionDate,
                  status: 'Processed',
                  ocrStatus: 'Completed',
                  fileFormat: doc.format,
                  authenticityScore: 96.5,
                  demo_mode: true
                }));

          const newApp: Application = {
            id: newAppId,
            title: appTitle,
            applicantName,
            type: 'Institutional',
            category: appCategory,
            referenceNo,
            submittedDate: submissionDate,
            lastUpdated: 'Just now',
            documentsCount: finalDocuments.length,
            status: liveSummary ? liveSummary.status : 'Needs Review',
            priority: 'High',
            riskLevel: liveSummary ? liveSummary.risk_level : 'High',
            assignedReviewer: 'Compliance Reviewer',
            contactEmail,
            contactPhone,
            complianceScore: liveSummary ? liveSummary.compliance_score : 78,
            findingsCount: liveSummary
              ? {
                  high: liveSummary.findings_count.high || 0,
                  warning: (liveSummary.findings_count.medium || 0) + (liveSummary.findings_count.warning || 0),
                  info: (liveSummary.findings_count.low || 0) + (liveSummary.findings_count.info || 0)
                }
              : { high: 1, warning: 1, info: 2 },
            documents: finalDocuments,
            findings,
            timeline: [
              { step: 'Dossier Submitted', timestamp: 'Just now', status: 'completed' },
              {
                step: liveSummary ? 'Deterministic Validation Engine' : 'Simulated AI Pipeline',
                timestamp: 'Just now',
                status: 'completed'
              },
              { step: 'Needs Review', timestamp: 'Just now', status: 'current' }
            ]
          };

          addApplication(newApp);
          return 100;
        }
        return prev + 25;
      });
    }, 350);
  };

  const stepLabels = [
    { num: 1, title: 'Application Details', subtitle: 'Enter metadata & category' },
    { num: 2, title: 'Upload Documents', subtitle: 'Upload statutory PDFs & images' },
    { num: 3, title: 'Review Submission', subtitle: 'Verify details & consent' },
    { num: 4, title: 'Verification Results', subtitle: 'Simulated AI findings' }
  ];

  return (
    <div className="space-y-6">
      {/* Demo Banner */}
      <DemoDisclaimer variant="banner" moduleName="New Verification Wizard" />

      {/* Stepper Header Title */}
      <div className="pb-2">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          New Verification Workflow
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Step-by-step statutory dossier ingestion, automated OCR text extraction, and compliance rules comparison.
        </p>
      </div>

      {/* Grid Layout: Left Stepper + Right Form/Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Vertical Stepper Card */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="space-y-6">
            {stepLabels.map((st) => {
              const isActive = currentStep === st.num;
              const isPast = currentStep > st.num;

              return (
                <div key={st.num} className="flex items-start gap-3.5 group">
                  {/* Step Icon circle */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-4 ring-blue-100'
                        : isPast
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {isPast ? <Check className="w-4 h-4" /> : st.num}
                  </div>

                  {/* Step Label */}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold ${
                          isActive
                            ? 'text-blue-700'
                            : isPast
                            ? 'text-slate-900'
                            : 'text-slate-400'
                        }`}
                      >
                        {st.title}
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded">
                          Current
                        </span>
                      )}
                      {isPast && (
                        <span className="text-[10px] text-emerald-600 font-medium">Done ✓</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{st.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 bg-slate-50/50 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Pipeline Stages</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              1. Document Classification → 2. Text Extraction (OCR) → 3. Cross-Document Comparison → 4. Compliance Checks.
            </p>
          </div>
        </div>

        {/* Right Column: Step Content Card */}
        <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs min-h-[520px] flex flex-col justify-between">
          {/* STEP 1: Application Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    Application Details
                  </h2>
                  <span className="text-xs text-slate-400 font-mono">Step 1 of 4</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter the basic administrative information about the application dossier.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Application Title
                  </label>
                  <input
                    type="text"
                    value={appTitle}
                    onChange={(e) => setAppTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g. AICTE Approval Application"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Applicant Name
                  </label>
                  <input
                    type="text"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g. ABC College of Engineering"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Application Category
                  </label>
                  <select
                    value={appCategory}
                    onChange={(e) => setAppCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white font-medium"
                  >
                    <option value="Institutional Approval">Institutional Approval</option>
                    <option value="University Affiliation">University Affiliation</option>
                    <option value="Course Extension">Course Extension</option>
                    <option value="Accreditation Renewal">Accreditation Renewal</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white font-mono"
                    placeholder="AICTE/APP/2026/1024"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Submission Date
                  </label>
                  <input
                    type="text"
                    value={submissionDate}
                    onChange={(e) => setSubmissionDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => navigate('/applications')}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <span>Next: Upload Documents</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Upload Supporting Documents */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    Upload Supporting Documents
                  </h2>
                  <span className="text-xs text-slate-400 font-mono">Step 2 of 4</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload all required statutory documents in PDF, PNG, or JPG format.
                </p>
              </div>

              {/* Drag & Drop Upload Zone */}
              <div className="relative border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/30 hover:bg-blue-50/60 rounded-2xl p-8 text-center transition-all">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-800">
                  Drag and drop files here
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  or <span className="text-blue-600 font-semibold underline">Browse Files</span> from your computer
                </p>
                <p className="text-[11px] text-slate-400 mt-2">
                  Supports PDF, PNG, JPG (Max 15MB per file)
                </p>
              </div>

              {/* Quick Add Presets (To easily test in browser) */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-[11px] font-semibold text-slate-600 mb-2">
                  Quick Add Standard Test Credentials:
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddSampleFile('Application_Form.pdf', 'PDF', '2.4 MB')}
                    className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 rounded-lg text-xs font-medium transition-colors"
                  >
                    + Application_Form.pdf
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddSampleFile('Registration_Certificate.jpg', 'JPG', '1.8 MB')}
                    className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 rounded-lg text-xs font-medium transition-colors"
                  >
                    + Registration_Certificate.jpg
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddSampleFile('Affidavit.pdf', 'PDF', '1.2 MB')}
                    className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 rounded-lg text-xs font-medium transition-colors"
                  >
                    + Affidavit.pdf
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddSampleFile('Fire_Safety_NOC.pdf', 'PDF', '1.6 MB')}
                    className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 rounded-lg text-xs font-medium transition-colors"
                  >
                    + Fire_Safety_NOC.pdf
                  </button>
                </div>
              </div>

              {/* Selected Documents List */}
              <div>
                <div className="text-xs font-bold text-slate-800 mb-2.5 flex items-center justify-between">
                  <span>Selected Documents ({uploadedDocs.length})</span>
                  <span className="text-slate-400 text-[11px] font-normal">All ready for ingestion</span>
                </div>

                <div className="space-y-2">
                  {uploadedDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/50 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`px-2 py-1 rounded font-mono font-bold text-[10px] shrink-0 ${
                            doc.format === 'PDF'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {doc.format}
                        </span>
                        <div className="truncate">
                          <p className="font-semibold text-slate-800 truncate">{doc.name}</p>
                          <p className="text-[11px] text-slate-400">{doc.size}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="hidden sm:flex items-center gap-2">
                          <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full w-full rounded-full" />
                          </div>
                          <span className="text-[10px] font-bold text-emerald-600">100%</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(doc.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          aria-label="Remove document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  disabled={uploadedDocs.length === 0}
                  onClick={() => setCurrentStep(3)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <span>Next: Review Submission</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Review Submission */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    Review Your Submission
                  </h2>
                  <span className="text-xs text-slate-400 font-mono">Step 3 of 4</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Please verify the administrative details and attached documents before triggering verification.
                </p>
              </div>

              {/* Summary Cards */}
              <div className="space-y-4">
                {/* Application Information Card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 text-xs">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                    <span className="font-bold text-slate-900">Application Information</span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      [Edit]
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Title:</span>
                      <span className="font-semibold text-slate-800">{appTitle}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Applicant:</span>
                      <span className="font-semibold text-slate-800">{applicantName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Category:</span>
                      <span className="font-semibold text-slate-800">{appCategory}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Reference Number:</span>
                      <span className="font-mono font-semibold text-blue-700">{referenceNo}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Submission Date:</span>
                      <span className="font-semibold text-slate-800">{submissionDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Contact:</span>
                      <span className="font-semibold text-slate-800">{contactEmail}</span>
                    </div>
                  </div>
                </div>

                {/* Uploaded Documents Summary Card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white text-xs">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-900">
                      Uploaded Documents ({uploadedDocs.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      [Manage Files]
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {uploadedDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50 text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              doc.format === 'PDF'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {doc.format}
                          </span>
                          <span className="font-medium text-slate-800">{doc.name}</span>
                        </div>
                        <span className="text-slate-400">{doc.size}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Consent & Fraud Warranty Checkbox */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-blue-100 bg-blue-50/40 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmedAuth}
                    onChange={(e) => setConfirmedAuth(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs text-slate-700 leading-snug">
                    I confirm that the uploaded documents are authorized, digitally notarized where required, and contain no intentionally fraudulent information under the regulatory compliance act.
                  </span>
                </label>
              </div>

              {/* Simulating Progress Modal / Overlay */}
              {isVerifying && (
                <div className="p-6 bg-slate-900 text-white rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-sky-400 animate-spin" />
                      <span className="font-bold">Simulating Verification Pipeline...</span>
                    </div>
                    <span className="font-mono text-sky-400">{verificationProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-sky-400 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${verificationProgress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 italic">
                    Executing simulated OCR extraction, cross-document entity alignment, and compliance rules matrix...
                  </p>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  disabled={isVerifying || !confirmedAuth}
                  onClick={handleSubmitVerification}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Submit for Verification →</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Verification Results (Simulated Demo Mode or Live Backend) */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {/* Header */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      {isLiveValidated ? 'Verification Results (FastAPI Engine)' : 'Verification Results (Simulated)'}
                    </h2>
                    {isLiveValidated ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        FastAPI Engine
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold uppercase tracking-wider">
                        Demo Fallback
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 font-mono">Step 4 of 4</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isLiveValidated
                    ? `Deterministic validation completed for ${createdAppId}. Evaluated compliance rules against ${liveValidationSummary?.documents_analyzed || 0} attached documents.`
                    : 'AI analysis completed. Please review the simulated findings and discrepancies below.'}
                </p>
              </div>

              {/* 5-step checklist pills */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                {[
                  'Document Classification',
                  'Text Extraction (OCR)',
                  'Cross-Document Comparison',
                  'Compliance Checks',
                  'Report Generation'
                ].map((stepTitle, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60 flex flex-col items-center justify-center gap-1"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-[11px] font-semibold text-slate-800 leading-tight">
                      {stepTitle}
                    </span>
                    <span className="text-[9px] font-bold text-emerald-700 uppercase">
                      Completed
                    </span>
                  </div>
                ))}
              </div>

              {/* Sub-tabs: Mismatches, Extracted Data, Rule Results, Summary */}
              <div className="border-b border-slate-200 flex items-center gap-6 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setResultsTab('mismatches')}
                  className={`pb-2.5 transition-colors relative ${
                    resultsTab === 'mismatches'
                      ? 'text-blue-600 border-b-2 border-blue-600 font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>Mismatches & Findings</span>
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                    {liveFindings.length > 0 ? liveFindings.length : 2}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setResultsTab('extracted')}
                  className={`pb-2.5 transition-colors relative ${
                    resultsTab === 'extracted'
                      ? 'text-blue-600 border-b-2 border-blue-600 font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Extracted Data (OCR)
                </button>

                <button
                  type="button"
                  onClick={() => setResultsTab('rules')}
                  className={`pb-2.5 transition-colors relative ${
                    resultsTab === 'rules'
                      ? 'text-blue-600 border-b-2 border-blue-600 font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Rule Results ({isLiveValidated ? `${liveValidationSummary?.rules_evaluated || 6}/7` : '14/16'})
                </button>

                <button
                  type="button"
                  onClick={() => setResultsTab('summary')}
                  className={`pb-2.5 transition-colors relative ${
                    resultsTab === 'summary'
                      ? 'text-blue-600 border-b-2 border-blue-600 font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Compliance Summary
                </button>
              </div>

              {/* TAB 1: Mismatches */}
              {resultsTab === 'mismatches' && (
                <div className="space-y-4">
                  {(liveFindings.length > 0 ? liveFindings : [
                    {
                      id: 'FIND-SIM-1',
                      title: 'Registration Number Mismatch',
                      severity: 'High' as const,
                      category: 'Mismatch' as const,
                      description: 'The institutional registration number differs between statutory documents.',
                      sourceDoc: 'Application Form (Form OCR)',
                      fieldA: 'Field #4',
                      valueA: 'REG1324',
                      comparedDoc: 'Registration Certificate (Certificate OCR)',
                      fieldB: 'Field #2',
                      valueB: 'REG1029',
                      comparisonResult: "Registration number Mismatch detected: Source is 'REG1324' while Compared document records 'REG1029'.",
                      recommendation: 'The registration number differs between documents. Requires review.'
                    },
                    {
                      id: 'FIND-SIM-2',
                      title: 'Missing Mandatory Clearance / Approaching Expiry',
                      severity: 'Medium' as const,
                      category: 'Missing Document' as const,
                      description: 'Fire & Safety clearance NOC expires within 14 calendar days. A renewed endorsement or renewal acknowledgment receipt is required prior to final grant.',
                      recommendation: 'Request updated renewal receipt.'
                    }
                  ]).map((f, idx) => (
                    <div
                      key={f.id || idx}
                      className={`p-4 rounded-xl border text-xs space-y-3 ${
                        f.severity === 'High'
                          ? 'border-rose-200 bg-rose-50/40'
                          : f.severity === 'Warning' || f.severity === 'Medium'
                          ? 'border-amber-200 bg-amber-50/40'
                          : 'border-blue-200 bg-blue-50/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={`w-4 h-4 ${
                            f.severity === 'High' ? 'text-rose-600' : 'text-amber-600'
                          }`} />
                          <span className="font-bold text-slate-900 text-sm">
                            {f.title}
                          </span>
                          {f.ruleId && (
                            <span className="px-2 py-0.5 rounded bg-white text-slate-700 font-mono text-[10px] font-bold border border-slate-200">
                              {f.ruleId}
                            </span>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                          f.severity === 'High'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {f.severity} Priority
                        </span>
                      </div>

                      <p className="text-slate-700 leading-relaxed">{f.description}</p>

                      {/* Side-by-side snippet */}
                      {(f.fieldA || f.sourceDoc) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="p-3 rounded-lg bg-white border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                              {f.sourceDoc || 'Source Document'}
                            </span>
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-sm font-bold text-slate-800">
                                {f.valueA || 'Not detected'}
                              </span>
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                {f.fieldA || 'Field A'}
                              </span>
                            </div>
                          </div>

                          <div className="p-3 rounded-lg bg-white border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                              {f.comparedDoc || 'Compared Document'}
                            </span>
                            <div className="flex items-center justify-between">
                              <span className={`font-mono text-sm font-bold ${
                                f.category === 'Mismatch' ? 'text-rose-700' : 'text-slate-800'
                              }`}>
                                {f.valueB || 'Not detected'}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                f.category === 'Mismatch' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {f.fieldB || f.category}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Comparison explanation */}
                      {f.comparisonResult && (
                        <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 text-blue-900 text-[11px]">
                          <strong>Engine Note:</strong> {f.comparisonResult}
                        </div>
                      )}

                      {f.recommendation && (
                        <p className="text-[11px] text-slate-600 italic">
                          <strong>Auditor Action:</strong> {f.recommendation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 2: Extracted Data */}
              {resultsTab === 'extracted' && (
                <div className="space-y-3 text-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase">
                          <th className="py-2 px-3">Field Label</th>
                          <th className="py-2 px-3">Extracted Value</th>
                          <th className="py-2 px-3">Source Document</th>
                          <th className="py-2 px-3">Confidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-2 px-3 font-medium">Institution Legal Name</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">ABC College of Engineering & Tech</td>
                          <td className="py-2 px-3 text-slate-500">Application_Form.pdf</td>
                          <td className="py-2 px-3 text-emerald-600 font-bold">99.4%</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium">Registration Number</td>
                          <td className="py-2 px-3 font-mono font-bold text-rose-600">REG1324</td>
                          <td className="py-2 px-3 text-slate-500">Application_Form.pdf</td>
                          <td className="py-2 px-3 text-emerald-600 font-bold">99.1%</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium">Head of Institute</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">Dr. S. K. Ramanathan</td>
                          <td className="py-2 px-3 text-slate-500">Affidavit.pdf</td>
                          <td className="py-2 px-3 text-emerald-600 font-bold">98.5%</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium">Campus Land Area</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">12.4 Acres</td>
                          <td className="py-2 px-3 text-slate-500">Application_Form.pdf</td>
                          <td className="py-2 px-3 text-emerald-600 font-bold">97.8%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: Rule Results */}
              {resultsTab === 'rules' && (
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">R001: Required Statutory Document Check</span>
                      <p className="text-[11px] text-slate-600">All mandatory files present</p>
                    </div>
                    <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                      PASSED
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/50 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">R002: Applicant Name & ID Cross-Check</span>
                      <p className="text-[11px] text-slate-600">Mismatch detected between Form and Certificate</p>
                    </div>
                    <span className="text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded text-[10px]">
                      FAILED
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">R004: Expiration & Validity Horizon</span>
                      <p className="text-[11px] text-slate-600">Fire NOC expires in 14 days (minimum 90 days required)</p>
                    </div>
                    <span className="text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded text-[10px]">
                      FLAGGED
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 4: Summary */}
              {resultsTab === 'summary' && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <p className="font-bold text-slate-900">Executive Verification Summary:</p>
                  <p className="text-slate-600 leading-relaxed">
                    Automated heuristic pipeline processed 3 documents and completed cross-field comparison. Overall compliance rating is 78/100 due to registration ID divergence. Application requires human examiner reconciliation before formal accreditation sanction.
                  </p>
                  <div className="pt-2 text-[11px] text-slate-400">
                    Engine: VeriTrust AI v3.2-mock • Generated: 28-Oct-2026
                  </div>
                </div>
              )}

              {/* Bottom Actions */}
              <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Restart Verification
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/reports')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
                  >
                    View Full Report
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      showToast('Dossier forwarded to Senior Compliance Reviewer queue');
                      navigate('/applications');
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                  >
                    Send to Human Review
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
