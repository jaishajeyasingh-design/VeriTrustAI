import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  FileSpreadsheet,
  PlusCircle,
  FileCheck2,
  Scale,
  FileText,
  History,
  Settings,
  LogOut,
  ChevronRight,
  ExternalLink,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { userProfile, currentRole, applications } = useApp();
  const navigate = useNavigate();

  const needsReviewCount = applications.filter((a) => a.status === 'Needs Review').length;

  const navItems = [
    {
      label: 'Overview',
      path: '/',
      icon: LayoutDashboard,
      badge: null
    },
    {
      label: 'Applications',
      path: '/applications',
      icon: FileSpreadsheet,
      badge: needsReviewCount > 0 ? `${needsReviewCount} review` : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    },
    {
      label: 'New Verification',
      path: '/new-verification',
      icon: PlusCircle,
      badge: 'Step 1-4',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    },
    {
      label: 'Document Vault',
      path: '/vault',
      icon: FileCheck2,
      badge: null
    },
    {
      label: 'Compliance Rules',
      path: '/rules',
      icon: Scale,
      badge: 'Demo',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
    },
    {
      label: 'Verification Reports',
      path: '/reports',
      icon: FileText,
      badge: null
    },
    {
      label: 'Audit Trail',
      path: '/audit',
      icon: History,
      badge: null
    },
    {
      label: 'Settings',
      path: '/settings',
      icon: Settings,
      badge: null
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0B132B] text-slate-300 flex flex-col border-r border-slate-800/70 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80 bg-[#080E20]">
          <NavLink
            to="/"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 p-0.5 shadow-md shadow-blue-500/30 flex items-center justify-center">
              <div className="w-full h-full bg-[#0B132B] rounded-[10px] flex items-center justify-center group-hover:bg-transparent transition-colors">
                <Shield className="w-5 h-5 text-sky-400 group-hover:text-white transition-colors" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base text-white tracking-tight">VeriTrust</span>
                <span className="text-sky-400 font-extrabold text-base">AI</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide">
                COMPLIANCE & INTEGRITY
              </p>
            </div>
          </NavLink>

          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400/80">
            Platform Modules
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive
                            ? 'text-white'
                            : 'text-slate-400 group-hover:text-sky-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.badge ? (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${
                          isActive
                            ? 'bg-blue-700/60 text-blue-100 border-blue-400/40'
                            : item.badgeColor || 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    ) : (
                      isActive && (
                        <ChevronRight className="w-3.5 h-3.5 text-blue-200" />
                      )
                    )}
                  </>
                )}
              </NavLink>
            );
          })}

          {/* Quick link to Login / Role Switcher module */}
          <div className="pt-4 mt-4 border-t border-slate-800/70">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400/80">
              Authentication & Role
            </div>
            <NavLink
              to="/login"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                <span>Role Switcher (Module 1)</span>
              </div>
              <span className="text-[10px] bg-indigo-900/60 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-700/50 uppercase">
                {currentRole}
              </span>
            </NavLink>
          </div>
        </div>

        {/* Bottom User Card & Quick Role Indicator */}
        <div className="p-3 border-t border-slate-800/80 bg-[#080E20]">
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs">
                CR
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">
                  {userProfile.name}
                </p>
                <p className="text-[10px] text-sky-400 truncate capitalize font-medium">
                  {userProfile.roleLabel}
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/login')}
              title="Sign Out / Switch Role"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
