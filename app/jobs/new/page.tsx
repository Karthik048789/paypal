'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Shield, Sparkles, DollarSign, Calendar, Mail, FileText, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

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
  const platformFee = numAmount * 0.02; // 2% fee (BR-6)
  const netPayout = Math.max(0, numAmount - platformFee);

  const fillExampleRequirements = (type: 'saas' | 'ecommerce' | 'portfolio') => {
    if (type === 'saas') {
      setTitle('SaaS Authentication & User Dashboard Integration');
      setRequirements(
        'Build a responsive web app with email/password authentication. The landing page must load fast with 0 console errors. The login form should validate user inputs and redirect to the dashboard. The dashboard must be responsive on mobile viewports (390x844) with no horizontal overflow, and top navigation links must be functional.'
      );
    } else if (type === 'ecommerce') {
      setTitle('Product Catalog & Stripe/PayPal Checkout Flow');
      setRequirements(
        'Implement an e-commerce product catalog with category filters and product cards showing title, price, and image. Users must be able to add products to the shopping cart, update quantities, and proceed to the checkout form without JavaScript runtime exceptions.'
      );
    } else {
      setTitle('Marketing Landing Page with Contact Form');
      setRequirements(
        'Develop a clean modern landing page with high-contrast typography, hero section, interactive pricing table, and a contact form with field validation. Must achieve clean console logs and 100% responsive layout on mobile screens.'
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
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <a
            href="/dashboard"
            className="text-xs font-semibold text-sky-600 hover:underline mb-2 inline-block"
          >
            ← Back to Dashboard
          </a>
          <h1 className="text-2xl font-extrabold text-slate-900">Create New Escrow Job</h1>
          <p className="text-xs text-slate-500 mt-1">
            Specify requirements in natural language. Our AI will automatically synthesize a verifiable test checklist.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          {/* Job Title */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Project Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Next.js SaaS Authentication & Dashboard"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Quick Examples Toolbar */}
          <div className="bg-sky-50/60 border border-sky-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-sky-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              Populate with example specification:
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fillExampleRequirements('saas')}
                className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-sky-300 text-sky-800 rounded-md hover:bg-sky-100 transition"
              >
                SaaS Auth & Dashboard
              </button>
              <button
                type="button"
                onClick={() => fillExampleRequirements('ecommerce')}
                className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-sky-300 text-sky-800 rounded-md hover:bg-sky-100 transition"
              >
                E-Commerce Catalog
              </button>
            </div>
          </div>

          {/* Natural Language Requirements (FR-4) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase text-slate-700">
                Natural-Language Deliverable Requirements *
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {requirements.length} / 2000 chars (min 20)
              </span>
            </div>
            <textarea
              required
              rows={5}
              placeholder="Describe in plain English what the website or feature should do, which viewports to test, expected authentication behaviors, and content requirements..."
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Example: &quot;Build login with redirect, clean console logs without exceptions, and 390px mobile responsiveness without horizontal scrolling.&quot;
            </p>
          </div>

          {/* Financials & Live Fee Calculation (BR-6) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Escrow Job Amount (USD) *
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="number"
                  required
                  min={5}
                  max={5000}
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Minimum $5.00, maximum $5,000.00 USD.</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Target Deadline *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Funds voided if no submission 7 days past deadline.</p>
            </div>
          </div>

          {/* Freelancer Email Invite */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Freelancer Contact Email (Payee) *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={freelancerEmail}
                onChange={(e) => setFreelancerEmail(e.target.value)}
                placeholder="freelancer@example.com"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              An invitation email with a direct link to the escrow contract will be dispatched automatically.
            </p>
          </div>

          {/* Live Fee Preview Box (Section 4.8) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Total Contract Escrow Hold:</span>
              <span className="font-semibold text-slate-900">${numAmount.toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Platform Service Fee (2%):</span>
              <span className="text-slate-500">-${platformFee.toFixed(2)} USD</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm">
              <span className="text-slate-900">Net Freelancer Deliverable Payout:</span>
              <span className="text-blue-600 font-extrabold">${netPayout.toFixed(2)} USD</span>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing AI Test Rubric...</span>
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
      </main>
    </div>
  );
}
