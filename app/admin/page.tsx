'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';
import { Shield, AlertCircle, CheckCircle2, RotateCcw, Clock, DollarSign, Database, Loader2 } from 'lucide-react';

export default function AdminPage() {
  const [data, setData] = useState<{
    paymentEvents: any[];
    auditLogs: any[];
    disputes: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionReason, setResolutionReason] = useState('');
  const [overrideAmount, setOverrideAmount] = useState('');
  const [watcherReport, setWatcherReport] = useState<any>(null);
  const [runningWatcher, setRunningWatcher] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/events');
      const json = await res.json();
      if (json.paymentEvents) {
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleResolveDispute = async (disputeId: string, action: 'uphold' | 'override' | 'void') => {
    if (!resolutionReason.trim()) {
      alert('Please enter a written reason for the audit log.');
      return;
    }

    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reason: resolutionReason.trim(),
          overrideAmountCents: overrideAmount ? Math.round(Number(overrideAmount) * 100) : undefined,
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        setResolvingId(null);
        setResolutionReason('');
        setOverrideAmount('');
        fetchAdminData();
      } else {
        alert(resData.error || 'Failed to resolve dispute');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error resolving dispute');
    }
  };

  const triggerWatcher = async () => {
    setRunningWatcher(true);
    try {
      const res = await fetch('/api/cron/watcher', { method: 'POST' });
      const json = await res.json();
      setWatcherReport(json.report);
      fetchAdminData();
    } finally {
      setRunningWatcher(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200 mb-2">
              <Shield className="w-3.5 h-3.5" />
              Administrative Governance
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">Admin Arbitration & Audit Trail</h1>
            <p className="text-xs text-slate-500 mt-1">
              Dispute arbitration queue, immutable payment event records, and authorization watcher controls.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={triggerWatcher}
              disabled={runningWatcher}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {runningWatcher ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
              <span>Run Auth Watcher Cron</span>
            </button>
          </div>
        </div>

        {/* Watcher Report Banner if triggered */}
        {watcherReport && (
          <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl mb-8 text-xs text-sky-900 flex justify-between items-center">
            <div>
              <strong>Watcher Run Completed:</strong> Checked {watcherReport.checkedCount} authorizations,{' '}
              reauthorized {watcherReport.reauthorizedCount}, expired {watcherReport.expiredCount}.
            </div>
            <span className="font-mono text-[10px] text-sky-600">{watcherReport.timestamp}</span>
          </div>
        )}

        {/* Section 1: Disputes Queue (FR-34, FR-35) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs mb-8">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <h2 className="text-base font-bold text-slate-900">
              Escrow Disputes Queue ({data?.disputes.filter((d) => d.status === 'OPEN').length || 0} Open)
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading disputes...</div>
          ) : !data?.disputes || data.disputes.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No disputes recorded.</div>
          ) : (
            <div className="space-y-4">
              {data.disputes.map((dispute) => (
                <div
                  key={dispute.id}
                  className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between gap-4"
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{dispute.job.title}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                        {dispute.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      <strong>Reason: </strong>
                      &quot;{dispute.reason}&quot;
                    </p>
                    <div className="text-[11px] text-slate-400">
                      Opened by: <strong>{dispute.user.name}</strong> ({dispute.user.email}) on{' '}
                      {new Date(dispute.createdAt).toLocaleString()}
                    </div>
                    {dispute.resolution && (
                      <div className="text-xs text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200 mt-2">
                        <strong>Resolution Note:</strong> {dispute.resolution} (by {dispute.resolvedBy})
                      </div>
                    )}
                  </div>

                  {dispute.status === 'OPEN' && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {resolvingId === dispute.id ? (
                        <div className="p-3 bg-white border border-slate-300 rounded-lg shadow-sm space-y-2">
                          <textarea
                            placeholder="Written reason for audit log..."
                            value={resolutionReason}
                            onChange={(e) => setResolutionReason(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded text-xs"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleResolveDispute(dispute.id, 'uphold')}
                              className="px-2.5 py-1 text-xs font-bold bg-slate-800 text-white rounded hover:bg-slate-700"
                            >
                              Uphold Held
                            </button>
                            <button
                              onClick={() => handleResolveDispute(dispute.id, 'override')}
                              className="px-2.5 py-1 text-xs font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700"
                            >
                              Override 100%
                            </button>
                            <button
                              onClick={() => handleResolveDispute(dispute.id, 'void')}
                              className="px-2.5 py-1 text-xs font-bold bg-rose-600 text-white rounded hover:bg-rose-700"
                            >
                              Void & Refund
                            </button>
                            <button
                              onClick={() => setResolvingId(null)}
                              className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setResolvingId(dispute.id)}
                          className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition"
                        >
                          Resolve Dispute
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Immutable Payment Events Log (Unique Idempotency Keys) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs mb-8">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <h2 className="text-base font-bold text-slate-900">
              Immutable Payment Events Log (Append-Only)
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              Protected by unique idempotency constraint
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Job Title</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Idempotency Key</th>
                  <th className="py-2.5 px-3">PayPal Ref</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {!data?.paymentEvents || data.paymentEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400 font-sans">
                      No payment events recorded yet.
                    </td>
                  </tr>
                ) : (
                  data.paymentEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            evt.type === 'capture'
                              ? 'bg-emerald-100 text-emerald-800'
                              : evt.type === 'void'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {evt.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-800 truncate max-w-[200px]">
                        {evt.job.title}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        ${(evt.amount / 100).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-500 truncate max-w-[220px]">
                        {evt.idempotencyKey}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-sky-600 truncate max-w-[150px]">
                        {evt.paypalRef || 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {new Date(evt.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: System Audit Trail (NFR-S8) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <h2 className="text-base font-bold text-slate-900">
              System Audit Trail (Security & Compliance)
            </h2>
            <span className="text-xs text-slate-400 font-mono">NFR-S8 Compliant</span>
          </div>

          <div className="overflow-x-auto max-h-[350px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Details</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {!data?.auditLogs || data.auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 font-sans">
                      No audit records found.
                    </td>
                  </tr>
                ) : (
                  data.auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-bold text-slate-700">{log.action}</td>
                      <td className="py-2 px-3 text-slate-600 font-sans truncate max-w-[150px]">
                        {log.actor}
                      </td>
                      <td className="py-2 px-3 text-slate-500 font-sans">{log.entity}</td>
                      <td className="py-2 px-3 text-[11px] text-slate-400 truncate max-w-[300px]">
                        {log.after || log.before}
                      </td>
                      <td className="py-2 px-3 text-slate-400 font-sans">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

