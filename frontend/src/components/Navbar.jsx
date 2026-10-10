import React, { useState } from 'react';
import { 
  Fuel, Gauge, Database, Plus, MapPin, Scan, History, 
  Users, Building2, FileText, User, LogOut, Menu, X, Shield 
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export function Navbar({ 
  currentView, 
  setCurrentView, 
  sites = [], 
  selectedSiteId, 
  setSelectedSiteId, 
  onOpenAddAsset 
}) {
  const { user, signout, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const role = user?.role || 'OPERATOR';

  const handleNav = (view) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOut = async () => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    await signout();
    setCurrentView('signin');
  };

  const getRoleBadgeColor = (r) => {
    switch (r) {
      case 'ADMIN': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'AUDITOR': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'MANAGER': return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      default: return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-md sticky top-0 z-40">
      <div className="w-full max-w-[1750px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer select-none shrink-0" 
            onClick={() => handleNav(role === 'OPERATOR' ? 'scan' : 'dashboard')}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black shrink-0">
              <Fuel className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base sm:text-lg text-slate-100 tracking-tight">HydroSafe</span>
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Compliance OS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden md:block">CNG Hydrotest & Vehicle Verification</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          {isAuthenticated && (
            <nav className="hidden lg:flex items-center gap-1 shrink min-w-0 overflow-hidden">
              {/* OPERATOR links */}
              {role === 'OPERATOR' && (
                <>
                  <button
                    onClick={() => handleNav('scan')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer min-h-[40px] shrink-0 ${
                      currentView === 'scan' || currentView === 'confirm_plate' || currentView === 'scan_result'
                        ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Scan className="w-4 h-4 text-emerald-400" />
                    <span>Vehicle Scan</span>
                  </button>

                  <button
                    onClick={() => handleNav('scan_history')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer min-h-[40px] shrink-0 ${
                      currentView === 'scan_history'
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <History className="w-4 h-4 text-cyan-400" />
                    <span>Scan History</span>
                  </button>
                </>
              )}

              {/* MANAGER links */}
              {role === 'MANAGER' && (
                <>
                  <button
                    onClick={() => handleNav('dashboard')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                      currentView === 'dashboard'
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Gauge className="w-4 h-4" />
                    <span>Dashboard</span>
                  </button>

                  <button
                    onClick={() => handleNav('scan')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                      currentView === 'scan' || currentView === 'confirm_plate' || currentView === 'scan_result'
                        ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Scan className="w-4 h-4 text-emerald-400" />
                    <span>New Scan</span>
                  </button>

                  <button
                    onClick={() => handleNav('scan_history')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                      currentView === 'scan_history'
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <History className="w-4 h-4" />
                    <span>Checks</span>
                  </button>

                  <button
                    onClick={() => handleNav('assets')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                      currentView === 'assets' || currentView === 'asset_detail'
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Database className="w-4 h-4" />
                    <span>Assets</span>
                  </button>
                </>
              )}

              {/* AUDITOR links */}
              {role === 'AUDITOR' && (
                <>
                  <button
                    onClick={() => handleNav('dashboard')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                      currentView === 'dashboard'
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Gauge className="w-4 h-4" />
                    <span>Dashboard</span>
                  </button>

                  <button
                    onClick={() => handleNav('scan_history')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                      currentView === 'scan_history'
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <History className="w-4 h-4" />
                    <span>Scans</span>
                  </button>

                  <button
                    onClick={() => handleNav('assets')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                      currentView === 'assets' || currentView === 'asset_detail'
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Database className="w-4 h-4" />
                    <span>Assets</span>
                  </button>

                  <button
                    onClick={() => handleNav('audit_log')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                      currentView === 'audit_log'
                        ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Audit Ledger</span>
                  </button>
                </>
              )}

              {/* ADMIN links */}
              {role === 'ADMIN' && (
                <>
                  <button
                    onClick={() => handleNav('scan')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                      currentView === 'scan' || currentView === 'confirm_plate' || currentView === 'scan_result'
                        ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Scan className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Vehicle Scan</span>
                  </button>

                  <button
                    onClick={() => handleNav('scan_history')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                      currentView === 'scan_history'
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <History className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Scans</span>
                  </button>

                  <button
                    onClick={() => handleNav('dashboard')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                      currentView === 'dashboard'
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Gauge className="w-3.5 h-3.5" />
                    <span>Dashboard</span>
                  </button>

                  <button
                    onClick={() => handleNav('assets')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                      currentView === 'assets' || currentView === 'asset_detail'
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Assets</span>
                  </button>

                  <button
                    onClick={() => handleNav('admin_users')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                      currentView === 'admin_users'
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Users</span>
                  </button>

                  <button
                    onClick={() => handleNav('admin_stations')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                      currentView === 'admin_stations'
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Branches</span>
                  </button>

                  <button
                    onClick={() => handleNav('audit_log')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                      currentView === 'audit_log'
                        ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Audit</span>
                  </button>
                </>
              )}
            </nav>
          )}

          {/* Right Section: Station, Action CTA, User Dropdown */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {isAuthenticated ? (
              <>
                {/* Station Filter for Managers/Admins */}
                {(role === 'MANAGER' || role === 'ADMIN' || role === 'AUDITOR') && sites.length > 0 && (
                  <div className="relative hidden 2xl:flex items-center shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                    <select
                      value={selectedSiteId || ''}
                      onChange={(e) => setSelectedSiteId(e.target.value ? Number(e.target.value) : null)}
                      className="pl-8 pr-7 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                    >
                      <option value="">All Stations ({sites.length})</option>
                      {sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Register Asset CTA (Managers/Admins only) */}
                {(role === 'MANAGER' || role === 'ADMIN') && onOpenAddAsset && (
                  <button
                    onClick={onOpenAddAsset}
                    className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white text-xs font-semibold rounded-lg shadow-md transition transform active:scale-95 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Register Asset</span>
                  </button>
                )}

                {/* User Info & Direct Sign Out */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    onClick={() => handleNav('profile')}
                    title="View Profile & Settings"
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 hover:border-cyan-500/50 transition cursor-pointer min-h-[38px] shrink-0"
                  >
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center font-bold text-xs text-white uppercase shadow-sm shrink-0">
                      {user?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="text-left hidden md:block">
                      <div className="text-xs font-semibold text-slate-200 leading-tight truncate max-w-[110px]">
                        {user?.full_name || 'User'}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`text-[9px] font-bold px-1 py-0.2 rounded border ${getRoleBadgeColor(role)}`}>
                          {role}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Guaranteed Visible Logout Button */}
                  <button
                    onClick={handleSignOut}
                    title="Sign Out / Logout"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500 hover:text-white transition font-bold text-xs cursor-pointer min-h-[38px] shrink-0 shadow-sm"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span className="inline">Logout</span>
                  </button>
                </div>

                {/* Mobile Menu Toggle Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center shrink-0"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNav('signin')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleNav('signup')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu (Touch Targets >= 48px) */}
      {mobileMenuOpen && isAuthenticated && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-900/98 px-4 pt-3 pb-6 space-y-2">
          {role === 'OPERATOR' && (
            <>
              <button
                onClick={() => handleNav('scan')}
                className="w-full min-h-[48px] flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-600/20 text-emerald-300 font-semibold text-sm border border-emerald-500/30"
              >
                <Scan className="w-5 h-5 text-emerald-400" />
                <span>Vehicle Scan</span>
              </button>
              <button
                onClick={() => handleNav('scan_history')}
                className="w-full min-h-[48px] flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-700"
              >
                <History className="w-5 h-5 text-cyan-400" />
                <span>Scan History</span>
              </button>
            </>
          )}

          {role === 'MANAGER' && (
            <>
              <button
                onClick={() => handleNav('dashboard')}
                className="w-full min-h-[48px] flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 text-slate-200 font-semibold text-sm"
              >
                <Gauge className="w-5 h-5 text-cyan-400" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => handleNav('scan')}
                className="w-full min-h-[48px] flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-600/20 text-emerald-300 font-semibold text-sm"
              >
                <Scan className="w-5 h-5 text-emerald-400" />
                <span>Vehicle Scan</span>
              </button>
              <button
                onClick={() => handleNav('scan_history')}
                className="w-full min-h-[48px] flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 text-slate-200 font-semibold text-sm"
              >
                <History className="w-5 h-5 text-cyan-400" />
                <span>Vehicle Checks</span>
              </button>
              <button
                onClick={() => handleNav('assets')}
                className="w-full min-h-[48px] flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 text-slate-200 font-semibold text-sm"
              >
                <Database className="w-5 h-5 text-teal-400" />
                <span>Assets</span>
              </button>
            </>
          )}

          {role === 'AUDITOR' && (
            <>
              <button
                onClick={() => handleNav('dashboard')}
                className="w-full min-h-[48px] flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 text-slate-200 font-semibold text-sm"
              >
                <Gauge className="w-5 h-5 text-cyan-400" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => handleNav('scan_history')}
                className="w-full min-h-[48px] flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 text-slate-200 font-semibold text-sm"
              >
                <History className="w-5 h-5 text-cyan-400" />
                <span>Vehicle Checks</span>
              </button>
              <button
                onClick={() => handleNav('assets')}
                className="w-full min-h-[48px] flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 text-slate-200 font-semibold text-sm"
              >
                <Database className="w-5 h-5 text-teal-400" />
                <span>Assets</span>
              </button>
              <button
                onClick={() => handleNav('audit_log')}
                className="w-full min-h-[48px] flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-600/20 text-amber-300 font-semibold text-sm"
              >
                <FileText className="w-5 h-5 text-amber-400" />
                <span>Audit Ledger</span>
              </button>
            </>
          )}

          {role === 'ADMIN' && (
            <>
              <button
                onClick={() => handleNav('scan')}
                className="w-full min-h-[48px] flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-600/20 text-emerald-300 font-semibold text-sm border border-emerald-500/30"
              >
                <Scan className="w-5 h-5 text-emerald-400" />
                <span>Vehicle Scan</span>
              </button>
              <button
                onClick={() => handleNav('scan_history')}
                className="w-full min-h-[48px] flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-700"
              >
                <History className="w-5 h-5 text-cyan-400" />
                <span>Scan History</span>
              </button>
              <button
                onClick={() => handleNav('dashboard')}
                className="w-full min-h-[48px] flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 text-slate-200 font-semibold text-sm"
              >
                <Gauge className="w-5 h-5 text-cyan-400" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => handleNav('admin_users')}
                className="w-full min-h-[48px] flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 text-slate-200 font-semibold text-sm"
              >
                <Users className="w-5 h-5 text-cyan-400" />
                <span>User Management</span>
              </button>
              <button
                onClick={() => handleNav('admin_stations')}
                className="w-full min-h-[48px] flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 text-slate-200 font-semibold text-sm"
              >
                <Building2 className="w-5 h-5 text-emerald-400" />
                <span>Branch Management</span>
              </button>
              <button
                onClick={() => handleNav('audit_log')}
                className="w-full min-h-[48px] flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-600/20 text-amber-300 font-semibold text-sm"
              >
                <FileText className="w-5 h-5 text-amber-400" />
                <span>Audit Ledger</span>
              </button>
            </>
          )}

          <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
            <button
              onClick={() => handleNav('profile')}
              className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold"
            >
              Profile
            </button>
            <button
              onClick={handleSignOut}
              className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl bg-rose-500/20 text-rose-300 text-xs font-semibold"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
