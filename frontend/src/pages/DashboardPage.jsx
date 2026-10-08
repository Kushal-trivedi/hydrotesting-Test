import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, Clock, XCircle, HelpCircle, 
  Database, RefreshCw, MapPin, Building, ArrowRight 
} from 'lucide-react';
import { api } from '../api/client';
import { PriorityActionDesk } from '../components/PriorityActionCard';

export function DashboardPage({ selectedSiteId, onSelectAsset, onRecordTestForAsset, onNavigateToAssets }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboard(selectedSiteId);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [selectedSiteId]);

  if (loading && !data) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Aggregating compliance status across stations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-8 p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 max-w-xl mx-auto text-center">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-400" />
        <h3 className="font-bold text-base">Dashboard Error</h3>
        <p className="text-xs text-rose-300/80 mt-1">{error}</p>
        <button
          onClick={fetchDashboard}
          className="mt-4 px-4 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  const { metrics, overdue_queue, due_soon_queue, site_breakdowns } = data || {
    metrics: { total_assets: 0, valid: 0, due_soon: 0, overdue: 0, failed: 0, pending: 0, compliance_percentage: 0 },
    overdue_queue: [],
    due_soon_queue: [],
    site_breakdowns: [],
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Compliance & Operational Safety Desk</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time monitoring of hydrostatic re-testing cycles and CNG asset integrity
          </p>
        </div>

        <button
          onClick={fetchDashboard}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400 text-xs font-medium transition self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total */}
        <div 
          onClick={() => onNavigateToAssets('ALL')}
          className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 cursor-pointer hover:border-slate-700 hover:bg-slate-850 transition shadow-lg"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Assets</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-slate-100 mt-2">{metrics.total_assets}</div>
          <div className="text-[11px] text-cyan-400/80 mt-1 font-semibold">
            {metrics.compliance_percentage}% Valid
          </div>
        </div>

        {/* Valid */}
        <div 
          onClick={() => onNavigateToAssets('VALID')}
          className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 cursor-pointer hover:border-emerald-500/50 hover:bg-slate-850 transition shadow-lg shadow-emerald-950/20"
        >
          <div className="flex items-center justify-between text-emerald-400 text-xs font-medium">
            <span>Valid</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2">{metrics.valid}</div>
          <div className="text-[11px] text-emerald-500/80 mt-1">Certified Safe</div>
        </div>

        {/* Due Soon */}
        <div 
          onClick={() => onNavigateToAssets('DUE_SOON')}
          className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 cursor-pointer hover:border-amber-500/50 hover:bg-slate-850 transition shadow-lg shadow-amber-950/20"
        >
          <div className="flex items-center justify-between text-amber-400 text-xs font-medium">
            <span>Due Soon (≤30d)</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-2">{metrics.due_soon}</div>
          <div className="text-[11px] text-amber-500/80 mt-1">Action Required</div>
        </div>

        {/* Overdue */}
        <div 
          onClick={() => onNavigateToAssets('OVERDUE')}
          className="bg-slate-900/90 border border-rose-500/30 rounded-2xl p-4 cursor-pointer hover:border-rose-500/50 hover:bg-slate-850 transition shadow-lg shadow-rose-950/20"
        >
          <div className="flex items-center justify-between text-rose-400 text-xs font-medium">
            <span>Overdue</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 mt-2">{metrics.overdue}</div>
          <div className="text-[11px] text-rose-500/80 mt-1">Expired / Halt Use</div>
        </div>

        {/* Failed */}
        <div 
          onClick={() => onNavigateToAssets('FAILED')}
          className="bg-slate-900/90 border border-red-600/30 rounded-2xl p-4 cursor-pointer hover:border-red-600/50 hover:bg-slate-850 transition shadow-lg shadow-red-950/20"
        >
          <div className="flex items-center justify-between text-red-400 text-xs font-medium">
            <span>Failed</span>
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-400 mt-2">{metrics.failed}</div>
          <div className="text-[11px] text-red-500/80 mt-1">Rejected Cylinder</div>
        </div>

        {/* Pending */}
        <div 
          onClick={() => onNavigateToAssets('PENDING')}
          className="bg-slate-900/90 border border-slate-700 rounded-2xl p-4 cursor-pointer hover:border-slate-600 hover:bg-slate-850 transition shadow-lg"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Pending Test</span>
            <HelpCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-300 mt-2">{metrics.pending}</div>
          <div className="text-[11px] text-slate-500 mt-1">Awaiting Test</div>
        </div>
      </div>

      {/* Priority Action Desk (Overdue & Due Soon Queues) */}
      <PriorityActionDesk
        overdueQueue={overdue_queue}
        dueSoonQueue={due_soon_queue}
        onSelectAsset={onSelectAsset}
        onRecordTestForAsset={onRecordTestForAsset}
      />

      {/* Station / Site Breakdown Desk */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">Station Compliance Breakdown</h3>
              <p className="text-xs text-slate-400">Station-wise safety distribution and testing status</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3 font-semibold">Station / Hub</th>
                <th className="py-2.5 px-3 font-semibold">Total Assets</th>
                <th className="py-2.5 px-3 font-semibold text-emerald-400">Valid</th>
                <th className="py-2.5 px-3 font-semibold text-amber-400">Due Soon</th>
                <th className="py-2.5 px-3 font-semibold text-rose-400">Overdue</th>
                <th className="py-2.5 px-3 font-semibold text-red-400">Failed</th>
                <th className="py-2.5 px-3 font-semibold text-slate-400">Pending</th>
                <th className="py-2.5 px-3 font-semibold">Compliance Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {site_breakdowns.map((site) => {
                const rate = site.total_assets > 0 ? Math.round((site.valid / site.total_assets) * 100) : 0;
                return (
                  <tr key={site.site_id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-3 font-medium text-slate-200">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{site.site_name}</span>
                        <span className="font-mono text-[10px] text-slate-500">({site.site_code})</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-100">{site.total_assets}</td>
                    <td className="py-3 px-3 font-semibold text-emerald-400">{site.valid}</td>
                    <td className="py-3 px-3 font-semibold text-amber-400">{site.due_soon}</td>
                    <td className="py-3 px-3 font-semibold text-rose-400">{site.overdue}</td>
                    <td className="py-3 px-3 font-semibold text-red-400">{site.failed}</td>
                    <td className="py-3 px-3 text-slate-400">{site.pending}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              rate >= 80 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="font-semibold text-slate-300">{rate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
