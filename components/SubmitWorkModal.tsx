'use client';

import React, { useState } from 'react';
import { Globe, Lock, ShieldCheck, AlertCircle, Loader2, Sparkles } from 'lucide-react';

interface SubmitWorkModalProps {
  jobId: string;
  checklistItems: Array<{ description: string; testType: string; weight: number }>;
  onSubmitted: (runId: string) => void;
  onClose: () => void;
}

export function SubmitWorkModal({
  jobId,
  checklistItems,
  onSubmitted,
  onClose,
}: SubmitWorkModalProps) {
  const [url, setUrl] = useState('');
  const [credentials, setCredentials] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleQuickFill = (targetVariant: string) => {
    // In local evaluation use the current origin; in production use HTTPS
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://payguard-demo.cloud';
    setUrl(`${origin}/demo/${targetVariant}`);
    setCredentials('test@example.com : password123');
    setNotes(`Target variant submission: ${targetVariant}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.startsWith('https://') && !url.includes('/demo/')) {
      setError('Submission URL must use secure HTTPS protocol (FR-15).');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/jobs/${jobId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          credentials: credentials.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      onSubmitted(data.runId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Submission failed';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bento-card bg-[#080b14]/95 backdrop-blur-xl rounded-2xl border border-white/[0.12] max-w-xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">Submit Deliverable for AI Verification</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              The AI cloud browser will test this URL against the approved rubric.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold p-1 transition-colors duration-150"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 mb-5 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Demo Pre-sets for Hackathon Evaluators */}
        <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3.5 mb-6">
          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Demo Test Targets (One-Click Populate):</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('good')}
              className="px-3 py-1 text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full hover:bg-emerald-500/20 transition-colors duration-150"
            >
              ✓ 100% Passing Target
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('mobile-broken')}
              className="px-3 py-1 text-[11px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full hover:bg-amber-500/20 transition-colors duration-150"
            >
              ⚠ 70% Mobile-Broken
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('broken-login')}
              className="px-3 py-1 text-[11px] font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full hover:bg-rose-500/20 transition-colors duration-150"
            >
              ✗ &lt;60% Broken Login
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Live Staging or Production URL (HTTPS Only) *
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="url"
                required
                placeholder="https://your-deployed-site.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-[#05070c] text-white border border-white/[0.1] rounded-xl placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Publicly reachable URL. Private, loopback, and local IP addresses are blocked (SSRF security).
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Optional Test Credentials
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="demo_user@example.com / tempPass123"
                value={credentials}
                onChange={(e) => setCredentials(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-[#05070c] text-white border border-white/[0.1] rounded-xl placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500 inline" />
              <span>Encrypted with AES-256-GCM at rest, deleted 30 days after job closes.</span>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Freelancer Delivery Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. All requirements completed. Auth tested on desktop and mobile."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 text-sm bg-[#05070c] text-white border border-white/[0.1] rounded-xl placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Checklist Recap */}
          <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-3.5 text-xs">
            <span className="font-bold text-slate-300 block mb-1.5">What the AI Agent will test:</span>
            <ul className="list-disc list-inside space-y-0.5 text-slate-400">
              {checklistItems.slice(0, 4).map((i, idx) => (
                <li key={idx} className="truncate">
                  {i.description} ({i.weight} pts)
                </li>
              ))}
              {checklistItems.length > 4 && (
                <li className="text-slate-500 italic">+{checklistItems.length - 4} more items</li>
              )}
            </ul>
          </div>

          <div className="pt-2 flex justify-end gap-3">
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
              className="px-6 py-2 bg-white hover:bg-slate-200 text-slate-950 rounded-full text-xs font-bold shadow-lg shadow-white/10 active:scale-[0.98] transition-transform duration-150 inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Launching Cloud Agent...</span>
                </>
              ) : (
                <span>Start AI Verification</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

