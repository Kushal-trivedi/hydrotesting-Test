import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';
import { Shield, User, Mail, Phone, Lock, Building, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export function SignUp({ onNavigateToSignIn, onSignedUp }) {
  const { signup } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [requestedRole, setRequestedRole] = useState('OPERATOR');
  const [selectedStationId, setSelectedStationId] = useState('');
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getSites().then((sites) => {
      setStations(sites || []);
      if (sites && sites.length > 0) {
        setSelectedStationId(sites[0].id);
      }
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !password) return;

    if (password.length < 10) {
      setError('Password must be at least 10 characters long.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await signup({
        full_name: fullName,
        email,
        mobile,
        password,
        role: requestedRole,
        station_ids: selectedStationId ? [Number(selectedStationId)] : [],
      });
      setLoading(false);
      if (onSignedUp) onSignedUp({ email, fullName });
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to submit registration request.');
    }
  };

  return (
    <div className="max-w-md mx-auto w-full px-4 py-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-black text-white">Request Access</h1>
        <p className="text-xs text-slate-400 mt-1">
          Accounts require administrator approval before sign in.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-md">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
            <div className="relative">
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ramesh Patel"
                className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-400"
              />
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Work Email</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@branch.com"
                className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-400"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Mobile (Optional)</label>
            <div className="relative">
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-400"
              />
              <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Branch</label>
              <select
                value={selectedStationId}
                onChange={(e) => setSelectedStationId(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
              >
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Requested Role</label>
              <select
                value={requestedRole}
                onChange={(e) => setRequestedRole(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="OPERATOR">Operator (Pump Staff)</option>
                <option value="MANAGER">Manager (Compliance)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Password (min 10 characters)
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-400"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50 mt-3"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting request...</span>
              </>
            ) : (
              <>
                <span>Submit Request</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 pt-3 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Already have an active account?{' '}
            <button
              onClick={onNavigateToSignIn}
              className="text-cyan-400 font-bold hover:underline cursor-pointer ml-1"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
