'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
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
    <AppShell>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-2">
              <Shield className="w-3.5 h-3.5" />
              Administrative Governance
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Arbitration & Immutable Audit Trail</h1>
            <p className="text-xs text-slate-400 mt-1">
              Dispute arbitration queue, append-only payment events, and authorization watcher controls.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={triggerWatcher}
              disabled={runningWatcher}
              className="px-5 py-2.5 bg-white hover:bg-slate-200 active:scale-[0.98] text-slate-950 text-xs font-bold rounded-full shadow-lg shadow-white/10 transition-transform duration-150 inline-flex items-center gap-2 disabled:opacity-50"
            >
              {runningWatcher ? <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" /> : <Clock className="w-3.5 h-3.5 text-slate-950" />}
              <span>Run Auth Watcher Cron</span>
            </button>
          </div>
        </div>

        {/* Watcher Report Banner if triggered */}
        {watcherReport && (
          <div className="p-4 bg-sky-500/10 border border-sky-500/20 rounded-xl mb-8 text-xs text-sky-200 flex justify-between items-center">
            <div>
              <strong className="text-white">Watcher Run Completed:</strong> Checked {watcherReport.checkedCount} authorizations,{' '}
              reauthorized {watcherReport.reauthorizedCount}, expired {watcherReport.expiredCount}.
            </div>
            <span className="font-mono text-[11px] text-sky-400">{watcherReport.timestamp}</span>
          </div>
        )}

        {/* Section 1: Disputes Queue (FR-34, FR-35) */}
        <div className="bg-[#0b0f19] rounded-2xl border border-white/[0.08] p-6 shadow-xl mb-8">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
            <h2 className="text-sm font-semibold text-white">
              Escrow Disputes Queue ({data?.disputes.filter((d) => d.status === 'OPEN').length || 0} Open)
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading disputes...</div>
          ) : !data?.disputes || data.disputes.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">No disputes recorded.</div>
          ) : (
            <div className="space-y-4">
              {data.disputes.map((dispute) => (
                <div
                  key={dispute.id}
                  className="p-5 rounded-xl border border-white/[0.08] bg-[#06080d]/60 flex flex-col md:flex-row justify-between gap-4"
                >
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">{dispute.job.title}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/25">
                        {dispute.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      <strong className="text-slate-400">Reason: </strong>
                      &quot;{dispute.reason}&quot;
                    </p>
                    <div className="text-[11px] text-slate-400">
                      Opened by: <span className="text-slate-300 font-medium">{dispute.user.name}</span> ({dispute.user.email}) on{' '}
                      {new Date(dispute.createdAt).toLocaleString()}
                    </div>
                    {dispute.resolution && (
                      <div className="text-xs text-emerald-300 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 mt-2">
                        <strong className="text-emerald-200">Resolution Note:</strong> {dispute.resolution} (by {dispute.resolvedBy})
                      </div>
                    )}
                  </div>

                  {dispute.status === 'OPEN' && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {resolvingId === dispute.id ? (
                        <div className="p-3 bg-[#06080d] border border-white/[0.1] rounded-xl shadow-lg space-y-2">
                          <textarea
                            placeholder="Written reason for audit log..."
                            value={resolutionReason}
                            onChange={(e) => setResolutionReason(e.target.value)}
                            className="w-full p-2.5 bg-[#0b0f19] border border-white/[0.1] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleResolveDispute(dispute.id, 'uphold')}
                              className="px-2.5 py-1 text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-lg border border-white/[0.1] transition-colors duration-150"
                            >
                              Uphold Held
                            </button>
                            <button
                              onClick={() => handleResolveDispute(dispute.id, 'override')}
                              className="px-2.5 py-1 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg shadow-sm transition-colors duration-150"
                            >
                              Override 100%
                            </button>
                            <button
                              onClick={() => handleResolveDispute(dispute.id, 'void')}
                              className="px-2.5 py-1 text-xs font-semibold bg-rose-500 hover:bg-rose-400 text-white rounded-lg shadow-sm transition-colors duration-150"
                            >
                              Void & Refund
                            </button>
                            <button
                              onClick={() => setResolvingId(null)}
                              className="px-2 py-1 text-xs text-slate-400 hover:text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setResolvingId(dispute.id)}
                          className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white text-xs font-semibold rounded-xl shadow-md transition-colors duration-150"
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
        <div className="bg-[#0b0f19] rounded-2xl border border-white/[0.08] p-6 shadow-xl mb-8">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
            <h2 className="text-sm font-semibold text-white">
              Immutable Payment Events Log (Append-Only)
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">
              Protected by unique idempotency constraint
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] text-slate-400 font-medium border-b border-white/[0.06]">
                <tr>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Job Title</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Idempotency Key</th>
                  <th className="py-2.5 px-3">PayPal Ref</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] font-mono">
                {!data?.paymentEvents || data.paymentEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500 font-sans">
                      No payment events recorded yet.
                    </td>
                  </tr>
                ) : (
                  data.paymentEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                            evt.type === 'capture'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : evt.type === 'void'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          }`}
                        >
                          {evt.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-200 truncate max-w-[200px]">
                        {evt.job.title}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-white font-mono">
                        ${(evt.amount / 100).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-400 truncate max-w-[220px]">
                        {evt.idempotencyKey}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-sky-400 truncate max-w-[150px]">
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
        <div className="bg-[#0b0f19] rounded-2xl border border-white/[0.08] p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
            <h2 className="text-sm font-semibold text-white">
              System Audit Trail (Security & Compliance)
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">NFR-S8 Compliant</span>
          </div>

          <div className="overflow-x-auto max-h-[350px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] text-slate-400 font-medium border-b border-white/[0.06] sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Details</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] font-mono">
                {!data?.auditLogs || data.auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                      No audit records found.
                    </td>
                  </tr>
                ) : (
                  data.auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02]">
                      <td className="py-2 px-3 font-semibold text-slate-200">{log.action}</td>
                      <td className="py-2 px-3 text-slate-300 font-sans truncate max-w-[150px]">
                        {log.actor}
                      </td>
                      <td className="py-2 px-3 text-slate-400 font-sans">{log.entity}</td>
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
    </AppShell>
  );
}
