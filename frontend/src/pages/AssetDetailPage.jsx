import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, FileCheck, RefreshCw, AlertTriangle, ShieldCheck, 
  Clock, XCircle, Calendar, Hash, MapPin, Database, Layers, CheckCircle2 
} from 'lucide-react';
import { api } from '../api/client';
import { ComplianceBadge } from '../components/ComplianceBadge';
import { VehicleCard } from '../components/VehicleCard';
import { HydrotestTimeline } from '../components/HydrotestTimeline';

export function AssetDetailPage({ assetId, onBack, onRecordTestForAsset }) {
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAsset = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAssetDetail(assetId);
      setAsset(res);
    } catch (err) {
      setError(err.message || 'Failed to load asset details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (assetId) {
      fetchAsset();
    }
  }, [assetId]);

  if (loading && !asset) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Loading asset dossier & test records...</p>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="my-8 p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 max-w-xl mx-auto text-center">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-400" />
        <h3 className="font-bold text-base">Error Loading Asset</h3>
        <p className="text-xs text-rose-300/80 mt-1">{error || 'Asset not found'}</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold"
        >
          Return to Registry
        </button>
      </div>
    );
  }

  const handleTestVerified = (testId, verificationResult) => {
    fetchAsset(); // Refresh asset and test list with updated verification status
  };

  const handleVehicleUpdated = (updatedAsset) => {
    setAsset((prev) => ({
      ...prev,
      ...updatedAsset,
    }));
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Assets Directory</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onRecordTestForAsset(asset.id)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold rounded-lg shadow-md shadow-emerald-600/20 transition"
          >
            <FileCheck className="w-4 h-4" />
            <span>+ Record New Hydrotest</span>
          </button>
        </div>
      </div>

      {/* Asset Dossier Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-slate-100 font-mono tracking-wider">
                {asset.asset_id}
              </h1>
              <ComplianceBadge status={asset.compliance_status} size="lg" />
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-xs font-semibold border border-slate-700">
                {asset.status}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <strong className="text-slate-200">{asset.site_name || 'Station'}</strong>
              </span>
              <span>•</span>
              <span className="px-2 py-0.5 rounded bg-slate-800/80 text-cyan-300 font-mono text-[11px]">
                {asset.asset_type.replace('_', ' ')}
              </span>
              <span>•</span>
              <span>Serial: <strong className="font-mono text-slate-200">{asset.serial_number}</strong></span>
              {asset.cylinder_number && (
                <>
                  <span>•</span>
                  <span>Cylinder Mark: <strong className="font-mono text-slate-200">{asset.cylinder_number}</strong></span>
                </>
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 self-start md:self-auto">
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Next Test Due</span>
              <span className="font-bold text-sm text-slate-100 font-mono">
                {asset.next_due_date || 'No Test Recorded'}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <span className="text-[11px] text-slate-400 block">Timeline History</span>
              <span className="font-bold text-sm text-cyan-400 font-mono">
                {asset.total_tests} Test{asset.total_tests !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Attention Alert Banner */}
        <div className="mt-5">
          {asset.compliance_status === 'OVERDUE' && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
                <span>
                  <strong>CRITICAL SAFETY RISK:</strong> Hydrostatic certification expired {Math.abs(asset.days_remaining || 0)} days ago. 
                  Equipment must not be pressurized until re-certified by an accredited testing facility.
                </span>
              </div>
              <button
                onClick={() => onRecordTestForAsset(asset.id)}
                className="px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shrink-0"
              >
                Perform Test Now
              </button>
            </div>
          )}

          {asset.compliance_status === 'DUE_SOON' && (
            <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 shrink-0 text-amber-400" />
                <span>
                  <strong>EXPIRING SOON:</strong> Hydrostatic test certification expires in {asset.days_remaining} days ({asset.next_due_date}). 
                  Pre-schedule inspection to maintain station operational compliance.
                </span>
              </div>
              <button
                onClick={() => onRecordTestForAsset(asset.id)}
                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shrink-0"
              >
                Schedule Retest
              </button>
            </div>
          )}

          {asset.compliance_status === 'FAILED' && (
            <div className="p-3.5 rounded-xl bg-red-600/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-2.5">
              <XCircle className="w-5 h-5 shrink-0 text-red-400" />
              <span>
                <strong>CYLINDER CONDEMNED:</strong> Latest hydrostatic stretch or ultrasonic inspection failed. 
                Decommission cylinder from cascade/vehicle service immediately per PESO guidelines.
              </span>
            </div>
          )}

          {asset.compliance_status === 'VALID' && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>
                <strong>FULLY COMPLIANT:</strong> Valid hydrostatic pressure test certified. Next re-test due in {asset.days_remaining} days ({asset.next_due_date}).
              </span>
            </div>
          )}

          {asset.compliance_status === 'PENDING' && (
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 shrink-0 text-slate-400" />
                <span>
                  <strong>AWAITING INITIAL TEST:</strong> Equipment registered. Record initial manufacturer or testing agency hydrostatic test certificate.
                </span>
              </div>
              <button
                onClick={() => onRecordTestForAsset(asset.id)}
                className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shrink-0"
              >
                Record Test
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Grid: Specs & Vehicle Dossier on left, Hydrotest History on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Equipment & Vehicle Dossier */}
        <div className="space-y-6">
          {/* Equipment Technical Specifications */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2 pb-3 border-b border-slate-800">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Equipment Specifications</span>
            </h3>

            <div className="divide-y divide-slate-800/80 text-xs mt-2">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Manufacturer</span>
                <span className="font-semibold text-slate-200">{asset.manufacturer || '—'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Model / Type</span>
                <span className="font-semibold text-slate-200">{asset.model || '—'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Water Capacity</span>
                <span className="font-semibold text-slate-200 font-mono">
                  {asset.capacity_liters ? `${asset.capacity_liters} L` : '—'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Installation Date</span>
                <span className="font-semibold text-slate-200 font-mono">
                  {asset.installation_date || '—'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Cylinder Mark</span>
                <span className="font-semibold text-slate-200 font-mono">
                  {asset.cylinder_number || '—'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Record Created</span>
                <span className="text-slate-400 font-mono text-[11px]">
                  {new Date(asset.created_at).toLocaleString()}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Last Updated</span>
                <span className="text-slate-400 font-mono text-[11px]">
                  {new Date(asset.updated_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Vehicle Information Dossier (Option B) */}
          <VehicleCard asset={asset} onVehicleUpdated={handleVehicleUpdated} />
        </div>

        {/* Right Column: Hydrotest History Timeline (Flow H) */}
        <div className="lg:col-span-2">
          <HydrotestTimeline
            hydrotests={asset.hydrotests || []}
            onTestVerified={handleTestVerified}
          />
        </div>
      </div>
    </div>
  );
}
