import React from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  HelpCircle,
  Info,
  ExternalLink,
  RefreshCw,
  Camera,
} from 'lucide-react';

export function ResultCard({ result, onScanNext, onViewAsset }) {
  if (!result) return null;

  const state = (result.final_result || result.compliance_state || 'NOT_CONFIRMED').toUpperCase();

  const configs = {
    VALID: {
      color: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      icon: CheckCircle2,
      title: 'VALID',
      actionText: 'Scan next vehicle',
    },
    DUE_SOON: {
      color: 'border-amber-500/40 bg-amber-950/20 text-amber-300',
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      icon: Clock,
      title: 'DUE SOON',
      actionText: 'Scan next vehicle (Retest soon)',
    },
    OVERDUE: {
      color: 'border-rose-500/50 bg-rose-950/25 text-rose-300',
      badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      icon: XCircle,
      title: 'OVERDUE',
      actionText: 'Inform manager, follow branch policy',
    },
    FAILED: {
      color: 'border-rose-600/60 bg-rose-950/30 text-rose-400',
      badgeColor: 'bg-rose-600/20 text-rose-300 border-rose-600/40',
      icon: XCircle,
      title: 'FAILED',
      actionText: 'Do not fuel. Inform manager immediately.',
    },
    RECORD_NOT_FOUND: {
      color: 'border-slate-600/40 bg-slate-900/60 text-slate-300',
      badgeColor: 'bg-slate-700/30 text-slate-300 border-slate-600/30',
      icon: HelpCircle,
      title: 'RECORD NOT FOUND',
      actionText: 'Ask the manager to register the cylinder',
    },
    NOT_APPLICABLE: {
      color: 'border-sky-500/40 bg-sky-950/20 text-sky-300',
      badgeColor: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
      icon: Info,
      title: 'NOT APPLICABLE',
      actionText: 'Not a CNG vehicle. Hydrotest check skipped.',
    },
    LOOKUP_UNAVAILABLE: {
      color: 'border-amber-500/40 bg-amber-950/20 text-amber-300',
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      icon: AlertCircle,
      title: 'LOOKUP UNAVAILABLE',
      actionText: 'Vehicle service did not answer. Retry later.',
    },
  };

  const current = configs[state] || configs.RECORD_NOT_FOUND;
  const IconComponent = current.icon;

  const vehicleDesc = result.vehicle
    ? `${result.vehicle.make || ''} ${result.vehicle.model || ''} • ${result.vehicle.fuel_type || ''}`
    : result.fuel_type
    ? `Fuel: ${result.fuel_type}`
    : 'Vehicle info';

  return (
    <div className={`w-full rounded-2xl border-2 p-5 sm:p-6 backdrop-blur-md shadow-2xl transition-all ${current.color}`}>
      {/* Plate Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Confirmed Plate</span>
          <h2 className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-white mt-0.5">
            {result.plate}
          </h2>
          <p className="text-xs text-slate-400 mt-1">{vehicleDesc}</p>
        </div>
        <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 font-bold text-sm tracking-wide ${current.badgeColor}`}>
          <IconComponent className="w-5 h-5" />
          <span>{current.title}</span>
        </div>
      </div>

      {/* Main Message Box */}
      <div className="py-4 my-2">
        <p className="text-base sm:text-lg font-semibold leading-relaxed">
          {result.message}
        </p>

        {result.next_due_date && (
          <div className="mt-3 flex items-center gap-2 text-xs font-mono bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">Next Hydrotest Due:</span>
            <span className="font-bold text-white">{result.next_due_date}</span>
          </div>
        )}

        {result.asset_id && (
          <div className="mt-2 flex items-center justify-between text-xs bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">Linked Cylinder Asset:</span>
            <span className="font-mono font-bold text-cyan-300">{result.asset_id}</span>
          </div>
        )}
      </div>

      {/* Source attribution & mock data label (Requirement R16) */}
      <div className="border-t border-slate-800/80 pt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <span>
          Source:{' '}
          <strong className="text-slate-300">
            {result.data_source?.vahan === 'mock' ? 'VAHAN (mock data)' : 'VAHAN (live)'}
          </strong>{' '}
          • {result.data_source?.hydrotest === 'internal_register' ? 'Internal Register' : 'PESO'}
        </span>
        <span className="font-mono text-slate-400">{result.checked_at || new Date().toISOString()}</span>
      </div>

      {/* Action Buttons (Section 5.3) */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {result.asset_id && onViewAsset ? (
          <button
            onClick={() => onViewAsset(result.asset_id)}
            className="flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] rounded-xl font-semibold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>View Asset Dossier</span>
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={onScanNext}
          className="flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] rounded-xl font-bold text-sm bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
        >
          <Camera className="w-4 h-4" />
          <span>Scan Next Vehicle</span>
        </button>
      </div>
    </div>
  );
}
