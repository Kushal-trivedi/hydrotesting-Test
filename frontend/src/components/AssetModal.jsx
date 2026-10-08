import React, { useState } from 'react';
import { X, Search, CheckCircle, AlertTriangle, RefreshCw, Car, Database } from 'lucide-react';
import { api } from '../api/client';

export function AssetModal({ isOpen, onClose, sites, onAssetSaved }) {
  const [formData, setFormData] = useState({
    asset_id: '',
    site_id: sites[0]?.id || '',
    asset_type: 'VEHICLE_CYLINDER',
    serial_number: '',
    manufacturer: '',
    model: '',
    capacity_liters: '',
    installation_date: '',
    cylinder_number: '',
    vehicle_number: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_fuel_type: '',
    vehicle_verified: false,
    status: 'ACTIVE',
  });

  const [verifyingVehicle, setVerifyingVehicle] = useState(false);
  const [vehicleMsg, setVehicleMsg] = useState(null);
  const [vehicleMsgType, setVehicleMsgType] = useState('info');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  if (!isOpen) return null;

  const handleVehicleLookup = async () => {
    if (!formData.vehicle_number || formData.vehicle_number.trim().length < 4) {
      setVehicleMsg('Please enter a valid vehicle number first (e.g. GJ01AB1234).');
      setVehicleMsgType('error');
      return;
    }

    setVerifyingVehicle(true);
    setVehicleMsg(null);
    try {
      const res = await api.lookupVehicle(formData.vehicle_number);
      if (res.success && res.data) {
        setFormData((prev) => ({
          ...prev,
          vehicle_number: res.data.vehicle_number,
          vehicle_make: res.data.make,
          vehicle_model: res.data.model,
          vehicle_fuel_type: res.data.fuel_type,
          vehicle_verified: true,
        }));
        setVehicleMsg(res.message);
        setVehicleMsgType('success');
      } else {
        setVehicleMsg(res.message || 'Vehicle details could not be retrieved from registry.');
        setVehicleMsgType('error');
      }
    } catch (err) {
      setVehicleMsg(err.message || 'Vehicle service temporarily unavailable. Please try again later.');
      setVehicleMsgType('error');
    } finally {
      setVerifyingVehicle(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const payload = {
      ...formData,
      site_id: Number(formData.site_id),
      capacity_liters: formData.capacity_liters ? parseFloat(formData.capacity_liters) : null,
      installation_date: formData.installation_date || null,
      cylinder_number: formData.cylinder_number || null,
      vehicle_number: formData.vehicle_number || null,
      vehicle_make: formData.vehicle_make || null,
      vehicle_model: formData.vehicle_model || null,
      vehicle_fuel_type: formData.vehicle_fuel_type || null,
    };

    try {
      const created = await api.createAsset(payload);
      onAssetSaved(created);
      onClose();
    } catch (err) {
      setFormError(err.message || 'Failed to register asset.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl my-8 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Register New CNG Equipment / Asset</h2>
              <p className="text-xs text-slate-400">Record equipment, link optional vehicle, and initialize tracking</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {formError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Section 1: Core Equipment Identification */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Core Equipment Identification</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Asset ID <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CNG-CYL-2026-012"
                  value={formData.asset_id}
                  onChange={(e) => setFormData({ ...formData, asset_id: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Station / Site <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={formData.site_id}
                  onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Asset Type <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={formData.asset_type}
                  onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="VEHICLE_CYLINDER">Vehicle CNG Cylinder</option>
                  <option value="CASCADE_STORAGE">Station Cascade Storage Bank</option>
                  <option value="DISPENSER_BUFFER">Dispenser Buffer Vessel</option>
                  <option value="PIPELINE_HEADER">Pipeline / Manifold Header</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Serial Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SN-8849201"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Technical Specifications */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Technical Specifications</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Manufacturer</label>
                <input
                  type="text"
                  placeholder="e.g. EKC Ltd"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Model</label>
                <input
                  type="text"
                  placeholder="e.g. Type-1 Steel"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Capacity (Liters)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 60.0"
                  value={formData.capacity_liters}
                  onChange={(e) => setFormData({ ...formData, capacity_liters: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Cylinder Marking</label>
                <input
                  type="text"
                  placeholder="e.g. CYL-45892"
                  value={formData.cylinder_number}
                  onChange={(e) => setFormData({ ...formData, cylinder_number: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Vehicle Binding & VAHAN Verification (Option B) */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-cyan-400" />
                <span>3. Vehicle Binding & VAHAN Verification (Optional)</span>
              </h3>
              <span className="text-[11px] text-slate-500">Only for vehicle-mounted cylinders</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Vehicle Plate (e.g. GJ01AB1234)"
                value={formData.vehicle_number}
                onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value.toUpperCase() })}
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 font-mono tracking-wider focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={handleVehicleLookup}
                disabled={verifyingVehicle}
                className="px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${verifyingVehicle ? 'animate-spin' : ''}`} />
                <span>{verifyingVehicle ? 'Verifying...' : 'Verify Vehicle'}</span>
              </button>
            </div>

            {vehicleMsg && (
              <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                vehicleMsgType === 'success' ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30' : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
              }`}>
                {vehicleMsgType === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{vehicleMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Vehicle Make</label>
                <input
                  type="text"
                  placeholder="e.g. Maruti Suzuki"
                  value={formData.vehicle_make}
                  onChange={(e) => setFormData({ ...formData, vehicle_make: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Vehicle Model</label>
                <input
                  type="text"
                  placeholder="e.g. WagonR CNG"
                  value={formData.vehicle_model}
                  onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Fuel Type</label>
                <input
                  type="text"
                  placeholder="e.g. CNG / Petrol"
                  value={formData.vehicle_fuel_type}
                  onChange={(e) => setFormData({ ...formData, vehicle_fuel_type: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white text-xs font-bold transition shadow-lg shadow-cyan-600/20 disabled:opacity-50"
            >
              {submitting ? 'Registering...' : 'Complete Asset Registration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
