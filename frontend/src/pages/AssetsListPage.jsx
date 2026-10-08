import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Plus, Eye, FileCheck, ArrowUpDown, 
  MapPin, Car, Fuel, RefreshCw, Calendar 
} from 'lucide-react';
import { api } from '../api/client';
import { ComplianceBadge } from '../components/ComplianceBadge';

export function AssetsListPage({ 
  sites, 
  initialFilterStatus, 
  selectedSiteId, 
  onSelectAsset, 
  onRecordTestForAsset, 
  onOpenAddAsset 
}) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [siteFilter, setSiteFilter] = useState(selectedSiteId || '');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialFilterStatus || '');
  const [dueFrom, setDueFrom] = useState('');
  const [dueTo, setDueTo] = useState('');
  const [sortBy, setSortBy] = useState('next_due_date');
  const [sortOrder, setSortOrder] = useState('asc');

  const fetchAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAssets({
        search: searchTerm,
        site_id: siteFilter ? Number(siteFilter) : undefined,
        asset_type: typeFilter,
        compliance_status: statusFilter,
        due_from: dueFrom || undefined,
        due_to: dueTo || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setAssets(res);
    } catch (err) {
      setError(err.message || 'Failed to retrieve assets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [siteFilter, typeFilter, statusFilter, dueFrom, dueTo, sortBy, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAssets();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSiteFilter('');
    setTypeFilter('');
    setStatusFilter('');
    setDueFrom('');
    setDueTo('');
    setSortBy('next_due_date');
    setSortOrder('asc');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Assets & Equipment Registry</h1>
          <p className="text-xs text-slate-400 mt-1">
            Certified cylinder records, stationary banks, vehicle bindings, and re-test schedules
          </p>
        </div>

        <button
          onClick={onOpenAddAsset}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white text-xs font-bold rounded-lg shadow-md shadow-cyan-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Asset</span>
        </button>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        {/* Search row */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Asset ID, Serial No, Vehicle Plate, Cylinder Marking, Manufacturer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-semibold rounded-xl transition"
          >
            Search
          </button>
          {(searchTerm || siteFilter || typeFilter || statusFilter || dueFrom || dueTo) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 bg-slate-800/50 hover:bg-slate-800 text-slate-400 text-xs rounded-xl transition"
            >
              Reset
            </button>
          )}
        </form>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* Station */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Station / Site</label>
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">All Stations</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Asset Type */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Asset Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">All Types</option>
              <option value="VEHICLE_CYLINDER">Vehicle Cylinder</option>
              <option value="CASCADE_STORAGE">Cascade Storage</option>
              <option value="DISPENSER_BUFFER">Dispenser Buffer</option>
              <option value="PIPELINE_HEADER">Pipeline Header</option>
            </select>
          </div>

          {/* Compliance Status */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Compliance Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">All Statuses</option>
              <option value="VALID">VALID (Certified)</option>
              <option value="DUE_SOON">DUE SOON (≤30 Days)</option>
              <option value="OVERDUE">OVERDUE (Expired)</option>
              <option value="FAILED">FAILED (Rejected)</option>
              <option value="PENDING">PENDING (No Tests)</option>
            </select>
          </div>

          {/* Due From */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Due Date From</label>
            <input
              type="date"
              value={dueFrom}
              onChange={(e) => setDueFrom(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Due To */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Due Date To</label>
            <input
              type="date"
              value={dueTo}
              onChange={(e) => setDueTo(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Sorting */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Sort Order</label>
            <div className="flex gap-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-[11px]"
              >
                <option value="next_due_date">Due Date</option>
                <option value="asset_id">Asset ID</option>
                <option value="created_at">Registered</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
                title={`Sort ${sortOrder.toUpperCase()}`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300">
            Showing {assets.length} Matching Equipment Asset{assets.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={fetchAssets}
            className="p-1 rounded text-slate-400 hover:text-slate-200"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 text-cyan-500 animate-spin mx-auto mb-2" />
            <span>Loading assets...</span>
          </div>
        ) : assets.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            <span>No assets found matching the selected filters.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                  <th className="py-3 px-4 font-semibold">Asset ID</th>
                  <th className="py-3 px-4 font-semibold">Station</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Serial / Cylinder</th>
                  <th className="py-3 px-4 font-semibold">Vehicle Binding</th>
                  <th className="py-3 px-4 font-semibold">Next Due Date</th>
                  <th className="py-3 px-4 font-semibold">Compliance Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {assets.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/40 transition">
                    {/* Asset ID */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => onSelectAsset(a.id)}
                        className="font-mono font-bold text-cyan-400 hover:text-cyan-300 hover:underline"
                      >
                        {a.asset_id}
                      </button>
                      <div className="text-[10px] text-slate-500 font-normal">
                        {a.manufacturer || 'OEM'} {a.model ? `• ${a.model}` : ''}
                      </div>
                    </td>

                    {/* Station */}
                    <td className="py-3 px-4 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[140px]">{a.site_name}</span>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3 px-4 text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] font-medium">
                        {a.asset_type.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Serial & Cylinder */}
                    <td className="py-3 px-4 text-slate-300 font-mono">
                      <div>{a.serial_number}</div>
                      {a.cylinder_number && (
                        <div className="text-[10px] text-slate-500">Cyl: {a.cylinder_number}</div>
                      )}
                    </td>

                    {/* Vehicle */}
                    <td className="py-3 px-4">
                      {a.vehicle_number ? (
                        <div>
                          <div className="flex items-center gap-1.5 font-mono font-semibold text-slate-200">
                            <Car className="w-3 h-3 text-cyan-400" />
                            <span>{a.vehicle_number}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <span>{a.vehicle_make}</span>
                            {a.vehicle_verified && (
                              <span className="text-teal-400 font-bold">✓ VAHAN</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-600 font-normal">— Stationary —</span>
                      )}
                    </td>

                    {/* Next Due Date & Days diff */}
                    <td className="py-3 px-4">
                      {a.next_due_date ? (
                        <div>
                          <div className="font-semibold text-slate-200">{a.next_due_date}</div>
                          <div className="text-[10px] mt-0.5 font-bold">
                            {a.days_remaining !== null ? (
                              a.days_remaining < 0 ? (
                                <span className="text-rose-400">{Math.abs(a.days_remaining)} days overdue</span>
                              ) : a.days_remaining <= 30 ? (
                                <span className="text-amber-400">{a.days_remaining} days left</span>
                              ) : (
                                <span className="text-slate-500">{a.days_remaining} days left</span>
                              )
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">No tests recorded</span>
                      )}
                    </td>

                    {/* Compliance */}
                    <td className="py-3 px-4">
                      <ComplianceBadge status={a.compliance_status} size="sm" />
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectAsset(a.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition"
                          title="View Asset Dossier"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onRecordTestForAsset(a.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1 transition"
                          title="Record Hydrotest"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>Test</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
