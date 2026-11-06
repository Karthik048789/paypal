'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';
import { Plus, ArrowRight, Shield, DollarSign, CheckCircle2, Clock, Filter, AlertCircle, RefreshCw } from 'lucide-react';

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
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/jobs');
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Escrow Job Dashboard</h1>
            <p className="text-xs text-slate-500 mt-1">
              Autonomous verification and PayPal escrow authorization holds.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchJobs}
              className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 shadow-xs transition"
              title="Refresh jobs list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <a
              href="/jobs/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Escrow Job</span>
            </a>
          </div>
        </div>

        {/* Financial Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Active Escrow Locked
              </span>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                ${(totalHeldCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Verified & Paid Out
              </span>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                ${(totalPaidCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Tracked Jobs
              </span>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">{jobs.length}</p>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Filter:
          </span>
          {['ALL', 'ACTIVE', 'SETTLED', 'DISPUTED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === tab
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Job Cards List */}
        {loading && jobs.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
            Loading escrow contracts...
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto my-12">
            <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No jobs yet</h3>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              Create an escrow contract to lock PayPal funds and verify deliverables automatically.
            </p>
            <a
              href="/jobs/new"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition"
            >
              Create First Job
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredJobs.map((job) => (
              <a
                key={job.id}
                href={`/jobs/${job.id}`}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-sky-300 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <StatusBadge status={job.status} />
                    <span className="font-extrabold text-base text-slate-900 font-mono">
                      ${(job.amount / 100).toFixed(2)}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-sky-600 transition mb-1 line-clamp-1">
                    {job.title}
                  </h3>

                  <div className="text-xs text-slate-500 space-y-1 mb-4">
                    <div className="flex justify-between">
                      <span>Client:</span>
                      <strong className="text-slate-700">{job.client.name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Freelancer:</span>
                      <strong className="text-slate-700">{job.freelancerEmail}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Deadline:</span>
                      <span className="text-slate-600 font-mono">
                        {new Date(job.deadline).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-sky-600 font-semibold">
                  <span>View Contract & Timeline</span>
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition" />
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
