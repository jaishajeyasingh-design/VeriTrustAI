import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DemoDisclaimer } from '../common/DemoDisclaimer';

export const AuditTrailModule: React.FC = () => {
  const { auditTrail, searchQuery, setSearchQuery } = useApp();
  const navigate = useNavigate();

  const [filterAction, setFilterAction] = useState('All');
  const [filterDate, setFilterDate] = useState('7d');

  const filteredEvents = auditTrail.filter((evt) => {
    const matchSearch =
      searchQuery === '' ||
      evt.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.applicationId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.user.toLowerCase().includes(searchQuery.toLowerCase());

    const matchAction =
      filterAction === 'All' ||
      evt.action.toLowerCase().includes(filterAction.toLowerCase());

    return matchSearch && matchAction;
  });

  return (
    <div className="space-y-6">
      {/* Demo Disclaimer */}
      <DemoDisclaimer variant="banner" moduleName="Audit Trail Ledger" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Audit Trail
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1 font-mono">
              <Lock className="w-3 h-3" />
              Cryptographic Integrity
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Immutable tracking of statutory activities, human examiner decisions, OCR transformations, and rule executions.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs text-xs font-semibold text-slate-700">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Ledger Status: 100% Verified</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, user, or App ID..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="text-slate-400 font-medium">Event Type:</span>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold outline-none cursor-pointer"
            >
              <option value="All">All Actions</option>
              <option value="Verification">Verification</option>
              <option value="Document">Document</option>
              <option value="Application">Application</option>
              <option value="Status">Status Change</option>
              <option value="Rule">Rule Triggered</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="text-slate-400 font-medium">Horizon:</span>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold outline-none cursor-pointer"
            >
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="all">Full Ledger</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Trail Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor / User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Application ID</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4 text-right">Integrity Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredEvents.map((evt) => (
                <tr
                  key={evt.id}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  <td className="py-3.5 px-4 font-medium text-slate-500 whitespace-nowrap">
                    {evt.timestamp}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${
                          evt.userRole === 'System'
                            ? 'bg-purple-100 text-purple-700'
                            : evt.userRole === 'reviewer'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {evt.userRole === 'System' ? 'AI' : evt.user.charAt(0)}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 block leading-tight">
                          {evt.user}
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize">
                          {evt.userRole}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        evt.action.includes('Approved') || evt.action.includes('Completed')
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : evt.action.includes('Rejected')
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : evt.action.includes('Rule')
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {evt.action}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                    {evt.applicationId.startsWith('APP') ? (
                      <button
                        onClick={() => navigate(`/applications/${evt.applicationId}`)}
                        className="hover:underline cursor-pointer"
                      >
                        {evt.applicationId}
                      </button>
                    ) : (
                      evt.applicationId
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-slate-600 max-w-xs sm:max-w-md">
                    {evt.details}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded" title={evt.hash}>
                      {evt.hash.slice(0, 16)}...
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
