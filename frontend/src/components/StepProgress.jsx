import React from 'react';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';

export function StepProgress({ activeStep = 1 }) {
  // 1: Reading frames, 2: Finding plate, 3: Reading text
  const steps = [
    { id: 1, title: 'Reading sharp frames' },
    { id: 2, title: 'Finding license plate' },
    { id: 3, title: 'Reading text & normalizing' },
  ];

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur-md">
      <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
        Analyzing Media Stream
      </p>
      <div className="space-y-3">
        {steps.map((s) => {
          const isDone = activeStep > s.id;
          const isCurrent = activeStep === s.id;

          return (
            <div
              key={s.id}
              className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                isCurrent
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200'
                  : isDone
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                  : 'bg-slate-950/40 border-slate-850 text-slate-500'
              }`}
            >
              <div className="flex-shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : isCurrent ? (
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-600" />
                )}
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium">{s.title}</span>
              </div>
              {isCurrent && (
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 animate-pulse">
                  Processing
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
