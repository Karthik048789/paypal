'use client';

import React, { useState } from 'react';
import { AlertCircle, Flag, Loader2 } from 'lucide-react';

interface DisputeModalProps {
  jobId: string;
  onDisputeOpened: () => void;
  onClose: () => void;
}

export function DisputeModal({ jobId, onDisputeOpened, onClose }: DisputeModalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 10) {
      setError('Please provide at least 10 characters explaining your dispute reason.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/jobs/${jobId}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to open dispute');
      }

      onDisputeOpened();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to open dispute';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bento-card bg-[#080b14]/95 backdrop-blur-xl rounded-2xl border border-white/[0.12] max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/[0.08]">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400">
            <Flag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Open Escrow Dispute</h3>
            <p className="text-xs text-slate-400">
              Freezes further automated captures. Escalates to PayGuard Admin for review.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Dispute Statement & Evidence Explanation *
            </label>
            <textarea
              required
              rows={4}
              placeholder="State why you believe the verification outcome was inaccurate or why the deliverable does not match the approved rubric..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-3 text-sm bg-[#05070c] text-white border border-white/[0.1] rounded-xl placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-200 leading-relaxed">
            <strong className="text-white">Dispute Policy:</strong> Submitting a dispute places all remaining held funds under arbitration lock. An administrator will review session replays and issue a final resolution (uphold, override, or void).
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-full text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.1] transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-full text-xs font-bold shadow-lg shadow-purple-500/25 active:scale-[0.98] transition-all duration-150 inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting Dispute...</span>
                </>
              ) : (
                <span>Submit Dispute</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

