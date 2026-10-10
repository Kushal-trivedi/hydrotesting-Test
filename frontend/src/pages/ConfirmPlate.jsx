import React, { useState } from 'react';
import { ArrowLeft, Check, AlertCircle, Edit3, Loader2 } from 'lucide-react';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { scansApi } from '../api/scans';

export function ConfirmPlate({ scanData, onConfirmed, onBack }) {
  const defaultPlate =
    scanData?.candidates?.[0]?.plate || scanData?.plate || '';
  const [plateInput, setPlateInput] = useState(defaultPlate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const candidates = scanData?.candidates || [];
  const confidenceLevel = scanData?.confidence_level || 'MEDIUM';
  const bestFrameUrl = scanData?.best_frame_url
    ? scansApi.getFrameUrl(scanData.scan_id)
    : null;

  const handleConfirm = async (e) => {
    e?.preventDefault();
    if (!plateInput.trim()) {
      setErrorMsg('Please specify or confirm a valid vehicle registration plate.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const confirmRes = await scansApi.confirmPlate(scanData.scan_id, plateInput.trim().toUpperCase());
      setIsSubmitting(false);
      onConfirmed(confirmRes);
    } catch (err) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Confirmation failed. Please try again.');
    }
  };

  return (
    <div className="max-w-md mx-auto w-full flex flex-col min-h-[calc(100vh-140px)] pb-6 px-2">
      {/* Top back navigation (Section 5.2 wireframe) */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-4">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Confirm Plate</h1>
          <p className="text-[11px] text-slate-400">A person always confirms the plate</p>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Best Frame Boxed Preview (Section 5.2 wireframe) */}
      <div className="w-full rounded-2xl overflow-hidden border border-slate-700 bg-slate-950/80 mb-4 shadow-xl">
        {bestFrameUrl ? (
          <img
            src={bestFrameUrl}
            alt="Best boxed license plate frame"
            className="w-full h-48 sm:h-56 object-contain bg-black/60"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="h-44 flex items-center justify-center text-xs text-slate-500">
            No frame preview available
          </div>
        )}
      </div>

      {/* Plate Reading & Confidence Section */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">We read:</span>
            <ConfidenceBadge level={confidenceLevel} />
          </div>

          <div className="relative">
            <input
              type="text"
              value={plateInput}
              onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
              placeholder="GJ01AB1234"
              maxLength={12}
              className="w-full min-h-[52px] px-4 rounded-xl bg-slate-900 border-2 border-slate-600 focus:border-cyan-400 text-white font-mono font-black text-xl tracking-widest uppercase text-center shadow-inner focus:outline-none"
            />
            <Edit3 className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {confidenceLevel === 'LOW' && (
            <p className="text-xs text-rose-400 font-medium mt-1.5 flex items-center gap-1.5 animate-pulse">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Low confidence. Check every character carefully!</span>
            </p>
          )}
        </div>

        {/* Other Guesses / Alternative Candidates (Section 5.2 wireframe) */}
        {candidates.length > 1 && (
          <div>
            <span className="block text-xs font-semibold text-slate-400 mb-2">Other guesses:</span>
            <div className="space-y-1.5">
              {candidates.map((cand, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPlateInput(cand.plate)}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between font-mono text-sm transition-all cursor-pointer ${
                    plateInput === cand.plate
                      ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold tracking-wider">{cand.plate}</span>
                  <span className="text-[11px] font-sans opacity-70">
                    {Math.round(cand.confidence * 100)}% ({cand.frames} frames)
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Submit Confirm and Check Button (>=48px touch height) */}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleConfirm}
          className="w-full min-h-[54px] rounded-2xl bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Checking compliance...</span>
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              <span>Confirm and check</span>
            </>
          )}
        </button>

        <p className="text-center text-xs text-slate-500">
          Cannot read it? Edit the plate number directly above.
        </p>
      </div>
    </div>
  );
}
