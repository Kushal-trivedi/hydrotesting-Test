import React, { useState } from 'react';
import { Car, CheckCircle, AlertTriangle, RefreshCw, Fuel, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';

export function VehicleCard({ asset, onVehicleUpdated }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [isError, setIsError] = useState(false);

  if (!asset.vehicle_number) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-3 text-slate-400">
          <Car className="w-5 h-5" />
          <span className="text-sm font-medium">No vehicle linked to this asset. (Stationary Equipment)</span>
        </div>
      </div>
    );
  }

  const handleVerify = async () => {
    setLoading(true);
    setMessage(null);
    setIsError(false);
    try {
      const updatedAsset = await api.linkVehicleToAsset(asset.id, asset.vehicle_number);
      onVehicleUpdated(updatedAsset);
      setMessage('Vehicle registry verified via National VAHAN Registry.');
    } catch (err) {
      setIsError(true);
      setMessage(err.message || 'Vehicle service temporarily unavailable. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-base font-bold text-slate-100 tracking-wider">
                {asset.vehicle_number}
              </h3>
              {asset.vehicle_verified ? (
                <span className="inline-flex items-center gap-1 rounded bg-teal-500/15 px-2 py-0.5 text-xs font-semibold text-teal-300 border border-teal-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  VAHAN VERIFIED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/30">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  UNVERIFIED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">Linked Vehicle Dossier</p>
          </div>
        </div>

        <button
          onClick={handleVerify}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-medium transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Verifying...' : 'Re-verify with VAHAN'}</span>
        </button>
      </div>

      {message && (
        <div className={`mt-3 p-3 rounded-lg text-xs flex items-center gap-2 ${
          isError ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' : 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
        }`}>
          {isError ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
          <span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 text-xs">
        <div>
          <span className="text-slate-400 block mb-0.5">Make</span>
          <span className="font-semibold text-slate-200">{asset.vehicle_make || '—'}</span>
        </div>
        <div>
          <span className="text-slate-400 block mb-0.5">Model</span>
          <span className="font-semibold text-slate-200">{asset.vehicle_model || '—'}</span>
        </div>
        <div>
          <span className="text-slate-400 block mb-0.5">Fuel Type</span>
          <div className="flex items-center gap-1.5">
            <Fuel className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-slate-200">{asset.vehicle_fuel_type || '—'}</span>
            {asset.vehicle_fuel_type?.toUpperCase().includes('CNG') && (
              <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                CNG
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
