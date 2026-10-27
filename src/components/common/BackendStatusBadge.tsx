import React from 'react';
import { Server, RefreshCw, WifiOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface BackendStatusBadgeProps {
  compact?: boolean;
}

export const BackendStatusBadge: React.FC<BackendStatusBadgeProps> = ({ compact = false }) => {
  const { backendConnected, isCheckingBackend, backendLatencyMs, checkBackendConnection } = useApp();

  if (isCheckingBackend) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
        <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
        <span className="hidden sm:inline">Connecting API...</span>
        <span className="sm:hidden">Connecting</span>
      </span>
    );
  }

  if (backendConnected) {
    return (
      <div className="group relative inline-flex items-center">
        <button
          onClick={() => checkBackendConnection()}
          title="MERN server connected. Click to refresh health."
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs hover:bg-emerald-100/70 transition-colors cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Server className="w-3 h-3 text-emerald-600" />
          <span className="hidden sm:inline">MERN Online</span>
          <span className="sm:hidden">API Online</span>
          {backendLatencyMs !== null && (
            <span className="hidden md:inline font-mono text-[10px] text-emerald-600 opacity-80">
              {backendLatencyMs}ms
            </span>
          )}
        </button>
      </div>
    );
  }

  // Offline / Fallback Demo Mode
  return (
    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/90 shadow-2xs">
      <span className="w-2 h-2 rounded-full bg-amber-500" />
      <WifiOff className="w-3 h-3 text-amber-600" />
      <span className="hidden sm:inline">
        {compact ? 'Demo Mode' : 'Backend: Offline (Demo Fallback)'}
      </span>
      <span className="sm:hidden">Demo Fallback</span>
      <button
        onClick={() => checkBackendConnection()}
        title="Retry connection to backend server"
        className="ml-1 p-0.5 text-amber-700 hover:text-amber-900 rounded hover:bg-amber-100 transition-colors cursor-pointer"
        aria-label="Retry backend connection"
      >
        <RefreshCw className="w-3 h-3" />
      </button>
    </div>
  );
};
