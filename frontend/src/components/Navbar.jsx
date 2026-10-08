import React from 'react';
import { Gauge, ShieldCheck, Database, Plus, MapPin, Fuel } from 'lucide-react';

export function Navbar({ currentView, setCurrentView, sites, selectedSiteId, setSelectedSiteId, onOpenAddAsset }) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black">
              <Fuel className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-100 tracking-tight">HydroSafe</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Compliance OS
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">CNG Hydrotesting & Cylinder Lifecycle Management</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                currentView === 'dashboard'
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Gauge className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setCurrentView('assets')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                currentView === 'assets' || currentView === 'asset_detail'
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Assets</span>
            </button>
          </nav>

          {/* Station Filter & CTA */}
          <div className="flex items-center gap-3">
            <div className="relative hidden md:flex items-center">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <select
                value={selectedSiteId || ''}
                onChange={(e) => setSelectedSiteId(e.target.value ? Number(e.target.value) : null)}
                className="pl-9 pr-8 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
              >
                <option value="">All Stations ({sites.length})</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onOpenAddAsset}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white text-xs font-semibold rounded-lg shadow-md shadow-cyan-600/20 transition transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Register Asset</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
