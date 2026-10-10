import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, ArrowRight, Shield, AlertCircle, Sparkles, Video, RefreshCw, X } from 'lucide-react';
import { StepProgress } from '../components/StepProgress';
import { scansApi } from '../api/scans';
import { useAuth } from '../auth/AuthContext';

export function VehicleScan({ onScanCompleted, onManualEntered, onNavigateToHistory, onNavigateToProfile }) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [manualPlate, setManualPlate] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Live camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const currentStationName = user?.assigned_stations?.[0]?.name || 'All Stations';

  // Seeded quick-test cases from Implementation Plan
  const demoPlates = [
    { plate: 'GJ01AB1234', label: 'Valid CNG', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
    { plate: 'GJ05EF9012', label: 'Due Soon', color: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
    { plate: 'GJ06GH3456', label: 'Overdue', color: 'border-rose-500/40 text-rose-400 bg-rose-500/10' },
    { plate: 'GJ27JK7890', label: 'Failed', color: 'border-red-600/40 text-red-400 bg-red-600/10' },
    { plate: 'DL01XY9999', label: 'Not Found', color: 'border-slate-600/40 text-slate-300 bg-slate-800' },
    { plate: 'MH02AB5678', label: 'Petrol (N/A)', color: 'border-sky-500/40 text-sky-400 bg-sky-500/10' },
  ];

  // Stop camera stream cleanup
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  // Start live webcam in browser
  const startCamera = async () => {
    setCameraError('');
    setErrorMessage('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraActive(true);
    } catch (err) {
      setCameraError('Could not access camera. Please check camera permissions or upload an image.');
    }
  };

  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((err) => console.warn('Camera video play error:', err));
    }
  }, [isCameraActive]);

  // Capture snapshot from live webcam
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      stopCamera();
      const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
      await handleFileSelected(file);
    }, 'image/jpeg', 0.92);
  };

  const handleFileSelected = async (file) => {
    if (!file) return;
    setErrorMessage('');
    setIsProcessing(true);
    setActiveStep(1);

    try {
      const timer1 = setTimeout(() => setActiveStep(2), 600);
      const timer2 = setTimeout(() => setActiveStep(3), 1200);

      const stnId = user?.assigned_stations?.[0]?.id || null;
      const uploadRes = await scansApi.uploadMedia(file, stnId);

      clearTimeout(timer1);
      clearTimeout(timer2);
      setActiveStep(3);

      setTimeout(() => {
        setIsProcessing(false);
        onScanCompleted(uploadRes);
      }, 400);
    } catch (err) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Media analysis failed. Please type the plate manually.');
    }
  };

  const handleManualSubmit = (e) => {
    e?.preventDefault();
    if (!manualPlate.trim()) return;
    setErrorMessage('');
    onManualEntered(manualPlate.trim().toUpperCase());
  };

  const handleQuickDemoClick = (plate) => {
    setManualPlate(plate);
    setErrorMessage('');
    onManualEntered(plate);
  };

  return (
    <div className="max-w-md mx-auto w-full flex flex-col min-h-[calc(100vh-140px)] pb-6 px-2">
      {/* Top Station Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs uppercase font-bold text-slate-400">HydroSafe</span>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
          {currentStationName}
        </span>
      </div>

      <div className="mb-4">
        <h1 className="text-2xl font-black text-white tracking-tight">Vehicle Inspection</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Scan vehicle plate or enter registration number to verify hydrotest status.
        </p>
      </div>

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelected(e.target.files?.[0])}
      />
      <input
        type="file"
        ref={videoInputRef}
        accept="video/*"
        className="hidden"
        onChange={(e) => handleFileSelected(e.target.files?.[0])}
      />

      {isProcessing ? (
        <div className="my-auto py-8">
          <StepProgress activeStep={activeStep} />
        </div>
      ) : (
        <div className="space-y-4 my-auto">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {cameraError && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Live In-Browser Webcam Viewfinder */}
          {isCameraActive ? (
            <div className="relative rounded-2xl overflow-hidden border-2 border-cyan-500 bg-black aspect-video flex items-center justify-center shadow-2xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Visual Alignment Box */}
              <div className="absolute inset-8 border-2 border-dashed border-cyan-400/80 rounded-xl pointer-events-none flex items-end justify-center pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 bg-slate-900/80 px-2 py-0.5 rounded">
                  Align Number Plate Here
                </span>
              </div>

              {/* Close Camera button */}
              <button
                onClick={stopCamera}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Snap Photo Trigger */}
              <div className="absolute bottom-3 inset-x-0 flex justify-center">
                <button
                  onClick={capturePhoto}
                  className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 cursor-pointer transition transform active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture & Inspect</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Live Camera Button */}
              <button
                type="button"
                onClick={startCamera}
                className="w-full min-h-[60px] rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-cyan-500/25 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Camera className="w-5 h-5 text-slate-950" />
                <span>Open Live Camera</span>
              </button>

              {/* Photo & Video Upload Options */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[48px] rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span>Upload Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="min-h-[48px] rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer"
                >
                  <Video className="w-4 h-4 text-emerald-400" />
                  <span>Upload Video</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Manual Entry Section */}
          <div className="pt-2 border-t border-slate-800">
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Or Enter Vehicle Plate Number
            </span>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualPlate}
                onChange={(e) => setManualPlate(e.target.value.toUpperCase())}
                placeholder="GJ01AB1234"
                maxLength={12}
                className="flex-1 min-h-[48px] px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold tracking-widest uppercase placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 text-sm"
              />
              <button
                type="submit"
                className="min-h-[48px] px-5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <span>Check</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Quick Test Demo Plates from Implementation Plan */}
          <div className="pt-2">
            <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              1-Click Demo Test Plates:
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {demoPlates.map((dp) => (
                <button
                  key={dp.plate}
                  type="button"
                  onClick={() => handleQuickDemoClick(dp.plate)}
                  className={`p-1.5 rounded-lg border text-left cursor-pointer transition hover:scale-102 ${dp.color}`}
                >
                  <span className="block font-mono text-[11px] font-black leading-tight">{dp.plate}</span>
                  <span className="block text-[9px] opacity-80 leading-tight">{dp.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Bar */}
      <div className="mt-auto pt-4 border-t border-slate-900 grid grid-cols-3 text-center text-xs">
        <button className="py-2 text-cyan-400 font-bold border-b-2 border-cyan-400">
          Scan
        </button>
        <button
          onClick={onNavigateToHistory}
          className="py-2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          History
        </button>
        <button
          onClick={onNavigateToProfile}
          className="py-2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          Account
        </button>
      </div>
    </div>
  );
}
