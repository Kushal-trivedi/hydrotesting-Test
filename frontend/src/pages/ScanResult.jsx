import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { ResultCard } from '../components/ResultCard';

export function ScanResult({ result, onScanNext, onViewAsset, onBack }) {
  return (
    <div className="max-w-md mx-auto w-full flex flex-col min-h-[calc(100vh-140px)] pb-6 px-2">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-4">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Inspection Result</h1>
          <p className="text-[11px] text-slate-400">Hydrotest compliance verdict</p>
        </div>
      </div>

      <div className="my-auto py-2">
        <ResultCard
          result={result}
          onScanNext={onScanNext}
          onViewAsset={onViewAsset}
        />
      </div>
    </div>
  );
}
