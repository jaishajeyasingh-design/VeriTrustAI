import React from 'react';
import type { ApplicationStatus } from '../../types';

interface StatusBadgeProps {
  status: ApplicationStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showDot = true
}) => {
  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  switch (status) {
    case 'Verified':
    case 'Processed':
    case 'Enabled':
    case 'Completed':
    case 'Active':
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
      dotColor = 'bg-emerald-500';
      break;

    case 'Needs Review':
    case 'Flagged':
    case 'Warning':
      colorClasses = 'bg-amber-50 text-amber-800 border-amber-200/90';
      dotColor = 'bg-amber-500';
      break;

    case 'Pending':
    case 'Processing':
    case 'In Progress':
      colorClasses = 'bg-blue-50 text-blue-700 border-blue-200/80';
      dotColor = 'bg-blue-500 animate-pulse';
      break;

    case 'Rejected':
    case 'Failed':
    case 'Disabled':
    case 'High':
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200/80';
      dotColor = 'bg-rose-500';
      break;

    case 'Low':
      colorClasses = 'bg-slate-100 text-slate-600 border-slate-200';
      dotColor = 'bg-slate-400';
      break;

    case 'Medium':
      colorClasses = 'bg-orange-50 text-orange-700 border-orange-200';
      dotColor = 'bg-orange-500';
      break;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-medium'
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-2xs transition-colors ${sizeClasses} ${colorClasses}`}
    >
      {showDot && (
        <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      )}
      <span>{status}</span>
    </span>
  );
};
