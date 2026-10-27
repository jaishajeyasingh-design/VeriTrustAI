import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  FileText,
  ShieldCheck,
  Settings as SettingsIcon,
  ArrowRight,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { UserRole } from '../../types';

export const LoginModule: React.FC = () => {
  const { currentRole, setCurrentRole, showToast } = useApp();
  const navigate = useNavigate();

  const [email, setEmail] = useState('reviewer@veritrust.in');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole || 'reviewer');

  const roleOptions: {
    id: UserRole;
    title: string;
    actionLabel: string;
    description: string;
    icon: React.ElementType;
    demoEmail: string;
  }[] = [
    {
      id: 'applicant',
      title: 'Applicant',
      actionLabel: 'Submit Application',
      description: 'Upload institutional credentials, submit verification dossiers, and track real-time audit progress.',
      icon: FileText,
      demoEmail: 'registrar@abccollege.edu.in'
    },
    {
      id: 'reviewer',
      title: 'Reviewer',
      actionLabel: 'Verify & Approve',
      description: 'Analyze cross-document OCR extractions, inspect mismatch flags, and approve or reject dossiers.',
      icon: ShieldCheck,
      demoEmail: 'reviewer@veritrust.in'
    },
    {
      id: 'administrator',
      title: 'Administrator',
      actionLabel: 'Manage Roles',
      description: 'Configure regulatory compliance rules, inspect tamper-proof audit trails, and oversee system security.',
      icon: SettingsIcon,
      demoEmail: 'admin@veritrust.gov.in'
    }
  ];

  const handleSelectRole = (role: UserRole, demoEmail: string) => {
    setSelectedRole(role);
    setEmail(demoEmail);
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setCurrentRole(selectedRole);
      setIsLoading(false);
      showToast(`Welcome back! Signed in as ${selectedRole.toUpperCase()}`);
      navigate('/');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 border border-slate-200/50">
        {/* Left Column: Dark Navy Enterprise Hero */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#0B132B] via-[#0F172A] to-[#1E293B] p-8 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top Logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 p-0.5 shadow-lg shadow-blue-500/30 flex items-center justify-center">
                <div className="w-full h-full bg-[#0B132B] rounded-[14px] flex items-center justify-center">
                  <Shield className="w-6 h-6 text-sky-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-2xl font-black tracking-tight text-white">
                  <span>VeriTrust</span>
                  <span className="text-sky-400">AI</span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-sky-300/80">
                  Compliance & Regulatory AI
                </span>
              </div>
            </div>

            <div className="mt-12 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-300 border border-sky-400/20">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                Module 1: Login & Role Selection
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                Trusted Verification for a Safer, Transparent Tomorrow.
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                Automated document authentication, cross-entity consistency checks, and regulatory compliance verification engine.
              </p>
            </div>
          </div>

          {/* Highlights & Security Notice */}
          <div className="relative z-10 pt-8 mt-8 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Multi-tier OCR & Tamper Detection (Simulated)</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Statutory Compliance Matrix Validation</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Immutable Cryptographic Audit Trail</span>
            </div>

            <div className="pt-2 text-[11px] text-slate-400 italic">
              * Note: Simulated AI verification demo mode for UI evaluation. Ready for FastAPI backend.
            </div>
          </div>
        </div>

        {/* Right Column: Sign In & Role Selection */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto">
            {/* Header */}
            <div className="text-center lg:text-left mb-6">
              <div className="inline-flex items-center gap-2 mb-2 lg:hidden">
                <Shield className="w-6 h-6 text-blue-600" />
                <span className="text-xl font-bold text-slate-900">VeriTrust AI</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Welcome to VeriTrust AI
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Secure. Verify. Comply. Sign in to access your compliance portal.
              </p>
            </div>

            {/* Sign In Form */}
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@organization.gov.in"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl text-xs sm:text-sm text-slate-800 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      showToast('Password reset link sent to registered email');
                    }}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl text-xs sm:text-sm text-slate-800 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider">
                  Select Role Persona (Demo)
                </span>
              </div>
            </div>

            {/* Role Selection Cards */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {roleOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedRole === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectRole(opt.id, opt.demoEmail)}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-500/30'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span
                      className={`text-xs font-bold ${
                        isSelected ? 'text-blue-900' : 'text-slate-800'
                      }`}
                    >
                      {opt.title}
                    </span>
                    <span
                      className={`text-[10px] leading-tight ${
                        isSelected ? 'text-blue-700 font-medium' : 'text-slate-500'
                      }`}
                    >
                      {opt.actionLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Demo Bypass */}
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => {
                  setCurrentRole(selectedRole);
                  navigate('/');
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline inline-flex items-center gap-1"
              >
                <span>Direct Access to Dashboard as {selectedRole.toUpperCase()}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
