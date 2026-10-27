import React from 'react';
import type { PriorityLevel } from '../../types';

interface PriorityBadgeProps {
  priority: PriorityLevel | 'Warning' | 'Info';
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md' }) => {
  let style = 'bg-slate-100 text-slate-700 border-slate-200';
  let dot = 'bg-slate-400';

  if (priority === 'High') {
    style = 'bg-rose-50 text-rose-700 border-rose-200';
    dot = 'bg-rose-500';
  } else if (priority === 'Medium' || priority === 'Warning') {
    style = 'bg-amber-50 text-amber-700 border-amber-200';
    dot = 'bg-amber-500';
  } else if (priority === 'Low' || priority === 'Info') {
    style = 'bg-slate-100 text-slate-600 border-slate-200';
    dot = 'bg-slate-400';
  }

  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-md border ${sizeClass} ${style}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {priority}
    </span>
  );
};
