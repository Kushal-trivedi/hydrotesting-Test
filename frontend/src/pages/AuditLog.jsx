import React, { useState, useEffect } from 'react';
import { adminApi } from '../api/admin';
import { RefreshCw, Download, Filter, FileText, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [limit, setLimit] = useState(100);
  const [offset, setOffset] = useState(0);
  const [expandedRow, setExpandedRow] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.getAuditLogs({
        action: actionFilter || undefined,
        targetType: targetTypeFilter || undefined,
        limit,
        offset,
      });
      setLogs(data);
    } catch (err) {
      setError(err.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, targetTypeFilter, offset, limit]);

  const exportCsv = () => {
    if (!logs.length) return;
    const headers = ['ID', 'Timestamp', 'User ID', 'User Name', 'Action', 'Target Type', 'Target ID', 'Outcome', 'IP Address', 'Details'];
    const rows = logs.map(l => [
      l.id,
      new Date(l.timestamp).toISOString(),
      l.user_id || '',
      `"${(l.user_name || '').replace(/"/g, '""')}"`,
      l.action,
      l.target_type || '',
      l.target_id || '',
      l.outcome || '',
      l.ip_address || '',
      `"${(typeof l.details === 'object' ? JSON.stringify(l.details) : l.details || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hydrosafe_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDetails = (raw) => {
    if (!raw) return '—';
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return String(raw);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
              Append-Only Ledger
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight mt-1.5">Audit & Compliance Trail</h1>
          <p className="text-xs text-slate-400 mt-1">
            Tamper-evident record of all authentication, role approvals, and vehicle checks
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportCsv}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white text-xs font-bold shadow-md shadow-cyan-600/20 transition cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar - Dark Theme */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Filter by Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setOffset(0);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 cursor-pointer"
            >
              <option value="">All Actions</option>
              <option value="USER_APPROVED">USER_APPROVED</option>
              <option value="USER_REJECTED">USER_REJECTED</option>
              <option value="USER_UPDATED">USER_UPDATED</option>
              <option value="USER_LOGIN_SUCCESS">USER_LOGIN_SUCCESS</option>
              <option value="USER_LOGIN_FAILED">USER_LOGIN_FAILED</option>
              <option value="USER_LOCKED">USER_LOCKED</option>
              <option value="PASSWORD_RESET">PASSWORD_RESET</option>
              <option value="BRANCH_CREATED">BRANCH_CREATED</option>
              <option value="BRANCH_UPDATED">BRANCH_UPDATED</option>
              <option value="VEHICLE_SCAN">VEHICLE_SCAN</option>
              <option value="VEHICLE_CONFIRMED">VEHICLE_CONFIRMED</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Target Type
            </label>
            <select
              value={targetTypeFilter}
              onChange={(e) => {
                setTargetTypeFilter(e.target.value);
                setOffset(0);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 cursor-pointer"
            >
              <option value="">All Target Types</option>
              <option value="USER">USER</option>
              <option value="BRANCH">BRANCH</option>
              <option value="VEHICLE_CHECK">VEHICLE_CHECK</option>
              <option value="ASSET">ASSET</option>
              <option value="HYDROTEST">HYDROTEST</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Page Size
            </label>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setOffset(0);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 cursor-pointer"
            >
              <option value="50">50 entries</option>
              <option value="100">100 entries</option>
              <option value="200">200 entries</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Table - Dark Theme */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs">Loading audit ledger...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No audit events found</p>
            <p className="text-xs text-slate-500 mt-1">Try resetting or modifying your search filters above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Timestamp</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Actor / User</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Action</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Target</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Outcome</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">IP Address</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {logs.map((log) => {
                  const isExpanded = expandedRow === log.id;
                  const isSuccess = log.outcome?.toUpperCase() === 'SUCCESS';
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                          {new Date(log.timestamp).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'medium',
                          })}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {log.user_name ? (
                            <div>
                              <span className="font-semibold text-slate-200">{log.user_name}</span>
                              <span className="text-slate-500 block text-[10px]">ID #{log.user_id}</span>
                            </div>
                          ) : log.user_id ? (
                            <span className="text-slate-300">User #{log.user_id}</span>
                          ) : (
                            <span className="text-slate-500 italic">System</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-300">
                          {log.target_type ? (
                            <span>
                              <span className="font-medium text-slate-200">{log.target_type}</span>
                              {log.target_id && <span className="text-slate-500"> #{log.target_id}</span>}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                              isSuccess
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {log.outcome || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-400 text-[11px]">
                          {log.ip_address || '—'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          {log.details ? (
                            <button
                              onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                              className="text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer text-xs"
                            >
                              {isExpanded ? 'Hide' : 'View'}
                            </button>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      </tr>

                      {isExpanded && log.details && (
                        <tr className="bg-slate-950/80">
                          <td colSpan={7} className="px-4 py-3 border-t border-slate-800">
                            <div className="bg-slate-950 rounded-xl p-3 text-cyan-300 font-mono text-xs overflow-x-auto border border-slate-800">
                              <pre>{formatDetails(log.details)}</pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {logs.length} entries</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 font-medium text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={logs.length < limit}
              className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 font-medium text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
