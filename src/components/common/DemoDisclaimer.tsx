import React from 'react';
import { AlertCircle, Cpu, CheckCircle2 } from 'lucide-react';

interface DemoDisclaimerProps {
  variant?: 'banner' | 'pill' | 'subtle';
  moduleName?: string;
}

export const DemoDisclaimer: React.FC<DemoDisclaimerProps> = ({
  variant = 'pill',
  moduleName
}) => {
  if (variant === 'banner') {
    return (
      <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-sky-50/90 border border-blue-200/80 rounded-xl p-3.5 px-4 mb-5 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 text-blue-700 rounded-lg shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
              <span>Simulated AI Verification Engine</span>
              <span className="bg-blue-200 text-blue-800 text-[10px] px-1.5 py-0.2 rounded font-bold">
                DEMO MODE
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              All OCR extraction, authenticity scoring, and cross-document compliance findings shown in {moduleName || 'this module'} are simulated mock results designed for UI evaluation. Real OCR & validation will execute once connected to the FastAPI backend.
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0 text-xs font-medium text-blue-700 bg-white/80 px-3 py-1.5 rounded-lg border border-blue-200/60 shadow-2xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
          FastAPI Ready
        </div>
      </div>
    );
  }

  if (variant === 'subtle') {
    return (
      <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-100/80 border border-slate-200/70 px-2.5 py-1 rounded-md">
        <AlertCircle className="w-3 h-3 text-amber-500" />
        <span>Simulated AI Results • Mock Pipeline</span>
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-200 shadow-2xs">
      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
      <span>Simulated AI Results (Demo Mode)</span>
    </span>
  );
};
