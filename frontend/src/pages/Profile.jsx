import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { User, Shield, Building, Mail, LogOut, ArrowLeft } from 'lucide-react';

export function Profile({ onBack }) {
  const { user, signout } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-md mx-auto w-full px-4 py-6">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-5">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-white">My Account</h1>
          <p className="text-[11px] text-slate-400">Profile & Assigned Station Scope</p>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center font-bold text-lg">
            {user.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{user.full_name}</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-cyan-400 border border-slate-700">
              {user.role}
            </span>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              <span>Email:</span>
            </span>
            <span className="font-mono text-white">{user.email}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Account Status:</span>
            </span>
            <span className="text-emerald-400 font-semibold">{user.status}</span>
          </div>

          <div className="pt-2">
            <span className="text-slate-400 flex items-center gap-1.5 mb-2">
              <Building className="w-3.5 h-3.5" />
              <span>Assigned Branches:</span>
            </span>
            <div className="space-y-1.5">
              {user.assigned_stations && user.assigned_stations.length > 0 ? (
                user.assigned_stations.map((s) => (
                  <div
                    key={s.id}
                    className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <span className="font-medium text-slate-200">{s.name}</span>
                    <span className="text-[10px] font-mono text-cyan-400">{s.code}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-[11px]">All Branches (Global Access)</p>
              )}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <button
            onClick={signout}
            className="w-full min-h-[48px] rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </div>
    </div>
  );
}
