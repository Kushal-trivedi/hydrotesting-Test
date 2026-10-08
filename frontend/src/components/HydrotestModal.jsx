import React, { useState, useEffect } from 'react';
import { X, FileCheck, Upload, AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';

export function HydrotestModal({ isOpen, onClose, asset, onTestRecorded }) {
  const [formData, setFormData] = useState({
    test_date: new Date().toISOString().split('T')[0],
    performed_by: '',
    result: 'PASS',
    next_due_date: '',
    certificate_number: '',
    cylinder_number: '',
    test_pressure_bar: '335.0',
    working_pressure_bar: '200.0',
    notes: '',
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Auto calculate default next due date (+3 years for vehicle cylinders, +5 years for cascades)
  useEffect(() => {
    if (asset && formData.test_date) {
      const isVehicle = asset.asset_type === 'VEHICLE_CYLINDER';
      const yearsToAdd = isVehicle ? 3 : 5;
      const testD = new Date(formData.test_date);
      testD.setFullYear(testD.getFullYear() + yearsToAdd);
      testD.setDate(testD.getDate() - 1); // 1 day before anniversary
      const calculatedDue = testD.toISOString().split('T')[0];

      setFormData((prev) => ({
        ...prev,
        next_due_date: calculatedDue,
        cylinder_number: asset.cylinder_number || '',
      }));
    }
  }, [asset, formData.test_date]);

  if (!isOpen || !asset) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const payload = {
      asset_id: asset.id,
      test_date: formData.test_date,
      performed_by: formData.performed_by,
      result: formData.result,
      next_due_date: formData.next_due_date,
      certificate_number: formData.certificate_number,
      cylinder_number: formData.cylinder_number || null,
      test_pressure_bar: formData.test_pressure_bar ? parseFloat(formData.test_pressure_bar) : null,
      working_pressure_bar: formData.working_pressure_bar ? parseFloat(formData.working_pressure_bar) : null,
      notes: formData.notes || null,
    };

    try {
      const newTest = await api.recordHydrotest(payload);

      // Upload file if selected
      if (selectedFile) {
        try {
          await api.uploadDocument(newTest.id, selectedFile);
        } catch (uploadErr) {
          console.warn('File upload warning:', uploadErr);
        }
      }

      onTestRecorded(newTest);
      onClose();
    } catch (err) {
      setFormError(err.message || 'Failed to record hydrotest.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl my-8 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Record Hydrostatic Pressure Test</h2>
              <p className="text-xs text-slate-400">
                Asset: <span className="text-cyan-400 font-mono font-semibold">{asset.asset_id}</span>
              </p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Inspection / Test Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.test_date}
                onChange={(e) => setFormData({ ...formData, test_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Inspection Result <span className="text-rose-400">*</span>
              </label>
              <select
                required
                value={formData.result}
                onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="PASS">PASS — Hydrostatic Expansion OK</option>
                <option value="FAIL">FAIL — Pressure Decay / Permanent Stretch</option>
                <option value="PENDING">PENDING — In Testing Facility</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Next Due Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.next_due_date}
                onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Calculated rule: {asset.asset_type === 'VEHICLE_CYLINDER' ? '+3 years (Vehicle cylinder)' : '+5 years (Cascade bank)'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Certificate Number <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. PESO-GJ-2026-1049"
                value={formData.certificate_number}
                onChange={(e) => setFormData({ ...formData, certificate_number: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Performed By / Testing Agency <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Gujarat Gas Testing Agency #4 / PESO Accredited Hub"
              value={formData.performed_by}
              onChange={(e) => setFormData({ ...formData, performed_by: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Test Pressure (bar)</label>
              <input
                type="number"
                step="0.1"
                value={formData.test_pressure_bar}
                onChange={(e) => setFormData({ ...formData, test_pressure_bar: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Working Pressure (bar)</label>
              <input
                type="number"
                step="0.1"
                value={formData.working_pressure_bar}
                onChange={(e) => setFormData({ ...formData, working_pressure_bar: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Cylinder Marking</label>
              <input
                type="text"
                value={formData.cylinder_number}
                onChange={(e) => setFormData({ ...formData, cylinder_number: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Visual Inspection Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Ultrasonic thickness gauge verified. No pitting or thread wear. Tare weight within tolerance."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Upload Certificate Document (PDF/Image)</label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-cyan-300 hover:file:bg-slate-700 cursor-pointer"
              />
            </div>
          </div>

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
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {submitting ? 'Recording...' : 'Save Hydrotest Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
