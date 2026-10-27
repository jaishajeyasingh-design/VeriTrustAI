import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Plus,
  Menu,
  ChevronDown,
  Sparkles,
  Check
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BackendStatusBadge } from '../common/BackendStatusBadge';
import type { UserRole } from '../../types';

interface TopbarProps {
  onToggleMobile: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleMobile }) => {
  const {
    currentRole,
    setCurrentRole,
    userProfile,
    searchQuery,
    setSearchQuery,
    auditTrail,
    showToast
  } = useApp();
  const navigate = useNavigate();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const rolesList: { id: UserRole; label: string; desc: string }[] = [
    { id: 'reviewer', label: 'Reviewer', desc: 'Verify & Approve applications' },
    { id: 'applicant', label: 'Applicant', desc: 'Submit dossiers & documents' },
    { id: 'administrator', label: 'Administrator', desc: 'Manage rules & system audit' }
  ];

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    setRoleDropdownOpen(false);
  };

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate('/applications');
      showToast(`Filtering for: "${searchQuery}"`);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onToggleMobile}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <form onSubmit={handleGlobalSearch} className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search applications, documents, IDs (e.g. APP2026001)..."
            className="w-full pl-9 pr-14 py-2 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-xs sm:text-sm text-slate-900 rounded-xl border border-transparent focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
            ↵ Enter
          </kbd>
        </form>
      </div>

      {/* Right: Actions, Role Selector & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Visible Backend Connection Status Indicator */}
        <BackendStatusBadge />

        {/* Role Persona Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setRoleDropdownOpen(!roleDropdownOpen);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="capitalize hidden md:inline">{currentRole} Role</span>
            <span className="capitalize md:hidden">{currentRole}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in">
              <div className="px-3 py-1.5 border-b border-slate-100">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Select User Persona
                </p>
              </div>
              {rolesList.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleRoleChange(r.id)}
                  className={`w-full text-left px-3.5 py-2.5 text-xs flex items-start justify-between hover:bg-slate-50 transition-colors ${
                    currentRole === r.id ? 'bg-blue-50/60 font-medium' : ''
                  }`}
                >
                  <div>
                    <p
                      className={`font-semibold ${
                        currentRole === r.id ? 'text-blue-700' : 'text-slate-800'
                      }`}
                    >
                      {r.label}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{r.desc}</p>
                  </div>
                  {currentRole === r.id && (
                    <Check className="w-4 h-4 text-blue-600 mt-0.5" />
                  )}
                </button>
              ))}
              <div className="px-3 pt-1.5 border-t border-slate-100">
                <button
                  onClick={() => {
                    setRoleDropdownOpen(false);
                    navigate('/login');
                  }}
                  className="w-full text-center py-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Go to Full Login Page →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Start New Verification Primary Button */}
        <button
          onClick={() => navigate('/new-verification')}
          className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Start New Verification</span>
          <span className="sm:hidden">Verify</span>
        </button>

        {/* Notifications Popup */}
        <div className="relative">
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setRoleDropdownOpen(false);
            }}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-0 z-50 animate-in fade-in overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Notifications</span>
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    3 New
                  </span>
                </div>
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="text-[11px] text-blue-600 hover:underline"
                >
                  Close
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {auditTrail.slice(0, 4).map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => {
                      setNotificationsOpen(false);
                      navigate(`/applications/${evt.applicationId}`);
                    }}
                    className="p-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-start gap-3"
                  >
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-800">{evt.action}</p>
                        <span className="text-[10px] text-slate-400">{evt.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{evt.details}</p>
                      <span className="inline-block mt-1 text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded">
                        {evt.applicationId}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2 border-t border-slate-100 bg-slate-50 text-center">
                <button
                  onClick={() => {
                    setNotificationsOpen(false);
                    navigate('/audit');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  View Full Audit Trail →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar & Settings Quick Trigger */}
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 pl-1 hover:opacity-85 transition-opacity cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-900 border border-slate-700 text-white text-xs font-bold flex items-center justify-center shadow-xs">
            CR
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-none">
              {userProfile.name}
            </p>
            <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
              {userProfile.roleLabel}
            </p>
          </div>
        </button>
      </div>
    </header>
  );
};
