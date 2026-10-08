import React, { useState } from 'react';
import { FileCheck, ShieldCheck, Download, AlertTriangle, ChevronDown, ChevronUp, RefreshCw, FileText } from 'lucide-react';
import { VerificationBadge } from './ComplianceBadge';
import { api } from '../api/client';

export function HydrotestTimeline({ hydrotests = [], onTestVerified }) {
  const [verifyingId, setVerifyingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [errorMsg, setErrorMsg] = useState({});

  const handleVerify = async (testId) => {
    setVerifyingId(testId);
    setErrorMsg((prev) => ({ ...prev, [testId]: null }));
    try {
      const res = await api.verifyCertificate(testId);
      onTestVerified(testId, res);
      setExpandedId(testId);
    } catch (err) {
      setErrorMsg((prev) => ({ ...prev, [testId]: err.message || 'Verification service unavailable.' }));
    } finally {
      setVerifyingId(null);
    }
  };

  if (hydrotests.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
        <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
        <h4 className="text-slate-300 font-semibold text-sm">No Hydrostatic Tests Recorded</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          This asset is currently in PENDING compliance status. Perform and record an official hydrotest to establish compliance validity.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
            Hydrostatic Test Chronology & Audit History
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              {hydrotests.length} Record{hydrotests.length > 1 ? 's' : ''}
            </span>
          </h3>
          <p className="text-xs text-slate-400">Complete immutable record of all pressure tests conducted on this asset</p>
        </div>
      </div>

      <div className="divide-y divide-slate-800 mt-4">
        {hydrotests.map((test, index) => {
          let verificationData = null;
          try {
            if (test.verification_payload) {
              verificationData = JSON.parse(test.verification_payload);
            }
          } catch {
            // ignore
          }

          const isExpanded = expandedId === test.id;

          return (
            <div key={test.id} className="py-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Left: Test Date & Result */}
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 p-2 rounded-xl shrink-0 ${
                    test.result === 'PASS' ? 'bg-emerald-500/15 text-emerald-400' :
                    test.result === 'FAIL' ? 'bg-rose-500/15 text-rose-400' : 'bg-slate-500/15 text-slate-400'
                  }`}>
                    <FileCheck className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-100">
                        Test Date: {test.test_date}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        test.result === 'PASS' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        test.result === 'FAIL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                        'bg-slate-700 text-slate-300'
                      }`}>
                        {test.result}
                      </span>
                      {index === 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold uppercase tracking-wider">
                          Current / Latest Test
                        </span>
                      )}
                      <VerificationBadge status={test.verification_status} />
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-1 flex-wrap">
                      <span>Agency: <strong className="text-slate-300">{test.performed_by}</strong></span>
                      <span>•</span>
                      <span>Cert #: <strong className="text-cyan-400 font-mono">{test.certificate_number}</strong></span>
                      <span>•</span>
                      <span>Next Due: <strong className="text-slate-200">{test.next_due_date}</strong></span>
                    </div>

                    {(test.test_pressure_bar || test.working_pressure_bar) && (
                      <div className="text-[11px] text-slate-500 mt-1 flex gap-3">
                        {test.test_pressure_bar && <span>Test Pressure: <strong className="text-slate-400">{test.test_pressure_bar} bar</strong></span>}
                        {test.working_pressure_bar && <span>Working Pressure: <strong className="text-slate-400">{test.working_pressure_bar} bar</strong></span>}
                      </div>
                    )}

                    {test.notes && (
                      <p className="text-xs text-slate-400 mt-1.5 bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                        {test.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    onClick={() => handleVerify(test.id)}
                    disabled={verifyingId === test.id}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${verifyingId === test.id ? 'animate-spin' : ''}`} />
                    <span>{verifyingId === test.id ? 'Verifying...' : 'Verify Certificate'}</span>
                  </button>

                  <a
                    href={api.getDocumentUrl(test.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Report</span>
                  </a>

                  {(verificationData || errorMsg[test.id]) && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : test.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-200"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Error Alert */}
              {errorMsg[test.id] && (
                <div className="mt-2 text-xs bg-rose-500/15 text-rose-300 p-2.5 rounded-lg border border-rose-500/30 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg[test.id]}</span>
                </div>
              )}

              {/* Verification Details Dropdown */}
              {isExpanded && verificationData && (
                <div className="mt-3 p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between font-semibold text-slate-300 border-b border-slate-800 pb-1.5">
                    <span>Authorized Testing Registry Details</span>
                    <span className="font-mono text-cyan-400">{verificationData.authority || 'PESO Registry'}</span>
                  </div>
                  {verificationData.message && (
                    <p className="text-slate-400">{verificationData.message}</p>
                  )}
                  {verificationData.mismatches && verificationData.mismatches.length > 0 && (
                    <div className="text-amber-400 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                      <strong className="block mb-1">Discrepancies Noted:</strong>
                      <ul className="list-disc list-inside space-y-0.5">
                        {verificationData.mismatches.map((m, mi) => (
                          <li key={mi}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {verificationData.matched_records && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-slate-400">
                      <div>Registered Station: <strong className="text-slate-200">{verificationData.matched_records.testing_station || 'N/A'}</strong></div>
                      <div>Accreditation ID: <strong className="text-slate-200">{verificationData.matched_records.accreditation_id || 'N/A'}</strong></div>
                      <div>Registry Test Pressure: <strong className="text-slate-200">{verificationData.matched_records.test_pressure_bar || 'N/A'} bar</strong></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
