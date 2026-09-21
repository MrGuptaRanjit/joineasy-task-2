import React from 'react';
import { Clock, CheckCircle2, Award, AlertCircle } from 'lucide-react';

export default function StatusBadge({ status, size = 'md' }) {
  const norm = (status || 'PENDING').toUpperCase();

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  switch (norm) {
    case 'ACKNOWLEDGED':
      return (
        <span className={`inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 ${sizeClasses[size]}`}>
          <Award className={iconSizes[size]} />
          <span>Acknowledged ✓</span>
        </span>
      );
    case 'SUBMITTED':
      return (
        <span className={`inline-flex items-center rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 ${sizeClasses[size]}`}>
          <CheckCircle2 className={iconSizes[size]} />
          <span>Submitted</span>
        </span>
      );
    case 'OVERDUE':
      return (
        <span className={`inline-flex items-center rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 ${sizeClasses[size]}`}>
          <AlertCircle className={iconSizes[size]} />
          <span>Overdue</span>
        </span>
      );
    case 'PENDING':
    default:
      return (
        <span className={`inline-flex items-center rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 ${sizeClasses[size]}`}>
          <Clock className={iconSizes[size]} />
          <span>Pending</span>
        </span>
      );
  }
}
