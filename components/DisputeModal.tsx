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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
            <Flag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Open Escrow Dispute</h3>
            <p className="text-xs text-slate-500">
              Freezes further automated captures. Escalates to PayGuard Admin for review.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Dispute Statement & Evidence Explanation *
            </label>
            <textarea
              required
              rows={4}
              placeholder="State why you believe the verification outcome was inaccurate or why the deliverable does not match the approved rubric..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-900 leading-relaxed">
            <strong>Dispute Policy:</strong> Submitting a dispute places all remaining held funds under arbitration lock. An administrator will review session replays and issue a final resolution (uphold, override, or void).
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-sm transition inline-flex items-center gap-1.5 disabled:opacity-50"
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
