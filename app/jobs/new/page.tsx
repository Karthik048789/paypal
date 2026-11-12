'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import {
  Shield,
  Sparkles,
  DollarSign,
  Calendar,
  Mail,
  ArrowRight,
  Loader2,
  AlertCircle,
  Lock,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export default function CreateJobPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [requirements, setRequirements] = useState('');
  const [amount, setAmount] = useState('1000');
  const [deadline, setDeadline] = useState('');
  const [freelancerEmail, setFreelancerEmail] = useState('freelancer@payguard.dev');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDeadline(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  }, []);

  const numAmount = Number(amount) || 0;
  const platformFee = numAmount * 0.02;
  const netPayout = Math.max(0, numAmount - platformFee);

  const fillExampleRequirements = (type: 'saas' | 'ecommerce') => {
    if (type === 'saas') {
      setTitle('SaaS Authentication & User Dashboard Integration');
      setRequirements(
        'Build a responsive web app with email/password authentication. The landing page must load fast with 0 console errors. The login form should validate user inputs and redirect to the dashboard. The dashboard must be responsive on mobile viewports (390x844) with no horizontal overflow, and top navigation links must be functional.'
      );
    } else {
      setTitle('Product Catalog & Stripe/PayPal Checkout Flow');
      setRequirements(
        'Implement an e-commerce product catalog with category filters and product cards showing title, price, and image. Users must be able to add products to the shopping cart, update quantities, and proceed to the checkout form without JavaScript runtime exceptions.'
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requirements.trim().length < 20 || requirements.trim().length > 2000) {
      setError('Requirements must be between 20 and 2000 characters.');
      return;
    }
    if (numAmount < 5 || numAmount > 5000) {
      setError('Amount must be between $5.00 and $5,000.00 USD.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          requirements: requirements.trim(),
          amount: numAmount,
          deadline: new Date(deadline).toISOString(),
          freelancerEmail: freelancerEmail.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create escrow job');
      }

      router.push(`/jobs/${data.job.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Job creation failed';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-sky-400 hover:text-sky-300 mb-2 inline-block transition-colors duration-150"
          >
            ← Back to Escrow Console
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Create New Escrow Contract</h1>
          <p className="text-xs text-slate-400 mt-1">
            Specify deliverable requirements in natural language. PayGuard AI synthesizes a deterministic 100-point test rubric.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 7 cols: Form */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-7 bento-card bg-[#080b14]/85 backdrop-blur-xl p-6 sm:p-8 space-y-6"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Project Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Next.js SaaS Authentication & Dashboard"
                className="w-full px-3.5 py-2.5 bg-[#05070c] border border-white/[0.1] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors duration-150"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                Populate with example specification:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fillExampleRequirements('saas')}
                  className="px-3 py-1 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-full text-[11px] font-medium text-slate-200 transition-colors duration-150"
                >
                  SaaS Auth & Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => fillExampleRequirements('ecommerce')}
                  className="px-3 py-1 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-full text-[11px] font-medium text-slate-200 transition-colors duration-150"
                >
                  E-Commerce Catalog
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Natural-Language Deliverable Requirements *
                </label>
                <span className="text-[11px] font-mono text-slate-500">
                  {requirements.length} / 2000 chars
                </span>
              </div>
              <textarea
                required
                rows={5}
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="Describe in plain English what the website or feature should do, which viewports to test, expected authentication behaviors, and content requirements..."
                className="w-full px-3.5 py-2.5 bg-[#05070c] border border-white/[0.1] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors duration-150"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Escrow Job Amount (USD) *
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="number"
                    required
                    min="5"
                    max="5000"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-[#05070c] border border-white/[0.1] rounded-xl text-sm font-mono text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors duration-150"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Min $5.00, max $5,000.00 USD.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Target Deadline *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-[#05070c] border border-white/[0.1] rounded-xl text-sm font-mono text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors duration-150"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Voided if no submission 7 days past deadline.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Freelancer Contact Email (Payee) *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={freelancerEmail}
                  onChange={(e) => setFreelancerEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#05070c] border border-white/[0.1] rounded-xl text-sm font-mono text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors duration-150"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-7 py-3 bg-white hover:bg-slate-200 text-slate-950 text-sm font-bold rounded-full transition-transform duration-100 active:scale-[0.98] shadow-xl shadow-white/10 flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Synthesizing Checklist...</span>
                  </>
                ) : (
                  <>
                    <span>Create Job & Generate Checklist</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Right 5 cols: Live Escrow & Pipeline Preview HUD */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bento-card bg-[#080b14]/85 backdrop-blur-xl p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Live Escrow Preview</h2>
                    <p className="text-[11px] text-slate-400">PayPal Orders v2 (`intent=AUTHORIZE`)</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  2% Flat Fee
                </span>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="flex justify-between text-slate-300">
                  <span className="font-sans">Contract Title:</span>
                  <span className="font-sans font-semibold text-white truncate max-w-[180px]">
                    {title || 'Untitled Contract'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="font-sans">Total Escrow Hold:</span>
                  <span className="font-bold text-white">${numAmount.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="font-sans">Platform Service Fee (2%):</span>
                  <span>-${platformFee.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between text-base font-bold text-emerald-400 pt-3 border-t border-white/[0.08]">
                  <span className="font-sans text-white">Net Freelancer Payout:</span>
                  <span>${netPayout.toFixed(2)} USD</span>
                </div>
              </div>

              {/* 3-Stage Contract Lifecycle */}
              <div className="pt-4 border-t border-white/[0.08] space-y-3">
                <span className="text-xs font-semibold text-slate-300 block">Automated Verification Lifecycle:</span>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <Lock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>1. Dual-approve 100-pt rubric & lock PayPal hold</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <RefreshCw className="w-3.5 h-3.5 text-white shrink-0" />
                    <span>2. Chromium CDP tests responsive viewports & flows</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                    <span>3. Deterministic capture (100%, 70%, or 0% held)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-sky-500/5 border border-sky-500/20 text-xs text-slate-300 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Zero funds leave your PayPal account during creation. Funds are only authorized once both parties lock the test rubric.
              </p>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
