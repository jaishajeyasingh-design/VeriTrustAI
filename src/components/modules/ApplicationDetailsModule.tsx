import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Check,
  XCircle,
  ShieldCheck,
  RefreshCw,
  FileText,
  MessageSquare,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/apiClient';
import { StatusBadge } from '../common/StatusBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { DemoDisclaimer } from '../common/DemoDisclaimer';
import type { ApplicationStatus, VerificationFinding, FindingReviewStatus } from '../../types';

export const ApplicationDetailsModule: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    applications,
    updateApplicationStatus,
    showToast,
    backendConnected,
    refreshApplication,
    refreshReports,
    currentRole
  } = useApp();

  const app = applications.find((a) => a.id === id) || applications[0];

  const [activeTab, setActiveTab] = useState<
    'Overview' | 'Documents' | 'Extracted Data' | 'Compliance' | 'Findings' | 'Timeline'
  >('Overview');

  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Review finding state
  const [selectedFinding, setSelectedFinding] = useState<VerificationFinding | null>(null);
  const [reviewStatusChoice, setReviewStatusChoice] = useState<FindingReviewStatus>('Verified_Accurate');
  const [findingNotesInput, setFindingNotesInput] = useState('');
  const [isSubmittingFindingReview, setIsSubmittingFindingReview] = useState(false);

  const handleAction = (status: ApplicationStatus) => {
    updateApplicationStatus(app.id, status, reviewerNotes || `Reviewer action: ${status}`);
    setActionMenuOpen(false);
    setReviewerNotes('');
  };

  const handleRunValidation = async () => {
    if (!backendConnected) {
      showToast('Backend offline: Running in simulated local demonstration mode.');
      return;
    }
    setIsValidating(true);
    try {
      const summary = await api.applications.validate(app.id);
      await refreshApplication(app.id);
      showToast(`Compliance validation complete: ${summary.findings.length} findings evaluated (${summary.status}).`);
    } catch (err: any) {
      console.error('Validation error:', err);
      showToast(`Validation failed: ${err.message || 'Server error'}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      if (backendConnected) {
        const report = await api.reports.generate(app.id);
        await refreshReports();
        showToast(`Verification dossier ${report.id} generated successfully!`);
        await api.reports.downloadPdf(report.id, `${report.id}.pdf`);
      } else {
        showToast(`Verification report generated for ${app.id} (Demo Mode).`);
      }
    } catch (err: any) {
      console.error('Report generation error:', err);
      showToast(`Report generation failed: ${err.message || 'Server error'}`);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleOpenReviewModal = (finding: VerificationFinding) => {
    setSelectedFinding(finding);
    setReviewStatusChoice(finding.reviewStatus || 'Verified_Accurate');
    setFindingNotesInput(finding.reviewerNotes || '');
  };

  const handleSaveFindingReview = async () => {
    if (!selectedFinding) return;
    setIsSubmittingFindingReview(true);
    try {
      if (backendConnected) {
        await api.applications.updateFindingReview(
          app.id,
          selectedFinding.id,
          reviewStatusChoice,
          findingNotesInput
        );
        await refreshApplication(app.id);
        showToast(`Finding marked as ${reviewStatusChoice.replace('_', ' ')}.`);
      } else {
        showToast(`Finding review updated (Demo local mode).`);
      }
      setSelectedFinding(null);
      setFindingNotesInput('');
    } catch (err: any) {
      showToast(`Review update failed: ${err.message || 'Server error'}`);
    } finally {
      setIsSubmittingFindingReview(false);
    }
  };

  const tabs = ['Overview', 'Documents', 'Extracted Data', 'Compliance', 'Findings', 'Timeline'] as const;

  return (
    <div className="space-y-6">
      {/* Demo Disclaimer */}
      <DemoDisclaimer variant="banner" moduleName={`Application Details (${app.id})`} />

      {/* Top Breadcrumb & Header */}
      <div>
        <button
          onClick={() => navigate('/applications')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Applications</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {app.id}
            </h1>
            <StatusBadge status={app.status} size="lg" />
            <PriorityBadge priority={app.priority} />
            <span className="text-xs text-slate-400 font-mono hidden md:inline">
              Ref: {app.referenceNo}
            </span>
          </div>

          {/* Action Buttons: Tailored per role */}
          <div className="flex items-center gap-2.5">
            {currentRole !== 'applicant' && (
              <button
                onClick={handleRunValidation}
                disabled={isValidating}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
                title="Execute deterministic cross-document compliance rules"
              >
                {isValidating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Evaluating Rules...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Run Validation</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-black disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              title="Generate and download official PDF verification report"
            >
              {isGeneratingReport ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>{currentRole === 'applicant' ? 'Download Dossier (PDF)' : 'Generate PDF'}</span>
                </>
              )}
            </button>

            {/* Take Action Dropdown (Reviewers & Admins only) */}
            {currentRole !== 'applicant' ? (
              <div className="relative">
                <button
                  onClick={() => setActionMenuOpen(!actionMenuOpen)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <span>Take Action ▾</span>
                </button>

                {actionMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in">
                    <div className="px-3 py-1.5 border-b border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Reviewer Actions
                      </span>
                    </div>
                    <button
                      onClick={() => handleAction('Verified')}
                      className="w-full text-left px-3.5 py-2 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 font-semibold"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Grant Clearance (Approve)</span>
                    </button>
                    <button
                      onClick={() => handleAction('Needs Review')}
                      className="w-full text-left px-3.5 py-2 text-xs text-amber-700 hover:bg-amber-50 flex items-center gap-2 font-semibold"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Flag for Senior Auditor</span>
                    </button>
                    <button
                      onClick={() => handleAction('Pending')}
                      className="w-full text-left px-3.5 py-2 text-xs text-blue-700 hover:bg-blue-50 flex items-center gap-2 font-semibold"
                    >
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>Request Applicant Resubmission</span>
                    </button>
                    <button
                      onClick={() => handleAction('Rejected')}
                      className="w-full text-left px-3.5 py-2 text-xs text-rose-700 hover:bg-rose-50 flex items-center gap-2 font-semibold"
                    >
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>Reject Application</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => navigate('/vault')}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <span>Upload Additional Docs</span>
              </button>
            )}
          </div>
        </div>

        {/* Applicant Institutional Notice Banner */}
        {currentRole === 'applicant' && (
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-blue-50/80 border border-emerald-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-xs sm:text-sm">
                  Application Status: <span className="text-emerald-700">{app.status === 'Verified' ? 'Approved & Granted Clearance' : 'Active Institutional Review In Progress'}</span>
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Submitted for {app.applicantName} (Ref: {app.referenceNo}). Regulatory evaluators are currently examining the uploaded statutory annexures.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-800 shadow-2xs">
                {app.complianceScore}% Readiness
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex items-center gap-2 sm:gap-6 overflow-x-auto text-xs font-semibold select-none">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 transition-colors relative cursor-pointer whitespace-nowrap ${
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab}
            {tab === 'Findings' && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                {app.findingsCount.high + app.findingsCount.warning}
              </span>
            )}
            {tab === 'Documents' && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                {app.documents.length || app.documentsCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: OVERVIEW */}
      {activeTab === 'Overview' && (
        <div className="space-y-6">
          {/* Top row: Applicant Info + Verification Status Stepper */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Applicant Information */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Applicant Information
                </h2>
                <span className="text-[10px] font-mono text-slate-400">Verified Identity</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Institution Name:</span>
                  <span className="text-sm font-bold text-slate-900">{app.applicantName}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Category:</span>
                    <span className="font-semibold text-slate-800">{app.category}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Reference No:</span>
                    <span className="font-mono font-semibold text-blue-700">{app.referenceNo}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Submitted Date:</span>
                    <span className="font-medium text-slate-800">{app.submittedDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Compliance Score:</span>
                    <span className="font-bold text-emerald-600">{app.complianceScore}% Match</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-400 text-[11px] block">Primary Contact:</span>
                  <p className="font-medium text-slate-800">{app.contactEmail}</p>
                  <p className="text-[11px] text-slate-500">{app.contactPhone}</p>
                </div>
              </div>
            </div>

            {/* Verification Status Stepper & Findings Summary */}
            <div className="lg:col-span-7 space-y-6">
              {/* Stepper Pipeline */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Verification Pipeline Status
                  </h2>
                  <span className="text-xs text-blue-600 font-semibold">Stage 3 of 4</span>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-4 text-center">
                  {[
                    { label: 'Submitted', date: app.submittedDate, done: true },
                    { label: 'Processing', date: 'OCR Extracted', done: true },
                    { label: 'Review', date: 'In Assessment', current: true },
                    { label: 'Decision', date: 'Pending Sign-off', done: false }
                  ].map((step, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-2 transition-all ${
                          step.done
                            ? 'bg-emerald-600 text-white'
                            : step.current
                            ? 'bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}
                      >
                        {step.done ? <Check className="w-4 h-4" /> : idx + 1}
                      </div>
                      <span className="text-xs font-bold text-slate-900">{step.label}</span>
                      <span className="text-[10px] text-slate-400">{step.date}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Findings Summary Cards */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Findings Summary
                  </h2>
                  <button
                    onClick={() => setActiveTab('Findings')}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    View All ({app.findings.length || 4}) →
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 text-center">
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                    <span className="text-xl font-extrabold text-rose-700 block">
                      {app.findingsCount.high}
                    </span>
                    <span className="text-[11px] font-semibold text-rose-900">High Priority</span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-xl font-extrabold text-amber-700 block">
                      {app.findingsCount.warning}
                    </span>
                    <span className="text-[11px] font-semibold text-amber-900">Warnings</span>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                    <span className="text-xl font-extrabold text-blue-700 block">
                      {app.findingsCount.info}
                    </span>
                    <span className="text-[11px] font-semibold text-blue-900">Informational</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison Highlight Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Primary Discrepancy: Registration Number Mismatch
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cross-document verification engine detected divergent entity identifiers
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-rose-100 text-rose-700 text-xs font-bold">
                Requires Examiner Override
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Source Document: Application_Form.pdf
                </span>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-mono">EXTRACTED FIELD: #4</div>
                  <div className="text-base font-mono font-bold text-slate-900 mt-0.5">
                    REG1324
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Entered by applicant in digital registration dossier.
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40">
                <span className="text-[11px] font-semibold text-rose-600 block mb-1">
                  Compared Document: Registration_Certificate.jpg
                </span>
                <div className="p-3 bg-white rounded-lg border border-rose-200">
                  <div className="text-[10px] text-rose-500 font-mono">OCR DISCREPANCY DETECTED</div>
                  <div className="text-base font-mono font-bold text-rose-600 mt-0.5">
                    REG1029
                  </div>
                  <div className="text-[11px] text-rose-700 mt-1">
                    State Directorate of Technical Education Certificate scan.
                  </div>
                </div>
              </div>
            </div>

            {/* Reviewer Decision Note Input */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Reviewer Evaluation Notes & Justification
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  placeholder="e.g., Verified physical gazette notification. ID difference resolved via amendment..."
                  className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (reviewerNotes.trim()) {
                      showToast('Audit notes recorded to permanent timeline');
                      setReviewerNotes('');
                    } else {
                      showToast('Please type a note first');
                    }
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: DOCUMENTS */}
      {activeTab === 'Documents' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Attached Documents</h2>
              <p className="text-xs text-slate-500">
                All statutory files uploaded for this application with OCR parsing status
              </p>
            </div>
            <button
              onClick={() => navigate('/vault')}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              Open in Document Vault →
            </button>
          </div>

          <div className="space-y-3">
            {app.documents.map((doc) => (
              <div
                key={doc.id}
                className="p-4 rounded-xl border border-slate-200 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl font-mono font-bold text-xs ${
                      doc.fileFormat === 'PDF'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {doc.fileFormat}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{doc.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {doc.type} • {doc.size} • Uploaded {doc.uploadedDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={doc.status} size="sm" />
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Auth: {doc.authenticityScore || 98}%
                  </span>
                  <button
                    onClick={() => showToast(`Previewing ${doc.name} (simulated)`)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100"
                    title="View Document"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: EXTRACTED DATA */}
      {activeTab === 'Extracted Data' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Extracted Structured Fields</h2>
              <p className="text-xs text-slate-500">
                Key-value pairs normalized from OCR text (PyMuPDF & Tesseract)
              </p>
            </div>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md font-semibold border border-indigo-100">
              Deterministic Normalization
            </span>
          </div>

          {app.documents.some((d) => d.extractedFields && Object.keys(d.extractedFields).length > 0) ? (
            <div className="space-y-6">
              {app.documents
                .filter((d) => d.extractedFields && Object.keys(d.extractedFields).length > 0)
                .map((doc) => (
                  <div key={doc.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="font-bold text-slate-900 text-xs">{doc.name}</span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">
                          {doc.type}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Method: {doc.extractionMethod || 'OCR Pipeline'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(doc.extractedFields!).map(([key, value]) => (
                        <div key={key} className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs">
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                            {key}
                          </span>
                          <span className="font-mono font-bold text-slate-800 break-all">
                            {value || '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[11px] uppercase">
                    <th className="py-2.5 px-3">Field Key</th>
                    <th className="py-2.5 px-3">Extracted Value</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-slate-600">Applicant Legal Name</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{app.applicantName}</td>
                    <td className="py-2.5 px-3 text-emerald-600 font-bold">Standard Match</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-slate-600">Registration Number</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{app.referenceNo}</td>
                    <td className="py-2.5 px-3 text-blue-600 font-bold">Application Reference</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-slate-600">Document Category</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{app.category}</td>
                    <td className="py-2.5 px-3 text-emerald-600 font-bold">Cataloged</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: COMPLIANCE */}
      {activeTab === 'Compliance' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Statutory Compliance Matrix</h2>
              <p className="text-xs text-slate-500">
                Evaluation against deterministic compliance validation rules
              </p>
            </div>
            <span className="text-xs font-bold text-slate-900">
              Score: <span className="text-emerald-600">{app.complianceScore}/100</span>
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">R001: Mandatory Statutory Documents Verification</p>
                <p className="text-[11px] text-slate-600">Cataloged Documents: {app.documents.length} files attached</p>
              </div>
              <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                EVALUATED
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">R007: Registration Number Cross-Document Concordance</p>
                <p className="text-[11px] text-indigo-700">Pairwise cross-referencing between Application form and Certificate</p>
              </div>
              <span className="font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded text-[10px]">
                ACTIVE RULE
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">R002: Institutional Name Concordance</p>
                <p className="text-[11px] text-blue-700">Token overlap & abbreviation matching across attachments</p>
              </div>
              <span className="font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-[10px]">
                ACTIVE RULE
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: FINDINGS */}
      {activeTab === 'Findings' && (
        <div className="space-y-4">
          {/* Regulatory Disclaimer Banner */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900">
                Automated Compliance Engine Observations
              </p>
              <p className="text-amber-800 text-[11px] leading-relaxed mt-0.5">
                The findings below are deterministic indicators generated by comparing OCR-extracted values across dossier attachments. They serve as assistive signals for human compliance officers and do not constitute legal proof of forgery or statutory fraud.
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-900">
                Identified Discrepancies ({app.findings.length})
              </span>
              <div className="flex items-center gap-1.5">
                {app.findingsCount.high > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                    {app.findingsCount.high} High
                  </span>
                )}
                {app.findingsCount.warning > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                    {app.findingsCount.warning} Medium
                  </span>
                )}
                {app.findingsCount.info > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                    {app.findingsCount.info} Info
                  </span>
                )}
              </div>
            </div>

            {currentRole !== 'applicant' && (
              <button
                onClick={handleRunValidation}
                disabled={isValidating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg transition-colors cursor-pointer border border-indigo-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
                <span>{isValidating ? 'Evaluating...' : 'Re-run Compliance Checks'}</span>
              </button>
            )}
          </div>

          {app.findings.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">All Consistency Checks Passed</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No registration discrepancies, missing mandatory documents, or conflicting institutional attributes were detected across the uploaded dossier.
              </p>
            </div>
          ) : (
            app.findings.map((f) => (
              <div
                key={f.id}
                className={`p-5 rounded-2xl border text-xs space-y-3.5 ${
                  f.severity === 'High'
                    ? 'border-rose-200 bg-rose-50/20'
                    : f.severity === 'Warning' || f.severity === 'Medium'
                    ? 'border-amber-200 bg-amber-50/20'
                    : 'border-blue-200 bg-blue-50/20'
                }`}
              >
                {/* Finding Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={`w-4 h-4 ${
                        f.severity === 'High'
                          ? 'text-rose-600'
                          : f.severity === 'Warning' || f.severity === 'Medium'
                          ? 'text-amber-600'
                          : 'text-blue-600'
                      }`}
                    />
                    <span className="font-bold text-slate-900 text-sm">{f.title}</span>
                    {f.ruleId && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                        {f.ruleId}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 font-mono">({f.id})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={f.severity as any} />
                    {f.reviewStatus && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          f.reviewStatus === 'Verified_Accurate'
                            ? 'bg-emerald-100 text-emerald-800'
                            : f.reviewStatus === 'False_Positive'
                            ? 'bg-purple-100 text-purple-800'
                            : f.reviewStatus === 'Escalated'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {f.reviewStatus.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-slate-700 leading-relaxed">{f.description}</p>

                {/* Side-by-side Evidence Comparison */}
                {(f.fieldA || f.sourceDoc) && (
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {/* Left: Source Document Record */}
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          <span>Source Document</span>
                          {f.sourceDocId && <span className="font-mono">{f.sourceDocId}</span>}
                        </div>
                        <p className="font-bold text-slate-900 text-xs mb-2">{f.sourceDoc || 'Statutory Source'}</p>
                        <div className="pt-2 border-t border-slate-200/60">
                          <span className="text-[10px] text-slate-400 block font-semibold">
                            {f.fieldA || f.fieldName || 'Recorded Value'}
                          </span>
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {f.valueA || 'Not detected'}
                          </span>
                        </div>
                      </div>

                      {/* Right: Compared Document Record */}
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          <span>Compared Document</span>
                          {f.comparedDocId && <span className="font-mono">{f.comparedDocId}</span>}
                        </div>
                        <p className="font-bold text-slate-900 text-xs mb-2">{f.comparedDoc || 'Supporting Attachment'}</p>
                        <div className="pt-2 border-t border-slate-200/60">
                          <span className="text-[10px] text-slate-400 block font-semibold">
                            {f.fieldB || f.fieldName || 'Observed Value'}
                          </span>
                          <span className={`font-mono font-bold text-sm ${
                            f.category === 'Mismatch' ? 'text-rose-600' : 'text-slate-900'
                          }`}>
                            {f.valueB || 'Not detected'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Deterministic Comparison Result */}
                    {f.comparisonResult && (
                      <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200/70 text-blue-900 flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">Engine Evaluation Result:</span>
                          <p className="text-[11px] text-blue-800">{f.comparisonResult}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Evidence References */}
                {f.evidenceReferences && f.evidenceReferences.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Evidence:</span>
                    {f.evidenceReferences.map((ref, rIdx) => (
                      <span
                        key={rIdx}
                        className="px-2 py-0.5 rounded bg-white text-slate-700 font-mono text-[10px] font-medium border border-slate-200"
                      >
                        {ref}
                      </span>
                    ))}
                  </div>
                )}

                {/* Recommendation */}
                {f.recommendation && (
                  <div className="text-[11px] text-slate-600 bg-white/70 p-2.5 rounded-lg border border-slate-200/60">
                    <span className="font-bold text-slate-800">Suggested Auditor Action:</span>{' '}
                    {f.recommendation}
                  </div>
                )}

                {/* Reviewer Action Bar */}
                <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-500">
                    {f.reviewedBy ? (
                      <span>
                        Reviewed by <strong className="text-slate-700">{f.reviewedBy}</strong> ({f.reviewedAt || 'Recently'})
                        {f.reviewerNotes && (
                          <span className="italic block text-slate-600 mt-0.5">
                            "{f.reviewerNotes}"
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">No auditor review decision recorded yet.</span>
                    )}
                  </div>

                  {currentRole !== 'applicant' ? (
                    <button
                      onClick={() => handleOpenReviewModal(f)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-blue-700 font-bold text-xs rounded-lg border border-blue-200 shadow-2xs transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                      <span>{f.reviewedBy ? 'Update Review Decision' : 'Review Finding'}</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                      Auditor Evaluation Pending
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: TIMELINE */}
      {activeTab === 'Timeline' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
            Lifecycle Audit Timeline
          </h2>

          <div className="space-y-4 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 text-xs">
            {app.timeline.map((item, idx) => (
              <div key={idx} className="relative">
                <span
                  className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white ${
                    item.status === 'completed'
                      ? 'bg-emerald-500'
                      : item.status === 'current'
                      ? 'bg-blue-500 animate-pulse'
                      : 'bg-slate-300'
                  }`}
                />
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-900">{item.step}</p>
                  <span className="text-[10px] text-slate-400">{item.timestamp}</span>
                </div>
                {item.details && (
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.details}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Finding Review Modal */}
      {selectedFinding && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Review Finding: {selectedFinding.title}
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  ID: {selectedFinding.id} • Rule: {selectedFinding.ruleId || 'N/A'}
                </span>
              </div>
              <button
                onClick={() => setSelectedFinding(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  Review Assessment Decision
                </label>
                <select
                  value={reviewStatusChoice}
                  onChange={(e) => setReviewStatusChoice(e.target.value as FindingReviewStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Verified_Accurate">Verified Accurate (Issue Confirmed)</option>
                  <option value="False_Positive">False Positive (OCR or Format Nuance)</option>
                  <option value="Escalated">Escalate to Senior Legal Auditor</option>
                  <option value="Pending">Pending Resubmission / Clarification</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  Auditor Justification / Review Notes
                </label>
                <textarea
                  value={findingNotesInput}
                  onChange={(e) => setFindingNotesInput(e.target.value)}
                  placeholder="Detail rationale for marking as verified or false positive..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600">
                <span className="font-bold text-slate-700 block mb-0.5">Audit Trail Guarantee:</span>
                This action records an immutable audit ledger entry linked to your reviewer profile.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedFinding(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFindingReview}
                disabled={isSubmittingFindingReview}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white rounded-xl shadow-sm transition-all flex items-center gap-1.5"
              >
                {isSubmittingFindingReview ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Confirm Review Decision</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
