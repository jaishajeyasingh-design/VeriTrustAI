import React, { useState } from 'react';
import {
  Save,
  Terminal,
  Zap
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DemoDisclaimer } from '../common/DemoDisclaimer';
import { Modal } from '../common/Modal';
import { api, getApiBaseUrl, getApiToken } from '../../services/apiClient';

export const SettingsModule: React.FC = () => {
  const { userProfile, updateUserProfile, showToast, checkBackendConnection, currentRole } = useApp();

  const [activeTab, setActiveTab] = useState<
    'Profile' | 'Organization' | 'Notifications' | 'Security' | 'Preferences'
  >('Profile');

  // Form states
  const [name, setName] = useState(userProfile.name);
  const [email, setEmail] = useState(userProfile.email);
  const [phone, setPhone] = useState(userProfile.phone);
  const [department, setDepartment] = useState(userProfile.department);
  const [organization, setOrganization] = useState(userProfile.organization);
  const [timezone, setTimezone] = useState(userProfile.timezone);

  // Preference toggles
  const [emailNotifs, setEmailNotifs] = useState(userProfile.notifications.emailNotifications);
  const [reviewAlerts, setReviewAlerts] = useState(userProfile.notifications.reviewAlerts);
  const [weeklySummary, setWeeklySummary] = useState(userProfile.notifications.weeklySummary);
  const [slackAlerts, setSlackAlerts] = useState(userProfile.notifications.slackAlerts);
  const [theme, setTheme] = useState<'Light' | 'Dark' | 'System'>('Light');

  // FastAPI webhook readiness
  const [fastApiEndpoint, setFastApiEndpoint] = useState(getApiBaseUrl());
  const [fastApiKey, setFastApiKey] = useState(getApiToken() || '');
  const [isTestingApi, setIsTestingApi] = useState(false);

  // Edit Profile Modal
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  const handleTestHealthCheck = async () => {
    setIsTestingApi(true);
    const start = performance.now();
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('vt_custom_api_url', fastApiEndpoint);
        if (fastApiKey) localStorage.setItem('vt_api_key', fastApiKey);
      }
      const health = await api.health.check(4000);
      const latency = Math.round(performance.now() - start);
      showToast(`Health Check: 200 OK (${latency}ms) • ${health.service}`);
      await checkBackendConnection();
    } catch (err: any) {
      showToast(`API Connection Failed: ${err.message || 'Cannot reach endpoint'}`);
    } finally {
      setIsTestingApi(false);
    }
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('vt_custom_api_url', fastApiEndpoint);
      if (fastApiKey) {
        localStorage.setItem('vt_api_key', fastApiKey);
      } else {
        localStorage.removeItem('vt_api_key');
      }
    }
    updateUserProfile({
      name,
      email,
      phone,
      department,
      organization,
      timezone,
      notifications: {
        emailNotifications: emailNotifs,
        reviewAlerts,
        weeklySummary,
        slackAlerts
      }
    });
    checkBackendConnection();
    setEditProfileOpen(false);
  };

  const tabs = currentRole === 'administrator'
    ? (['Profile', 'Organization', 'Notifications', 'Security', 'Preferences'] as const)
    : (['Profile', 'Organization', 'Notifications', 'Preferences'] as const);

  return (
    <div className="space-y-6">
      {/* Demo Disclaimer */}
      <DemoDisclaimer variant="banner" moduleName="System & User Settings" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Settings & Configurations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {currentRole === 'applicant'
              ? 'Manage your institutional profile, contact representative credentials, and notifications.'
              : currentRole === 'reviewer'
              ? 'Manage reviewer profile, notifications, and compliance preferences.'
              : 'Manage compliance reviewer identity, organization parameters, and MERN/FastAPI gateway credentials.'}
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>

      {/* Layout Grid: Left Settings Navigation + Right Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sub-nav */}
        <div className="lg:col-span-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs space-y-1 text-xs font-semibold">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between ${
                activeTab === tab
                  ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/60 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span>{tab}</span>
              {activeTab === tab && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              )}
            </button>
          ))}

          <div className="pt-4 mt-4 border-t border-slate-100 p-2">
            <span className="text-[11px] font-semibold text-slate-400 block mb-1">
              Backend Integration:
            </span>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
              <span className="font-bold text-slate-800 block">FastAPI Hook Ready</span>
              <span>REST contracts predefined for seamless wiring</span>
            </div>
          </div>
        </div>

        {/* Right Settings Body */}
        <div className="lg:col-span-9 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          {/* TAB 1: PROFILE */}
          {activeTab === 'Profile' && (
            <div className="space-y-6 text-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">User Profile</h2>
                  <p className="text-slate-500 text-xs">Personal reviewer credentials & departmental affiliations</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditProfileOpen(true)}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-blue-600 rounded-xl font-semibold cursor-pointer"
                >
                  Edit Profile
                </button>
              </div>

              {/* Profile Card */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 text-white font-bold text-lg flex items-center justify-center shadow-md">
                  CR
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{userProfile.name}</h3>
                  <p className="text-blue-600 font-semibold">{userProfile.roleLabel}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{userProfile.department}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-[11px] font-semibold mb-1">Email Address</label>
                  <p className="font-semibold text-slate-800 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    {userProfile.email}
                  </p>
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] font-semibold mb-1">Phone Number</label>
                  <p className="font-semibold text-slate-800 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    {userProfile.phone}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ORGANIZATION */}
          {activeTab === 'Organization' && (
            <div className="space-y-6 text-xs">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">Organization Settings</h2>
                <p className="text-slate-500 text-xs">Statutory jurisdiction and institutional authority profiles</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Organization Name</label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Timezone</label>
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200">
                <h4 className="font-bold text-blue-900 mb-1">Regulatory Jurisdiction</h4>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Configured for Central Council Technical Approval & University Accreditation Framework (2026 Revision).
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: NOTIFICATIONS */}
          {activeTab === 'Notifications' && (
            <div className="space-y-6 text-xs">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">Alerts & Notifications</h2>
                <p className="text-slate-500 text-xs">Configure real-time automated dispatch for flagged discrepancies</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div>
                    <p className="font-bold text-slate-900">Email Notifications</p>
                    <p className="text-slate-500 text-[11px]">Receive summary upon completion of document OCR</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmailNotifs(!emailNotifs)}
                    className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      emailNotifs ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        emailNotifs ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div>
                    <p className="font-bold text-slate-900">Review Alerts (High Priority Mismatches)</p>
                    <p className="text-slate-500 text-[11px]">Instant high-priority alerts when ID discrepancies are discovered</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReviewAlerts(!reviewAlerts)}
                    className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      reviewAlerts ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        reviewAlerts ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div>
                    <p className="font-bold text-slate-900">Weekly Summary Report</p>
                    <p className="text-slate-500 text-[11px]">Executive aggregate of approved vs rejected dossiers</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWeeklySummary(!weeklySummary)}
                    className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      weeklySummary ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        weeklySummary ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div>
                    <p className="font-bold text-slate-900">Slack / Webhook Dispatch</p>
                    <p className="text-slate-500 text-[11px]">Post alerts directly into regulatory auditor channel</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSlackAlerts(!slackAlerts)}
                    className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      slackAlerts ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        slackAlerts ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY */}
          {activeTab === 'Security' && (
            <div className="space-y-6 text-xs">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">Security & API Access</h2>
                <p className="text-slate-500 text-xs">Authentication security and FastAPI backend connection credentials</p>
              </div>

              {/* FastAPI Integration Section */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-blue-900 text-sm">
                    FastAPI Backend Gateway
                  </span>
                  <span className="text-[10px] bg-blue-200 text-blue-800 font-bold px-1.5 py-0.2 rounded">
                    Ready
                  </span>
                </div>
                <p className="text-slate-600">
                  Configure the FastAPI endpoint that will handle production OCR pipelines and database transactions.
                </p>

                <div className="space-y-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      API Server Base URL
                    </label>
                    <input
                      type="text"
                      value={fastApiEndpoint}
                      onChange={(e) => setFastApiEndpoint(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      API Authorization Bearer Key
                    </label>
                    <input
                      type="password"
                      value={fastApiKey}
                      onChange={(e) => setFastApiKey(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={isTestingApi}
                    onClick={handleTestHealthCheck}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Zap className={`w-3.5 h-3.5 ${isTestingApi ? 'animate-spin' : ''}`} />
                    <span>{isTestingApi ? 'Pinging /health...' : 'Test FastAPI Health Check'}</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">Two-Factor Authentication (2FA)</p>
                  <p className="text-slate-500 text-[11px]">Hardware token or TOTP app required for reviewer clearance</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs">
                  Active (FIDO2)
                </span>
              </div>
            </div>
          )}

          {/* TAB 5: PREFERENCES */}
          {activeTab === 'Preferences' && (
            <div className="space-y-6 text-xs">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">Portal Preferences</h2>
                <p className="text-slate-500 text-xs">Theme, layout, and display parameters</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-2">Display Theme</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['Light', 'System', 'Dark'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setTheme(t);
                        showToast(`Theme set to ${t}`);
                      }}
                      className={`p-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        theme === t
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleSaveAll}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Edit Profile */}
      <Modal
        isOpen={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        title="Edit Reviewer Profile"
        subtitle="Update officer contact and administrative assignment"
      >
        <form onSubmit={handleSaveAll} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditProfileOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs"
            >
              Update Profile
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
