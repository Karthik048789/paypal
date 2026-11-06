import Link from 'next/link';
import { Shield, CheckCircle, Lock, ArrowRight, Zap, Eye, Terminal } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white selection:bg-sky-500 selection:text-white">
      {/* Hero Header */}
      <nav className="border-b border-slate-800 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-white">
              Pay<span className="text-sky-400">Guard</span>
            </span>
            <span className="ml-2 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 bg-sky-950 border border-sky-800 text-sky-300 rounded-full">
              Autonomous Escrow
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="/auth/login"
            className="text-sm font-semibold text-slate-300 hover:text-white transition"
          >
            Sign In
          </a>
          <a
            href="/dashboard"
            className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 text-sm font-bold rounded-lg shadow-md transition flex items-center gap-1.5"
          >
            <span>Launch Console</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </nav>

      {/* Hero Body */}
      <main className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-sky-400 text-xs font-semibold mb-8">
          <Zap className="w-3.5 h-3.5" />
          <span>PayPal Orders v2 (Authorize/Capture) + Kernel Cloud Browser Agent</span>
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6">
          Autonomous Escrow for <br />
          <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Verified Software Deliverables
          </span>
        </h1>

        <p className="max-w-3xl mx-auto text-lg sm:text-xl text-slate-300 mb-10 leading-relaxed">
          PayGuard holds PayPal funds in an authorization lock, tests the freelancer’s live web deliverable
          in an isolated cloud browser, and deterministically executes full or partial payout based on verified rubric criteria.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-20">
          <a
            href="/jobs/new"
            className="px-8 py-3.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-sky-500/20 text-base transition flex items-center gap-2"
          >
            <span>Create Escrow Job</span>
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="/dashboard"
            className="px-8 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 text-base transition"
          >
            Explore Live Dashboard
          </a>
        </div>

        {/* 3-Step Explainer (Section 4.4 Screen 1) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left mt-8">
          <div className="p-8 rounded-2xl bg-slate-800/50 border border-slate-800 hover:border-slate-700 transition">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-5 font-bold text-lg font-mono">
              01
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Natural-Language Checklist & Lock</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Describe project requirements in plain English. PayGuard drafts an AI test rubric with weights totaling 100 points. Both parties approve to lock it.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-slate-800/50 border border-slate-800 hover:border-slate-700 transition">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-5 font-bold text-lg font-mono">
              02
            </div>
            <h3 className="text-xl font-bold text-white mb-2">PayPal Escrow Hold (intent=AUTHORIZE)</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Client approves a PayPal authorization hold. The money stays safely guaranteed in PayPal escrow and is never moved until deliverables pass.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-slate-800/50 border border-slate-800 hover:border-slate-700 transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 font-bold text-lg font-mono">
              03
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Autonomous Cloud Browser Verification</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Kernel cloud browser executes responsive audits, console error checks, and interactive flows. Payouts trigger automatically per deterministic scoring.
            </p>
          </div>
        </div>

        {/* Payout Tiers Spec Summary */}
        <div className="mt-16 p-8 rounded-2xl bg-slate-850 border border-slate-800 text-left">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
            Deterministic Settlement Matrix (Business Rules BR-1, BR-2, BR-3)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60">
              <span className="text-xs font-bold text-emerald-400">Score ≥ 90</span>
              <p className="text-lg font-bold text-white mt-1">100% Full Capture</p>
              <p className="text-xs text-slate-400 mt-1">Status turns PAID (Green). All funds released.</p>
            </div>
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60">
              <span className="text-xs font-bold text-amber-400">Score 60–89</span>
              <p className="text-lg font-bold text-white mt-1">70% Partial Payout</p>
              <p className="text-xs text-slate-400 mt-1">Status PARTIALLY_PAID (Yellow). 30% held for re-test.</p>
            </div>
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60">
              <span className="text-xs font-bold text-rose-400">Score &lt; 60 or Critical Fail</span>
              <p className="text-lg font-bold text-white mt-1">0% Captured</p>
              <p className="text-xs text-slate-400 mt-1">Status HELD (Red). Freelancer fixes and re-tests.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
