import React, { useState, useEffect } from 'react';
import { scansApi } from '../api/scans';
import { ArrowLeft, Filter, Calendar, Camera, CheckCircle2, Clock, XCircle, HelpCircle, Info, AlertCircle, Loader2 } from 'lucide-react';

export function ScanHistory({ onBack, onSelectScan }) {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resultFilter, setResultFilter] = useState('');
  const [error, setError] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await scansApi.getScans({ result: resultFilter });
      setScans(data);
    } catch (err) {
      setError(err.message || 'Failed to load scan history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [resultFilter]);

  const getStatusBadge = (res) => {
    const r = (res || '').toUpperCase();
    const map = {
      VALID: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      DUE_SOON: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      OVERDUE: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      FAILED: 'bg-rose-600/20 text-rose-300 border-rose-600/40',
      RECORD_NOT_FOUND: 'bg-slate-700/30 text-slate-300 border-slate-600/30',
      NOT_APPLICABLE: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
      LOOKUP_UNAVAILABLE: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    };
    return map[r] || 'bg-slate-800 text-slate-400 border-slate-700';
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-2 sm:px-4 py-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">Scan History</h1>
            <p className="text-xs text-slate-400">Past vehicle checks and hydrotest status audit trail</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          {['', 'VALID', 'DUE_SOON', 'OVERDUE', 'FAILED', 'RECORD_NOT_FOUND', 'NOT_APPLICABLE'].map((f) => (
            <button
              key={f}
              onClick={() => setResultFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all cursor-pointer ${
                resultFilter === f
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {f ? f.replace(/_/g, ' ') : 'All Results'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <p className="text-xs">Loading records...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      ) : scans.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/40 rounded-2xl border border-slate-800/60 p-6">
          <Camera className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">No vehicle scans recorded yet</p>
          <p className="text-xs text-slate-500 mt-1">Vehicle scans made at the pump will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {scans.map((s) => (
            <div
              key={s.id}
              onClick={() => onSelectScan && onSelectScan(s.id)}
              className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-wrap items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs text-cyan-300">
                  {s.input_type === 'VIDEO' ? 'VID' : s.input_type === 'IMAGE' ? 'IMG' : 'TYP'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-base text-white tracking-wider">
                      {s.confirmed_plate || s.detected_plate || 'UNKNOWN'}
                    </span>
                    {s.plate_edited && (
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                        Edited
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {s.station_name || 'Station'} • By {s.user_name || 'Operator'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getStatusBadge(s.final_result)}`}>
                  {s.final_result ? s.final_result.replace(/_/g, ' ') : 'PENDING'}
                </span>
                <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                  {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
