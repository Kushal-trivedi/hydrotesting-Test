import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { AssetsListPage } from './pages/AssetsListPage';
import { AssetDetailPage } from './pages/AssetDetailPage';
import { AssetModal } from './components/AssetModal';
import { HydrotestModal } from './components/HydrotestModal';
import { api } from './api/client';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'assets', 'asset_detail'
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [initialFilterStatus, setInitialFilterStatus] = useState('');

  const [sites, setSites] = useState([]);
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [recordTestAsset, setRecordTestAsset] = useState(null);

  // Toast notifications
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
    fetchSites();
  }, []);

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
      // Trigger update if on detail page
      setSelectedAssetId(selectedAssetId);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Navbar */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        sites={sites}
        selectedSiteId={selectedSiteId}
        setSelectedSiteId={setSelectedSiteId}
        onOpenAddAsset={() => setIsAddAssetOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
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
