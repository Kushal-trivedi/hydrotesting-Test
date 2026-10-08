import React from 'react';
import { AlertCircle, Clock, ArrowRight, ShieldAlert, CheckCircle, FileText } from 'lucide-react';
import { ComplianceBadge } from './ComplianceBadge';

export function PriorityActionDesk({ overdueQueue = [], dueSoonQueue = [], onSelectAsset, onRecordTestForAsset }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
      {/* Overdue Queue */}
      <div className="bg-slate-900/80 border border-rose-500/30 rounded-2xl p-5 shadow-xl shadow-rose-950/10">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                Critical Overdue Queue
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                  {overdueQueue.length} Assets
                </span>
              </h3>
              <p className="text-xs text-slate-400">Immediate hydrostatic re-testing required for safety compliance</p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-800/80 mt-3 max-h-96 overflow-y-auto pr-1">
          {overdueQueue.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
              <CheckCircle className="w-8 h-8 text-emerald-500/40" />
              <span>No overdue equipment. All active assets currently certified.</span>
            </div>
          ) : (
            overdueQueue.map((item) => (
              <div key={item.asset_db_id} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-800/30 px-2 rounded-xl transition">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectAsset(item.asset_db_id)}
                      className="font-mono text-sm font-bold text-cyan-400 hover:text-cyan-300 hover:underline truncate"
                    >
                      {item.asset_id_str}
                    </button>
                    <ComplianceBadge status={item.compliance_status} size="sm" />
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{item.site_name}</span>
                    <span>•</span>
                    <span className="capitalize">{item.asset_type.replace('_', ' ').toLowerCase()}</span>
                    {item.vehicle_number && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-slate-300 font-medium">{item.vehicle_number}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-bold text-rose-400">
                      {item.days_diff !== null ? `${Math.abs(item.days_diff)}d overdue` : 'Immediate Test'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {item.next_due_date ? `Due: ${item.next_due_date}` : 'No prior test'}
                    </div>
                  </div>

                  <button
                    onClick={() => onRecordTestForAsset(item.asset_db_id)}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <span>Record Test</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Due Soon Queue */}
      <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-5 shadow-xl shadow-amber-950/10">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                Upcoming Expiries (Due Soon)
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  {dueSoonQueue.length} Assets
                </span>
              </h3>
              <p className="text-xs text-slate-400">Due within next 30 days. Pre-schedule testing with certified agency.</p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-800/80 mt-3 max-h-96 overflow-y-auto pr-1">
          {dueSoonQueue.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
              <CheckCircle className="w-8 h-8 text-emerald-500/40" />
              <span>No tests due within 30 days.</span>
            </div>
          ) : (
            dueSoonQueue.map((item) => (
              <div key={item.asset_db_id} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-800/30 px-2 rounded-xl transition">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectAsset(item.asset_db_id)}
                      className="font-mono text-sm font-bold text-cyan-400 hover:text-cyan-300 hover:underline truncate"
                    >
                      {item.asset_id_str}
                    </button>
                    <ComplianceBadge status={item.compliance_status} size="sm" />
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{item.site_name}</span>
                    <span>•</span>
                    <span className="capitalize">{item.asset_type.replace('_', ' ').toLowerCase()}</span>
                    {item.vehicle_number && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-slate-300 font-medium">{item.vehicle_number}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-bold text-amber-400">
                      {item.days_diff !== null ? `${item.days_diff} days left` : 'Due soon'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {item.next_due_date ? `Due: ${item.next_due_date}` : ''}
                    </div>
                  </div>

                  <button
                    onClick={() => onRecordTestForAsset(item.asset_db_id)}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <span>Schedule / Test</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
