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
    // In production/demo, use HTTPS or public domain
    const host = window.location.host;
    // Set URL
    setUrl(`https://${host}/demo/${targetVariant}`);
    setCredentials('test@example.com : password123');
    setNotes(`Target variant submission: ${targetVariant}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.startsWith('https://')) {
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Submit Deliverable for AI Verification</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              The AI cloud browser will test this URL against the approved rubric.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 mb-5 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Demo Pre-sets for Hackathon Evaluators */}
        <div className="bg-sky-50/60 border border-sky-200 rounded-xl p-3.5 mb-6">
          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>Demo Test Targets (One-Click Populate):</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('good')}
              className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-sky-300 text-sky-800 rounded-md hover:bg-sky-100 transition"
            >
              ✓ 100% Passing Target
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('mobile-broken')}
              className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-amber-300 text-amber-800 rounded-md hover:bg-amber-100 transition"
            >
              ⚠ 70% Mobile-Broken
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('broken-login')}
              className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-rose-300 text-rose-800 rounded-md hover:bg-rose-100 transition"
            >
              ✗ &lt;60% Broken Login
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Live Staging or Production URL (HTTPS Only) *
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="url"
                required
                placeholder="https://your-deployed-site.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Publicly reachable URL. Private, loopback, and local IP addresses are blocked (SSRF security).
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Optional Test Credentials
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="demo_user@example.com / tempPass123"
                value={credentials}
                onChange={(e) => setCredentials(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500 inline" />
              <span>Encrypted with AES-256-GCM at rest, deleted 30 days after job closes.</span>
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Freelancer Delivery Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. All requirements completed. Auth tested on desktop and mobile."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Checklist Recap */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
            <span className="font-bold text-slate-700 block mb-1.5">What the AI Agent will test:</span>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600">
              {checklistItems.slice(0, 4).map((i, idx) => (
                <li key={idx} className="truncate">
                  {i.description} ({i.weight} pts)
                </li>
              ))}
              {checklistItems.length > 4 && (
                <li className="text-slate-400 italic">+{checklistItems.length - 4} more items</li>
              )}
            </ul>
          </div>

          <div className="pt-2 flex justify-end gap-3">
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
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-sm transition inline-flex items-center gap-1.5 disabled:opacity-50"
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
