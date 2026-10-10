import React from 'react';
import { Clock, ShieldAlert, ArrowLeft, Mail } from 'lucide-react';

export function PendingApproval({ email = '', onBackToSignIn }) {
  return (
    <div className="max-w-md mx-auto w-full px-4 py-12 text-center">
      <div className="inline-flex p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-5 shadow-xl shadow-amber-500/10 animate-bounce">
        <Clock className="w-10 h-10" />
      </div>

      <h1 className="text-2xl font-black text-white">Account Under Review</h1>
      <p className="text-sm text-slate-300 mt-2">
        Your registration request has been submitted to the branch administrator.
      </p>

      <div className="mt-6 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 text-left space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Account Email:</span>
          <span className="font-mono font-bold text-white">{email || 'Submitted email'}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Current Status:</span>
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
            PENDING APPROVAL
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Review SLA:</span>
          <span className="text-slate-300">Within 24 hours</span>
        </div>
        <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
          For urgent pump activation, contact your branch manager or system administrator at{' '}
          <strong className="text-cyan-400">admin@hydrosafe.com</strong>.
        </div>
      </div>

      <div className="mt-8">
        <button
          onClick={onBackToSignIn}
          className="inline-flex items-center gap-2 px-6 py-3 min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs cursor-pointer transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Sign In</span>
        </button>
      </div>
    </div>
  );
}
