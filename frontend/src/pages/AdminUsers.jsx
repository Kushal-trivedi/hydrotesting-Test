import React, { useState, useEffect } from 'react';
import { adminApi } from '../api/admin';
import { api } from '../api/client';
import { 
  Users, CheckCircle2, XCircle, Shield, Building, 
  AlertCircle, Loader2, ArrowLeft, Plus, X, Lock, Mail, Phone, User 
} from 'lucide-react';

export function AdminUsers({ onBack }) {
  const [users, setUsers] = useState([]);
  const [stations, setStations] = useState([]);
  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING' or 'ALL'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Approval / Edit modal states
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve', 'reject'
  const [assignRole, setAssignRole] = useState('OPERATOR');
  const [assignedStationIds, setAssignedStationIds] = useState([]);
  const [rejectReason, setRejectReason] = useState('');

  // Add New User Modal state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    full_name: '',
    email: '',
    password: '',
    mobile: '',
    role: 'OPERATOR',
    station_ids: [],
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.getUsers(activeTab === 'PENDING' ? 'PENDING' : '');
      setUsers(data || []);
      const stns = await api.getSites();
      setStations(stns || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [activeTab]);

  const openApproveModal = (u) => {
    setSelectedUser(u);
    setActionType('approve');
    setAssignRole(u.role || 'OPERATOR');
    setAssignedStationIds(u.assigned_stations?.map((s) => s.id) || []);
  };

  const openRejectModal = (u) => {
    setSelectedUser(u);
    setActionType('reject');
    setRejectReason('');
  };

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    setError('');
    try {
      await adminApi.approveUser(selectedUser.id, assignRole, assignedStationIds);
      setSuccessMsg(`User ${selectedUser.full_name} updated successfully.`);
      setSelectedUser(null);
      setActionType(null);
      await fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to approve/update user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser || !rejectReason.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await adminApi.rejectUser(selectedUser.id, rejectReason.trim());
      setSuccessMsg(`User ${selectedUser.full_name} rejected.`);
      setSelectedUser(null);
      setActionType(null);
      await fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to reject user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleDeactivate = async (u) => {
    const newStatus = u.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
    if (!confirm(`Are you sure you want to set user ${u.email} to ${newStatus}?`)) return;
    setError('');
    try {
      await adminApi.updateUser(u.id, { status: newStatus });
      setSuccessMsg(`User status updated to ${newStatus}.`);
      await fetchUsers();
    } catch (err) {
      setError(err.message || 'Update failed');
    }
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    if (!newUserData.full_name.trim() || !newUserData.email.trim() || !newUserData.password) {
      setError('Full name, email, and password are required.');
      return;
    }
    if (newUserData.password.length < 10) {
      setError('Password must be at least 10 characters.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await adminApi.createUser({
        full_name: newUserData.full_name.trim(),
        email: newUserData.email.trim().toLowerCase(),
        password: newUserData.password,
        mobile: newUserData.mobile.trim() || null,
        role: newUserData.role,
        station_ids: newUserData.station_ids,
      });

      setSuccessMsg(`User ${newUserData.full_name} created successfully.`);
      setShowAddUserModal(false);
      setNewUserData({
        full_name: '',
        email: '',
        password: '',
        mobile: '',
        role: 'OPERATOR',
        station_ids: [],
      });
      await fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStationCheckbox = (id) => {
    setAssignedStationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleNewUserStationCheckbox = (id) => {
    setNewUserData((prev) => ({
      ...prev,
      station_ids: prev.station_ids.includes(id)
        ? prev.station_ids.filter((x) => x !== id)
        : [...prev.station_ids, id],
    }));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">Users & Approvals</h1>
            <p className="text-xs text-slate-400 mt-1">
              Add team members, assign branches, and manage system roles
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tab Controls */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => setActiveTab('PENDING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'PENDING'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pending Requests
            </button>
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-cyan-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Accounts
            </button>
          </div>

          {/* Add New User Button */}
          <button
            onClick={() => setShowAddUserModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition transform active:scale-95 cursor-pointer min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>Add New User</span>
          </button>
        </div>
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

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-200 font-bold">&times;</button>
        </div>
      )}

      {/* User List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <p className="text-xs">Loading accounts...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/60 rounded-2xl border border-slate-800 p-6">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">
            {activeTab === 'PENDING' ? 'No pending approval requests' : 'No users found'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {activeTab === 'PENDING'
              ? 'All operator and manager sign-ups are reviewed.'
              : 'Click "+ Add New User" above to add your first team member.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-wrap items-center justify-between gap-4 shadow-lg"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-white text-sm sm:text-base">{u.full_name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                      u.status === 'ACTIVE'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : u.status === 'PENDING'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
                        : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {u.status}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-cyan-300 border border-slate-700">
                    {u.role}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">{u.email}</p>
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-400">
                  <Building className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Branches:</span>
                  {u.assigned_stations && u.assigned_stations.length > 0 ? (
                    u.assigned_stations.map((s) => (
                      <span key={s.id} className="text-slate-300 font-medium px-1.5 py-0.2 bg-slate-800 rounded">
                        {s.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500">Global (All Stations)</span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {u.status === 'PENDING' ? (
                  <>
                    <button
                      onClick={() => openApproveModal(u)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => openRejectModal(u)}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => openApproveModal(u)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer"
                    >
                      Edit Role & Branches
                    </button>
                    <button
                      onClick={() => handleToggleDeactivate(u)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                        u.status === 'DISABLED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {u.status === 'DISABLED' ? 'Enable' : 'Deactivate'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: ADD NEW USER (By Admin) */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 text-slate-100">
            <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                Add New Team Member
              </h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={newUserData.full_name}
                  onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:ring-1 focus:ring-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Work Email <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  placeholder="rahul@hydrosafe.com"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:ring-1 focus:ring-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Password (Min 10 chars) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Min 10 characters"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:ring-1 focus:ring-cyan-500"
                    required
                    minLength={10}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={newUserData.mobile}
                    onChange={(e) => setNewUserData({ ...newUserData, mobile: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Assign System Role <span className="text-rose-400">*</span>
                </label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                >
                  <option value="OPERATOR">OPERATOR (Pump scan & plate confirmation)</option>
                  <option value="MANAGER">MANAGER (Station supervision & compliance reports)</option>
                  <option value="AUDITOR">AUDITOR (Read-only ledger & inspection trails)</option>
                  <option value="ADMIN">ADMIN (Full administrative privileges)</option>
                </select>
              </div>

              {/* Station Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Assign Authorized Branch Stations:
                </label>
                <div className="max-h-36 overflow-y-auto p-2 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5 text-xs">
                  {stations.length === 0 ? (
                    <span className="text-slate-500">No stations configured</span>
                  ) : (
                    stations.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-900 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newUserData.station_ids.includes(s.id)}
                          onChange={() => handleNewUserStationCheckbox(s.id)}
                          className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                        />
                        <span className="font-medium text-slate-200">{s.name}</span>
                        <span className="text-slate-500 text-[10px] font-mono">({s.code})</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: APPROVE / EDIT ROLE & BRANCHES */}
      {actionType === 'approve' && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-100">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {selectedUser.status === 'PENDING' ? 'Approve Account Request' : 'Edit Role & Branches'}
              </h3>
              <button
                onClick={() => setActionType(null)}
                className="text-slate-400 hover:text-white rounded-lg p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Configuring access for <strong className="text-white">{selectedUser.full_name}</strong> ({selectedUser.email})
            </p>

            <form onSubmit={handleApproveSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Assigned Role
                </label>
                <select
                  value={assignRole}
                  onChange={(e) => setAssignRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                >
                  <option value="OPERATOR">OPERATOR</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="AUDITOR">AUDITOR</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Authorized Branch Stations:
                </label>
                <div className="max-h-40 overflow-y-auto p-2 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5 text-xs">
                  {stations.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-900 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assignedStationIds.includes(s.id)}
                        onChange={() => handleStationCheckbox(s.id)}
                        className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                      />
                      <span className="font-medium text-slate-200">{s.name}</span>
                      <span className="text-slate-500 text-[10px] font-mono">({s.code})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActionType(null)}
                  className="px-4 py-2 rounded-lg border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save & Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REJECT REQUEST */}
      {actionType === 'reject' && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-100">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-rose-400">Reject Account Request</h3>
              <button
                onClick={() => setActionType(null)}
                className="text-slate-400 hover:text-white rounded-lg p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              State the reason for rejecting <strong className="text-white">{selectedUser.full_name}</strong>:
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Unverified employee ID or unauthorized branch request"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:ring-1 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActionType(null)}
                  className="px-4 py-2 rounded-lg border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Rejecting...' : 'Reject User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
