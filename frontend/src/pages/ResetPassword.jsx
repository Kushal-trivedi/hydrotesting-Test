import React, { useState } from 'react';
import { authApi } from '../api/auth';
import { KeyRound, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export function ResetPassword({ onBackToSignIn }) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState('request'); // 'request' or 'enter_token'
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestLink = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await authApi.forgotPassword(email);
      setStatusMsg(res.message || 'If this email is registered, a password reset link has been issued.');
      setStep('enter_token');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to process request.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!token || !newPassword) return;
    if (newPassword.length < 10) {
      setErrorMsg('Password must be at least 10 characters long.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await authApi.resetPassword({ token, new_password: newPassword });
      setStatusMsg(res.message || 'Password reset successfully.');
      setTimeout(() => {
        onBackToSignIn();
      }, 2000);
    } catch (err) {
      setErrorMsg(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto w-full px-4 py-8">
      <div className="text-center mb-6">
        <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-3">
          <KeyRound className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-white">Reset Password</h1>
        <p className="text-xs text-slate-400 mt-1">
          Single-use reset link expires in 30 minutes.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-md">
        {statusMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleRequestLink} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Account Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@branch.com"
                className="w-full min-h-[48px] px-4 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Send Reset Link</span>}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setStep('enter_token')}
                className="text-xs text-slate-400 hover:text-cyan-400 cursor-pointer"
              >
                Already have a reset token? Enter it here
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Reset Token
              </label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste reset token from server log / email"
                className="w-full min-h-[48px] px-4 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                New Password (min 10 chars)
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full min-h-[48px] px-4 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Update Password</span>}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <button
            onClick={onBackToSignIn}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Sign In</span>
          </button>
        </div>
      </div>
    </div>
  );
}
