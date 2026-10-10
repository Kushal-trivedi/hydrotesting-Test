import React, { useState, useEffect } from 'react';
import { adminApi } from '../api/admin';
import { Building2, Plus, CheckCircle2, MapPin, X, AlertCircle } from 'lucide-react';

export default function AdminStations() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    city: '',
    state: 'Gujarat',
  });

  const loadStations = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.getStations();
      setStations(data);
    } catch (err) {
      setError(err.message || 'Failed to load branch list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStations();
  }, []);

  const handleCreateStation = async (e) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim() || !formData.city.trim()) {
      setError('Branch code, name, and city are required.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await adminApi.createStation({
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        city: formData.city.trim(),
        state: formData.state.trim() || 'Gujarat',
      });
      setSuccess(`Branch ${formData.code.toUpperCase()} added successfully.`);
      setShowAddModal(false);
      setFormData({ code: '', name: '', city: '', state: 'Gujarat' });
      await loadStations();
    } catch (err) {
      setError(err.message || 'Failed to create branch.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (station) => {
    const nextStatus = !station.is_active;
    const confirmMsg = `Are you sure you want to ${nextStatus ? 'activate' : 'deactivate'} branch "${station.name}" (${station.code})?`;
    if (!window.confirm(confirmMsg)) return;

    setError('');
    setSuccess('');
    try {
      await adminApi.updateStation(station.id, { is_active: nextStatus });
      setSuccess(`Branch ${station.code} ${nextStatus ? 'activated' : 'deactivated'} successfully.`);
      await loadStations();
    } catch (err) {
      setError(err.message || 'Failed to update branch status.');
    }
  };

  const activeCount = stations.filter((s) => s.is_active !== false).length;
  const uniqueCities = new Set(stations.map((s) => s.city?.trim()).filter(Boolean)).size;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Branch & Station Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure CNG fueling stations and testing centers across territories
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 transition transform active:scale-95 cursor-pointer self-start sm:self-auto min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Branch</span>
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-200 font-bold">&times;</button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-emerald-400 hover:text-emerald-200 font-bold">&times;</button>
        </div>
      )}

      {/* Metric Cards - Dark Theme */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Total Branches</span>
            <Building2 className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="mt-2 text-3xl font-black text-slate-100">{stations.length}</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Active Branches</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-3xl font-black text-emerald-400">{activeCount}</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Cities Covered</span>
            <MapPin className="w-4 h-4 text-sky-400" />
          </div>
          <p className="mt-2 text-3xl font-black text-sky-400">{uniqueCities}</p>
        </div>
      </div>

      {/* Stations Table - Dark Theme */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Configured Stations</h2>
          <span className="text-[11px] text-slate-500 font-medium">Auto-synced with branch authorization ledger</span>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
            <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs">Loading branch records...</p>
          </div>
        ) : stations.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <p className="text-sm font-semibold text-slate-300 mb-1">No stations registered yet.</p>
            <p className="text-xs text-slate-500">Click &ldquo;Add New Branch&rdquo; above to set up your first location.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Station Code</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Station Name</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Location</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {stations.map((stn) => {
                  const isActive = stn.is_active !== false;
                  return (
                    <tr key={stn.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-cyan-300 px-2 py-1 bg-slate-800 border border-slate-700 rounded">
                          {stn.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-xs font-semibold text-slate-200">{stn.name}</span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                        {stn.city}{stn.state ? `, ${stn.state}` : ''}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isActive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleToggleStatus(stn)}
                          className={`font-semibold text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                            isActive
                              ? 'text-rose-400 border-rose-500/30 hover:bg-rose-500/15'
                              : 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/15'
                          }`}
                        >
                          {isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Branch Modal - Dark Theme */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-100">
            <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-cyan-400" />
                Add New CNG Branch
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1 text-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStation} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Branch Code <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. STN-AHM-04"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-white uppercase focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Unique branch identifier</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Branch / Station Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Navrangpura CNG Terminal"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    City <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ahmedabad"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Register Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
