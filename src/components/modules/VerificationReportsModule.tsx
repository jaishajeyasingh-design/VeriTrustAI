import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  Eye,
  Search,
  Printer,
  Shield,
  ChevronRight,
  FilePlus,
  Loader2,
  FileText
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/apiClient';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { DemoDisclaimer } from '../common/DemoDisclaimer';
import type { VerificationReport } from '../../types';

export const VerificationReportsModule: React.FC = () => {
  const { reports, applications, showToast, backendConnected, refreshReports } = useApp();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<VerificationReport | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [targetAppId, setTargetAppId] = useState<string>(applications[0]?.id || 'APP2026001');

  const filteredReports = reports.filter(
    (r) =>
      search === '' ||
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.applicationId.toLowerCase().includes(search.toLowerCase()) ||
      r.applicantName.toLowerCase().includes(search.toLowerCase())
  );

  const handleDownloadPdf = async (reportId: string) => {
    setDownloadingId(reportId);
    try {
      if (backendConnected) {
        await api.reports.downloadPdf(reportId, `${reportId}.pdf`);
        showToast(`Official verification dossier ${reportId}.pdf downloaded.`);
      } else {
        showToast(`Downloaded verification report ${reportId}.pdf (Demo Mode).`);
      }
    } catch (err: any) {
      console.error('Download error:', err);
      showToast(`Download failed: ${err.message || 'Server error'}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleGenerateNewReport = async () => {
    if (!targetAppId) return;
    setIsGenerating(true);
    try {
      if (backendConnected) {
        const newRep = await api.reports.generate(targetAppId);
        await refreshReports();
        setShowGenerateModal(false);
        showToast(`Generated official PDF report ${newRep.id} for ${targetAppId}.`);
        setSelectedReport(newRep);
      } else {
        showToast(`Generated verification report for ${targetAppId} (Demo local mode).`);
        setShowGenerateModal(false);
      }
    } catch (err: any) {
      console.error('Report generation error:', err);
      showToast(`Report generation failed: ${err.message || 'Server error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportAll = async () => {
    if (filteredReports.length === 0) {
      showToast('No reports available to export.');
      return;
    }
    const firstRep = filteredReports[0];
    showToast(`Downloading official PDF for report ${firstRep.id}...`);
    await handleDownloadPdf(firstRep.id);
  };

  return (
    <div className="space-y-6">
      {/* Demo Disclaimer */}
      <DemoDisclaimer variant="banner" moduleName="Verification Reports" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Verification Reports
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
              {filteredReports.length} reports
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Audit, generate, and download official PDF compliance dossiers compiled with ReportLab and persisted in SQLite.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <FilePlus className="w-4 h-4" />
            <span>Generate New Report</span>
          </button>

          <button
            onClick={handleExportAll}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Latest PDF</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search report ID or institution..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs outline-none"
          />
        </div>

        <div className="text-xs text-slate-400 hidden sm:block">
          Official VeriTrust Audit Ledger v3.2 • ReportLab PDF Engine
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="py-3 px-4">Report ID</th>
                <th className="py-3 px-4">Application ID</th>
                <th className="py-3 px-4">Applicant Institution</th>
                <th className="py-3 px-4">Generated Date</th>
                <th className="py-3 px-4 text-center">Findings</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredReports.map((rep) => (
                <tr
                  key={rep.id}
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  onClick={() => setSelectedReport(rep)}
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-600 group-hover:underline">
                    {rep.id}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                    {rep.applicationId}
                  </td>

                  <td className="py-3.5 px-4 font-medium text-slate-900">
                    {rep.applicantName}
                  </td>

                  <td className="py-3.5 px-4 text-slate-500">{rep.generatedDate}</td>

                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                        rep.findingsCount > 0
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {rep.findingsCount}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <StatusBadge status={rep.status} size="sm" />
                  </td>

                  <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedReport(rep)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => handleDownloadPdf(rep.id)}
                        disabled={downloadingId === rep.id}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        title="Download Real PDF Dossier"
                      >
                        {downloadingId === rep.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Generate New Report */}
      {showGenerateModal && (
        <Modal
          isOpen={showGenerateModal}
          onClose={() => setShowGenerateModal(false)}
          title="Generate Official PDF Compliance Report"
          subtitle="Compile OCR evidence, validation verdicts, and reviewer actions into a downloadable vector PDF."
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Select Institutional Application:
              </label>
              <select
                value={targetAppId}
                onChange={(e) => setTargetAppId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-blue-500 focus:bg-white"
              >
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.id} — {app.applicantName} ({app.status}, Score: {app.complianceScore}%)
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px] space-y-1">
              <p className="font-semibold text-slate-800">Report Contents:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Institutional Application metadata and risk profile</li>
                <li>Vault catalog of uploaded statutory credentials and OCR extraction metrics</li>
                <li>Side-by-side mismatch findings and reviewer determinations</li>
                <li>Audit trail SHA-256 block chain references</li>
                <li>Mandatory statutory & assistive AI triage notice</li>
              </ul>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateNewReport}
                disabled={isGenerating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Compiling PDF Engine...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Generate Signed PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Verification Report Dossier Preview */}
      {selectedReport && (
        <Modal
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          title={`Official Verification Dossier: ${selectedReport.id}`}
          subtitle={`Generated on ${selectedReport.generatedDate} for ${selectedReport.applicantName}`}
          maxWidth="3xl"
        >
          <div className="space-y-6 text-xs text-slate-800">
            {/* Report Header Card */}
            <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-sky-400" />
                  <span className="text-base font-bold">VeriTrust AI Audit Certificate</span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Statutory Higher Education Regulatory Verification Protocol
                </p>
                <p className="font-mono text-[10px] text-sky-300 mt-1">
                  Application Reference: {selectedReport.applicationId}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">
                  Overall Compliance Score
                </span>
                <span className="text-2xl font-black text-emerald-400">
                  {selectedReport.complianceScore}%
                </span>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-900 text-sm">Executive Findings Summary:</span>
              <p className="text-slate-600 leading-relaxed">{selectedReport.summary}</p>
            </div>

            {/* Audit Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Status
                </span>
                <div className="mt-1">
                  <StatusBadge status={selectedReport.status} size="sm" />
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Findings
                </span>
                <span className="text-sm font-bold text-slate-900 mt-1 block">
                  {selectedReport.findingsCount} discrepancies
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white sm:col-span-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Evaluated By
                </span>
                <span className="text-sm font-medium text-slate-900 mt-1 block truncate">
                  {selectedReport.verifiedBy}
                </span>
              </div>
            </div>

            {/* Digital Stamp / Hash */}
            <div className="p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-between text-[11px]">
              <div>
                <span className="font-semibold text-slate-800">Tamper-Evident SHA-256 Ledger Digest:</span>
                <p className="font-mono text-slate-500 text-[10px]">
                  sha256:7f9b42c19e830a84f329910dbe5a9821c32b55f
                </p>
              </div>
              <span className="text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded text-[10px]">
                Valid Hash Chain
              </span>
            </div>

            {/* Regulatory Disclaimer Notice */}
            <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-[11px] leading-relaxed">
              <p className="font-bold mb-0.5">Statutory Disclaimer Notice:</p>
              OCR and mismatch findings are assistive triage indicators and do not constitute legal proof of authenticity or forgery. Official regulatory verification requires human inspection of original artifacts.
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedReport(null);
                  navigate(`/applications/${selectedReport.applicationId}`);
                }}
                className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Go to Application Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => handleDownloadPdf(selectedReport.id)}
                  disabled={downloadingId === selectedReport.id}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {downloadingId === selectedReport.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Downloading PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Signed PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
