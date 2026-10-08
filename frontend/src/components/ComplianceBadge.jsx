import React from 'react';
import { CheckCircle2, AlertTriangle, Clock, XCircle, HelpCircle } from 'lucide-react';

export function ComplianceBadge({ status, size = 'md' }) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 font-medium gap-1',
    md: 'text-xs px-2.5 py-1 font-semibold gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 font-bold gap-2',
  }[size] || 'text-xs px-2.5 py-1 font-semibold gap-1.5';

  switch (status) {
    case 'VALID':
      return (
        <span className={`inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 ${sizeClasses}`}>
          <CheckCircle2 className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
          VALID
        </span>
      );
    case 'DUE_SOON':
      return (
        <span className={`inline-flex items-center rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 ${sizeClasses}`}>
          <Clock className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
          DUE SOON
        </span>
      );
    case 'OVERDUE':
      return (
        <span className={`inline-flex items-center rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 ${sizeClasses}`}>
          <AlertTriangle className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
          OVERDUE
        </span>
      );
    case 'FAILED':
      return (
        <span className={`inline-flex items-center rounded-full bg-red-600/20 text-red-300 border border-red-500/40 ${sizeClasses}`}>
          <XCircle className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
          FAILED
        </span>
      );
    case 'PENDING':
    default:
      return (
        <span className={`inline-flex items-center rounded-full bg-slate-500/15 text-slate-300 border border-slate-500/30 ${sizeClasses}`}>
          <HelpCircle className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
          PENDING
        </span>
      );
  }
}

export function VerificationBadge({ status }) {
  switch (status) {
    case 'VERIFIED':
      return (
        <span className="inline-flex items-center gap-1 rounded bg-teal-500/15 px-2 py-0.5 text-xs font-medium text-teal-300 border border-teal-500/30">
          <CheckCircle2 className="w-3 h-3" />
          VERIFIED
        </span>
      );
    case 'MISMATCH':
      return (
        <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300 border border-amber-500/30">
          <AlertTriangle className="w-3 h-3" />
          MISMATCH
        </span>
      );
    case 'UNAVAILABLE':
      return (
        <span className="inline-flex items-center gap-1 rounded bg-slate-500/15 px-2 py-0.5 text-xs font-medium text-slate-400 border border-slate-500/30">
          <HelpCircle className="w-3 h-3" />
          UNAVAILABLE
        </span>
      );
    case 'NOT_VERIFIED':
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded bg-gray-500/10 px-2 py-0.5 text-xs font-medium text-gray-400 border border-gray-700">
          NOT VERIFIED
        </span>
      );
  }
}
