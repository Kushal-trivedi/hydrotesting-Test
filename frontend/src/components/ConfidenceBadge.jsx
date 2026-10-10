import React from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle } from 'lucide-react';

export function ConfidenceBadge({ level = 'MEDIUM', score = null, showScore = false }) {
  const normalizedLevel = (level || 'MEDIUM').toUpperCase();

  const configs = {
    HIGH: {
      label: 'High Confidence',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      icon: ShieldCheck,
    },
    MEDIUM: {
      label: 'Medium Confidence',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      icon: AlertTriangle,
    },
    LOW: {
      label: 'LOW (!)',
      badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse',
      icon: AlertCircle,
    },
  };

  const current = configs[normalizedLevel] || configs.MEDIUM;
  const IconComponent = current.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${current.badgeClass}`}
    >
      <IconComponent className="w-3.5 h-3.5" />
      <span>{current.label}</span>
      {showScore && score !== null && (
        <span className="opacity-75 font-mono text-[11px]">({Math.round(score * 100)}%)</span>
      )}
    </span>
  );
}
