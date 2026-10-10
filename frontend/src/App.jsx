import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { AssetsListPage } from './pages/AssetsListPage';
import { AssetDetailPage } from './pages/AssetDetailPage';
import { VehicleScan } from './pages/VehicleScan';
import { ConfirmPlate } from './pages/ConfirmPlate';
import { ScanResult } from './pages/ScanResult';
import { ScanHistory } from './pages/ScanHistory';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';
import { PendingApproval } from './pages/PendingApproval';
import { ResetPassword } from './pages/ResetPassword';
import { Profile } from './pages/Profile';
import { AdminUsers } from './pages/AdminUsers';
import AdminStations from './pages/AdminStations';
import AuditLog from './pages/AuditLog';
import { AssetModal } from './components/AssetModal';
import { HydrotestModal } from './components/HydrotestModal';
import { api } from './api/client';
import { scansApi } from './api/scans';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

function AppContent() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  // Navigation view state
  const [currentView, setCurrentView] = useState('dashboard');
  const [authView, setAuthView] = useState('signin'); // 'signin', 'signup', 'pending', 'forgot'
  const [pendingEmail, setPendingEmail] = useState('');

  // Scan workflow state
  const [activeScanData, setActiveScanData] = useState(null);
  const [scanResultData, setScanResultData] = useState(null);

  // Asset & Site state
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [initialFilterStatus, setInitialFilterStatus] = useState('');
  const [sites, setSites] = useState([]);
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [recordTestAsset, setRecordTestAsset] = useState(null);

  // Global Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSites = async () => {
    try {
      const data = await api.getSites();
      setSites(data);
    } catch (err) {
      console.error('Failed to load sites:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchSites();
    }
  }, [isAuthenticated]);

  // Set default landing view based on user role upon signin
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'OPERATOR') {
        setCurrentView('scan');
      } else if (user.role === 'ADMIN') {
        setCurrentView('admin_users');
      } else {
        setCurrentView('dashboard');
      }
    }
  }, [isAuthenticated, user?.role]);

  const handleSelectAsset = (assetId) => {
    setSelectedAssetId(assetId);
    setCurrentView('asset_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRecordTestForAsset = async (assetId) => {
    try {
      const asset = await api.getAssetDetail(assetId);
      setRecordTestAsset(asset);
    } catch (err) {
      showToast(err.message || 'Could not load asset', 'error');
    }
  };

  const handleNavigateToAssetsWithFilter = (status) => {
    setInitialFilterStatus(status);
    setCurrentView('assets');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAssetSaved = (newAsset) => {
    showToast(`Asset '${newAsset.asset_id}' registered successfully.`);
    fetchSites();
    handleSelectAsset(newAsset.id);
  };

  const handleTestRecorded = (newTest) => {
    showToast(`Hydrotest recorded for certificate '${newTest.certificate_number}'.`);
    if (selectedAssetId) {
      setSelectedAssetId(selectedAssetId);
    }
  };

  const handleManualEntered = async (plate) => {
    try {
      const stnId = user?.assigned_stations?.[0]?.id || selectedSiteId || null;
      const res = await scansApi.manualCheck(plate, stnId);
      setScanResultData(res);
      setCurrentView('scan_result');
    } catch (err) {
      showToast(err.message || 'Lookup failed', 'error');
    }
  };

  const handleSelectScan = async (scanId) => {
    try {
      const detail = await scansApi.getScanDetail(scanId);
      setScanResultData(detail);
      setCurrentView('scan_result');
    } catch (err) {
      showToast(err.message || 'Could not load scan details', 'error');
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center gap-3 text-cyan-400">
        <Loader2 className="w-10 h-10 animate-spin" />
        <p className="text-sm font-semibold tracking-wide text-slate-300">Initializing HydroSafe Compliance OS...</p>
      </div>
    );
  }

  // Unauthenticated screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-cyan-500 selection:text-black">
        {authView === 'signin' && (
          <SignIn
            onNavigateToSignUp={() => setAuthView('signup')}
            onNavigateToForgot={() => setAuthView('forgot')}
            onSignedIn={() => {}}
          />
        )}

        {authView === 'signup' && (
          <SignUp
            onNavigateToSignIn={() => setAuthView('signin')}
            onSignedUp={(email) => {
              setPendingEmail(email);
              setAuthView('pending');
            }}
          />
        )}

        {authView === 'pending' && (
          <PendingApproval
            email={pendingEmail}
            onBackToSignIn={() => setAuthView('signin')}
          />
        )}

        {authView === 'forgot' && (
          <ResetPassword
            onBackToSignIn={() => setAuthView('signin')}
          />
        )}

        <footer className="mt-8 text-center text-xs text-slate-500">
          <p>HydroSafe • Petroleum and Explosives Safety Organisation (PESO) Compliance Engine</p>
        </footer>
      </div>
    );
  }

  // Authenticated screen
  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Navbar with role gate */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        sites={sites}
        selectedSiteId={selectedSiteId}
        setSelectedSiteId={setSelectedSiteId}
        onOpenAddAsset={() => setIsAddAssetOpen(true)}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* OPERATOR & SCAN FLOW */}
        {currentView === 'scan' && (
          <VehicleScan
            onScanCompleted={(scan) => {
              setActiveScanData(scan);
              setCurrentView('confirm_plate');
            }}
            onManualEntered={handleManualEntered}
            onNavigateToHistory={() => setCurrentView('scan_history')}
            onNavigateToProfile={() => setCurrentView('profile')}
          />
        )}

        {currentView === 'confirm_plate' && (
          <ConfirmPlate
            scanData={activeScanData}
            onConfirmed={(res) => {
              setScanResultData(res);
              setCurrentView('scan_result');
            }}
            onBack={() => setCurrentView('scan')}
          />
        )}

        {currentView === 'scan_result' && (
          <ScanResult
            result={scanResultData}
            onScanNext={() => setCurrentView('scan')}
            onViewAsset={(id) => handleSelectAsset(id)}
            onBack={() => setCurrentView('scan')}
          />
        )}

        {currentView === 'scan_history' && (
          <ScanHistory
            onBack={() => setCurrentView(user?.role === 'OPERATOR' ? 'scan' : 'dashboard')}
            onSelectScan={handleSelectScan}
          />
        )}

        {/* MANAGEMENT & DASHBOARD */}
        {currentView === 'dashboard' && (
          <DashboardPage
            selectedSiteId={selectedSiteId}
            onSelectAsset={handleSelectAsset}
            onRecordTestForAsset={handleRecordTestForAsset}
            onNavigateToAssets={handleNavigateToAssetsWithFilter}
          />
        )}

        {currentView === 'assets' && (
          <AssetsListPage
            sites={sites}
            selectedSiteId={selectedSiteId}
            initialFilterStatus={initialFilterStatus}
            onSelectAsset={handleSelectAsset}
            onRecordTestForAsset={handleRecordTestForAsset}
            onOpenAddAsset={() => setIsAddAssetOpen(true)}
          />
        )}

        {currentView === 'asset_detail' && (
          <AssetDetailPage
            assetId={selectedAssetId}
            onBack={() => setCurrentView('assets')}
            onRecordTestForAsset={handleRecordTestForAsset}
          />
        )}

        {/* ADMIN VIEWS */}
        {currentView === 'admin_users' && (
          <AdminUsers
            onBack={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'admin_stations' && (
          <AdminStations />
        )}

        {/* AUDIT LOG */}
        {currentView === 'audit_log' && (
          <AuditLog />
        )}

        {/* PROFILE */}
        {currentView === 'profile' && (
          <Profile
            onBack={() => setCurrentView(user?.role === 'OPERATOR' ? 'scan' : 'dashboard')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-4 mt-auto text-center text-xs text-slate-500">
        <p>HydroSafe Compliance Operating System • PESO Hydrotest Standards & VAHAN Integration</p>
      </footer>

      {/* Global Modals */}
      <AssetModal
        isOpen={isAddAssetOpen}
        onClose={() => setIsAddAssetOpen(false)}
        sites={sites}
        onAssetSaved={handleAssetSaved}
      />

      {recordTestAsset && (
        <HydrotestModal
          isOpen={Boolean(recordTestAsset)}
          onClose={() => setRecordTestAsset(null)}
          asset={recordTestAsset}
          onTestRecorded={handleTestRecorded}
        />
      )}

      {/* Global Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md bg-slate-900 border border-slate-700 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
