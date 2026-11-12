'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Plus,
  ArrowRight,
  Shield,
  DollarSign,
  Clock,
  Filter,
  RefreshCw,
  Lock,
  ShieldCheck,
} from 'lucide-react';

interface JobSummary {
  id: string;
  title: string;
  amount: number;
  status: string;
  deadline: string;
  createdAt: string;
  freelancerEmail: string;
  client: { name: string; email: string };
  freelancer?: { name: string; email: string } | null;
  checklists: Array<{ id: string; version: number; isLocked: boolean }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/jobs');
      if (res.status === 401) {
        router.push('/auth/login');
        return;
      }
      const data = await res.json();
      if (data.jobs) {
        setJobs(data.jobs);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const filteredJobs = jobs.filter((job) => {
    if (filter === 'ALL') return true;
    if (filter === 'ACTIVE') return ['AWAITING_APPROVAL', 'AWAITING_FUNDING', 'FUNDED', 'VERIFYING'].includes(job.status);
    if (filter === 'SETTLED') return ['PAID', 'PARTIALLY_PAID', 'HELD'].includes(job.status);
    if (filter === 'DISPUTED') return job.status === 'DISPUTED';
    return true;
  });

  const totalHeldCents = jobs
    .filter((j) => ['FUNDED', 'VERIFYING', 'PARTIALLY_PAID', 'HELD'].includes(j.status))
    .reduce((acc, j) => acc + j.amount, 0);

  const totalPaidCents = jobs
    .filter((j) => j.status === 'PAID')
    .reduce((acc, j) => acc + j.amount, 0);

  const stageDepositCount = jobs.filter((j) => ['AWAITING_APPROVAL', 'AWAITING_FUNDING', 'FUNDED'].includes(j.status)).length;
  const stageAuditCount = jobs.filter((j) => j.status === 'VERIFYING').length;
  const stageReleasedCount = jobs.filter((j) => ['PAID', 'PARTIALLY_PAID'].includes(j.status)).length;

  return (
    <AppShell>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-sky-400 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
              <span>Live Escrow Operations</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Escrow Console</h1>
            <p className="text-xs text-slate-400 mt-1">
              Deterministic verification and PayPal escrow authorization holds.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchJobs}
              className="p-2.5 bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.16] text-slate-300 rounded-full hover:bg-white/[0.08] transition-colors duration-150"
              title="Refresh contracts list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/jobs/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-200 text-slate-950 text-xs font-bold rounded-full transition-transform duration-100 active:scale-[0.98] shadow-lg shadow-white/10"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Escrow Job</span>
            </Link>
          </div>
        </div>

        {/* Pipeline Telemetry Strip (Ties directly to Landing Page 3-Node Signature) */}
        <div className="mb-8 p-4 rounded-2xl bg-[#080b14]/80 backdrop-blur-xl border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">1. Deposit & Lock</span>
              <span className="text-sm font-bold font-mono text-white">{stageDepositCount} Contracts</span>
            </div>
          </div>

          <div className="hidden sm:block flex-1 h-[1px] bg-gradient-to-r from-sky-500/30 via-white/20 to-pink-500/30 mx-4"></div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <RefreshCw className={`w-4 h-4 ${stageAuditCount > 0 ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">2. Machine Audit</span>
              <span className="text-sm font-bold font-mono text-white">{stageAuditCount} Active Runs</span>
            </div>
          </div>

          <div className="hidden sm:block flex-1 h-[1px] bg-gradient-to-r from-white/20 via-pink-500/30 to-emerald-500/30 mx-4"></div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">3. Released Payouts</span>
              <span className="text-sm font-bold font-mono text-emerald-400">{stageReleasedCount} Settled</span>
            </div>
          </div>
        </div>

        {/* Financial Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bento-card bg-[#080b14]/80 backdrop-blur-xl p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-medium text-slate-400">Active escrow locked</span>
              <p className="text-2xl font-extrabold text-white mt-0.5 font-mono tabular-nums">
                ${(totalHeldCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="bento-card bg-[#080b14]/80 backdrop-blur-xl p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-medium text-slate-400">Verified and paid out</span>
              <p className="text-2xl font-extrabold text-white mt-0.5 font-mono tabular-nums">
                ${(totalPaidCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="bento-card bg-[#080b14]/80 backdrop-blur-xl p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-white/[0.06] flex items-center justify-center text-slate-300 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-medium text-slate-400">Total tracked contracts</span>
              <p className="text-2xl font-extrabold text-white mt-0.5 font-mono tabular-nums">{jobs.length}</p>
            </div>
          </div>
        </div>

        {/* Filter Pill Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <Filter className="w-4 h-4 text-slate-500 mr-1 flex-shrink-0" />
          {[
            { key: 'ALL', label: 'All Contracts' },
            { key: 'ACTIVE', label: 'Active Escrows' },
            { key: 'SETTLED', label: 'Settled' },
            { key: 'DISPUTED', label: 'Disputed' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors duration-150 whitespace-nowrap ${
                filter === tab.key
                  ? 'bg-white text-slate-950 font-bold shadow-sm'
                  : 'bg-white/[0.04] text-slate-400 border border-white/[0.08] hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Jobs Grid */}
        {loading ? (
          <div className="bento-card bg-[#080b14]/80 backdrop-blur-xl p-12 text-center">
            <RefreshCw className="w-6 h-6 animate-spin text-sky-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-400">Loading escrow contracts...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="bento-card bg-[#080b14]/80 backdrop-blur-xl p-12 text-center">
            <Lock className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No escrow jobs found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
              Create your first PayPal-backed escrow job with natural-language requirements to see autonomous verification in action.
            </p>
            <Link
              href="/jobs/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-200 text-slate-950 text-xs font-bold rounded-full transition-colors duration-150"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Job</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="group bento-card bg-[#080b14]/80 backdrop-blur-xl p-5 flex flex-col justify-between transition-all duration-150 hover:border-white/[0.2]"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <StatusBadge status={job.status} />
                    <span className="text-sm font-bold text-white font-mono tabular-nums">
                      ${(job.amount / 100).toFixed(2)}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-base mb-1.5 group-hover:text-sky-400 transition-colors duration-150 line-clamp-1">
                    {job.title}
                  </h3>

                  <div className="space-y-1 text-xs text-slate-400 mb-4 font-mono">
                    <div className="flex justify-between">
                      <span className="font-sans">Client:</span>
                      <span className="font-semibold text-slate-300 font-sans truncate max-w-[160px]">
                        {job.client.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans">Freelancer:</span>
                      <span className="font-semibold text-slate-300 truncate max-w-[160px]">
                        {job.freelancerEmail}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans">Deadline:</span>
                      <span className="font-medium text-slate-300">
                        {new Date(job.deadline).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-medium text-sky-400">
                  <span>View Contract & Timeline</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-150" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
