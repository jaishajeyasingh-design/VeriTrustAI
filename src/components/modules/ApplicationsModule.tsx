import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileCheck2,
  Building2,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { Modal } from '../common/Modal';
import { DemoDisclaimer } from '../common/DemoDisclaimer';
import type { Application } from '../../types';

export const ApplicationsModule: React.FC = () => {
  const { applications, updateApplicationStatus, addApplication, searchQuery, setSearchQuery, currentRole } = useApp();
  const navigate = useNavigate();

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Quick Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('AICTE Approval Extension');
  const [newApplicant, setNewApplicant] = useState('National Institute of Technology, Surat');
  const [newType, setNewType] = useState<'Institutional' | 'Affiliation' | 'Extension'>('Institutional');
  const [newCategory, setNewCategory] = useState('Institutional Approval');
  const [newRefNo, setNewRefNo] = useState(`AICTE/APP/2026/${Math.floor(1000 + Math.random() * 9000)}`);

  // Filtered applications
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const matchSearch =
        searchQuery === '' ||
        app.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.referenceNo.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === 'All' || app.status === statusFilter;
      const matchType = typeFilter === 'All' || app.type === typeFilter;
      const matchPriority = priorityFilter === 'All' || app.priority === priorityFilter;

      return matchSearch && matchStatus && matchType && matchPriority;
    });
  }, [applications, searchQuery, statusFilter, typeFilter, priorityFilter]);

  const handleSelectAll = () => {
    if (selectedIds.length === filteredApps.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredApps.map((a) => a.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleCreateNewApp = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `APP2026${String(applications.length + 1).padStart(3, '0')}`;
    const newApp: Application = {
      id: newId,
      title: newTitle,
      applicantName: newApplicant,
      type: newType,
      category: newCategory,
      referenceNo: newRefNo,
      submittedDate: '28-Oct-26',
      lastUpdated: 'Just now',
      documentsCount: 3,
      status: 'Needs Review',
      priority: 'Medium',
      riskLevel: 'Medium',
      assignedReviewer: 'Compliance Reviewer',
      contactEmail: 'registrar@institution.edu.in',
      contactPhone: '+91 80 5544 3322',
      complianceScore: 85,
      findingsCount: { high: 0, warning: 1, info: 2 },
      documents: [],
      findings: [],
      timeline: [
        {
          step: 'Application Submitted',
          timestamp: 'Just now',
          status: 'completed',
          details: 'Application dossier created in portal'
        }
      ]
    };

    addApplication(newApp);
    setCreateModalOpen(false);
    navigate(`/applications/${newId}`);
  };

  return (
    <div className="space-y-6">
      {/* Demo Disclaimer */}
      <DemoDisclaimer variant="banner" moduleName="Applications List & Management" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {currentRole === 'applicant'
                ? 'My Submitted Applications'
                : currentRole === 'reviewer'
                ? 'Compliance Review Queue'
                : 'All Applications'}
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
              {filteredApps.length} entries
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {currentRole === 'applicant'
              ? 'Track compliance verification status, reviewer findings, and updates for your institution.'
              : currentRole === 'reviewer'
              ? 'Adjudicate applications, inspect findings, and issue statutory clearances.'
              : 'View, search, filter and audit all submitted institutional compliance applications.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentRole === 'applicant' ? (
            <button
              onClick={() => navigate('/new-verification')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Submit New Application</span>
            </button>
          ) : currentRole === 'reviewer' ? (
            <button
              onClick={() => setStatusFilter(statusFilter === 'Needs Review' ? 'All' : 'Needs Review')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>{statusFilter === 'Needs Review' ? 'Show All Applications' : 'Filter Needs Review'}</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Application</span>
              </button>
              <button
                onClick={() => navigate('/new-verification')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Start Verification</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID or applicant..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl text-xs text-slate-800 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-400 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold outline-none cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="Needs Review">Needs Review</option>
              <option value="Verified">Verified</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-400 font-medium">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold outline-none cursor-pointer"
            >
              <option value="All">All Types</option>
              <option value="Institutional">Institutional</option>
              <option value="Affiliation">Affiliation</option>
              <option value="Extension">Extension</option>
              <option value="Accreditation">Accreditation</option>
            </select>
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-400 font-medium">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold outline-none cursor-pointer"
            >
              <option value="All">All Priority</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {(statusFilter !== 'All' || typeFilter !== 'All' || priorityFilter !== 'All' || searchQuery !== '') && (
            <button
              onClick={() => {
                setStatusFilter('All');
                setTypeFilter('All');
                setPriorityFilter('All');
                setSearchQuery('');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Batch Actions Bar (when rows are selected, Reviewer & Admin only) */}
      {currentRole !== 'applicant' && selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-blue-900">
              {selectedIds.length} application{selectedIds.length > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                selectedIds.forEach((id) => updateApplicationStatus(id, 'Verified', 'Batch approved by reviewer'));
                setSelectedIds([]);
              }}
              className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              Batch Approve
            </button>
            <button
              onClick={() => {
                selectedIds.forEach((id) => updateApplicationStatus(id, 'Needs Review', 'Batch flagged for audit'));
                setSelectedIds([]);
              }}
              className="px-3 py-1 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-colors cursor-pointer"
            >
              Flag for Audit
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-slate-500 hover:text-slate-800 px-2 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Applications Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
                {currentRole !== 'applicant' && (
                  <th className="py-3 px-4 w-10">
                    <button
                      onClick={handleSelectAll}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      {selectedIds.length === filteredApps.length && filteredApps.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                )}
                <th className="py-3 px-4">Application ID</th>
                <th className="py-3 px-4">Applicant Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Submitted Date</th>
                <th className="py-3 px-4 text-center">Documents</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={currentRole !== 'applicant' ? 9 : 8} className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium text-slate-600">No applications found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try altering your search or filters</p>
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => {
                  const isSelected = selectedIds.includes(app.id);
                  return (
                    <tr
                      key={app.id}
                      className={`hover:bg-slate-50/90 transition-colors group cursor-pointer ${
                        isSelected ? 'bg-blue-50/40' : ''
                      }`}
                      onClick={() => navigate(`/applications/${app.id}`)}
                    >
                      {currentRole !== 'applicant' && (
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleToggleSelect(app.id)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      )}

                      <td className="py-3 px-4 font-mono font-bold text-blue-600 group-hover:underline">
                        {app.id}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{app.applicantName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{app.referenceNo}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                          {app.type}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        {app.submittedDate}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 font-semibold text-slate-700 text-xs">
                          {app.documentsCount}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <StatusBadge status={app.status} size="sm" />
                      </td>

                      <td className="py-3 px-4">
                        <PriorityBadge priority={app.priority} size="sm" />
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {currentRole === 'applicant' ? (
                          <button
                            onClick={() => navigate(`/applications/${app.id}`)}
                            className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-semibold rounded-lg text-xs transition-colors"
                          >
                            View Details →
                          </button>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => navigate(`/applications/${app.id}`)}
                              className="px-3 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold rounded-lg text-xs transition-colors"
                            >
                              View
                            </button>

                            <div className="relative">
                              <button
                                onClick={() => setActiveMenuId(activeMenuId === app.id ? null : app.id)}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                                aria-label="More options"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {activeMenuId === app.id && (
                                <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 animate-in fade-in">
                                  <button
                                    onClick={() => {
                                      updateApplicationStatus(app.id, 'Verified', 'Quick verified from list');
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>Mark Verified</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      updateApplicationStatus(app.id, 'Needs Review', 'Flagged for reviewer follow-up');
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-50 flex items-center gap-2"
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span>Flag for Review</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      updateApplicationStatus(app.id, 'Rejected', 'Rejected from list action');
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 flex items-center gap-2"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Reject Application</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      {/* Pagination footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-800">1-{filteredApps.length}</span> of{' '}
            <span className="font-semibold text-slate-800">1,248</span> results
          </div>

          <div className="flex items-center gap-1.5">
            <button
              className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
              disabled
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center">
              1
            </span>
            <button className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-700 font-medium flex items-center justify-center">
              2
            </button>
            <button className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-700 font-medium flex items-center justify-center">
              3
            </button>
            <span className="px-1 text-slate-400">...</span>
            <button className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-700 font-medium flex items-center justify-center">
              250
            </button>
            <button className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Quick Create Application */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Application Dossier"
        subtitle="Initialize a statutory approval dossier for document ingestion"
      >
        <form onSubmit={handleCreateNewApp} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Application Title
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Applicant Institution Name
            </label>
            <input
              type="text"
              required
              value={newApplicant}
              onChange={(e) => setNewApplicant(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Type
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white"
              >
                <option value="Institutional">Institutional</option>
                <option value="Affiliation">Affiliation</option>
                <option value="Extension">Extension</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Application Category
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white"
              >
                <option value="Institutional Approval">Institutional Approval</option>
                <option value="University Affiliation">University Affiliation</option>
                <option value="Course Extension">Course Extension</option>
                <option value="Accreditation Renewal">Accreditation Renewal</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Reference Number
              </label>
              <input
                type="text"
                required
                value={newRefNo}
                onChange={(e) => setNewRefNo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs"
            >
              Initialize & Continue →
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
