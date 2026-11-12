'use client';

import React, { use, useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { StatusBadge } from '@/components/StatusBadge';
import { MilestoneStepper } from '@/components/MilestoneStepper';
import { ChecklistEditor } from '@/components/ChecklistEditor';
import { FundEscrowCard } from '@/components/FundEscrowCard';
import { SubmitWorkModal } from '@/components/SubmitWorkModal';
import { LiveVerificationView } from '@/components/LiveVerificationView';
import { DecisionReport } from '@/components/DecisionReport';
import { DisputeModal } from '@/components/DisputeModal';
import { SessionUser } from '@/lib/auth';
import {
  Shield,
  FileCheck,
  CreditCard,
  Send,
  Eye,
  FileText,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Lock,
} from 'lucide-react';

function JobDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [job, setJob] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'checklist' | 'fund' | 'verification' | 'report'>('overview');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${id}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.job) {
        setJob(data.job);

        // Auto-switch tabs based on lifecycle state — only from 'overview' default
        setActiveTab((currentTab) => {
          if (currentTab !== 'overview') return currentTab; // Don't disrupt user's current tab
          if (data.job.status === 'AWAITING_APPROVAL') return 'checklist';
          if (data.job.status === 'AWAITING_FUNDING') return 'fund';
          if (data.job.status === 'VERIFYING') return 'verification';
          return currentTab;
        });

        const latestRun = data.job.submissions?.[0]?.runs?.[0];
        if (latestRun) setActiveRunId(latestRun.id);
      }
    } catch (err) {
      console.error('Failed to fetch job:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(() => {});

    fetchJob();
  }, [fetchJob]);

  // Live SSE listener for status updates (FR-31: timeline updates within 2s with no refresh)
  useEffect(() => {
    const sse = new EventSource(`/api/jobs/${id}/events`);

    sse.addEventListener('run_event', (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === 'payout' || event.type === 'score') {
          // Re-fetch job data when score or payout occurs
          fetchJob();
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    });

    return () => {
      sse.close();
    };
  }, [id, fetchJob]);

  if (loading && !job) {
    return (
      <AppShell>
        <div className="min-h-[70vh] flex items-center justify-center text-slate-400 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin mr-2 text-sky-400" />
          Loading escrow details...
        </div>
      </AppShell>
    );
  }

  if (!job) {
    return (
      <AppShell>
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
          <h2 className="text-xl font-bold text-white">Job Not Found</h2>
          <a href="/dashboard" className="text-xs text-sky-400 mt-2 font-semibold hover:underline">
            Return to Escrow Console
          </a>
        </div>
      </AppShell>
    );
  }

  const latestChecklist = job.checklists?.[0];
  const latestSubmission = job.submissions?.[0];
  const latestRun = latestSubmission?.runs?.[0];

  const isClient = currentUser?.id === job.clientId || currentUser?.role === 'ADMIN';
  const isFreelancer =
    currentUser?.id === job.freelancerId ||
    currentUser?.email.toLowerCase() === job.freelancerEmail.toLowerCase() ||
    currentUser?.role === 'ADMIN';

  const canFund = isClient && job.status === 'AWAITING_FUNDING';
  const canSubmit = isFreelancer && ['FUNDED', 'PARTIALLY_PAID', 'HELD'].includes(job.status);

  return (
    <AppShell>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Header Card */}
        <div className="bento-card bg-[#080b14]/85 backdrop-blur-xl rounded-2xl p-6 sm:p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/[0.06]">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <StatusBadge status={job.status} />
                <span className="text-xs text-slate-500 font-mono">Job ID: {job.id.slice(0, 8)}...</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {job.title}
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl line-clamp-2">
                {job.requirements}
              </p>
            </div>

            <div className="flex flex-col sm:items-end flex-shrink-0">
              <span className="text-xs font-medium text-slate-400">
                Total escrow value
              </span>
              <span className="text-3xl font-extrabold text-white font-mono tabular-nums">
                ${(job.amount / 100).toFixed(2)} USD
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 font-mono">
                Target Deadline: {new Date(job.deadline).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Parties & Metadata Grid */}
          <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
              <span className="text-slate-500 font-sans block mb-0.5">Client (Depositor)</span>
              <span className="font-bold text-slate-200 font-sans">{job.client.name}</span>
              <span className="text-slate-400 block truncate">{job.client.email}</span>
            </div>

            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
              <span className="text-slate-500 font-sans block mb-0.5">Freelancer (Payee)</span>
              <span className="font-bold text-slate-200 font-sans">
                {job.freelancer?.name || 'Invited Freelancer'}
              </span>
              <span className="text-slate-400 block truncate">{job.freelancerEmail}</span>
            </div>

            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.06] flex flex-col justify-center">
              <span className="text-slate-500 font-sans block mb-1">Current Action Required:</span>
              <span className="font-bold text-sky-400 font-sans">
                {job.status === 'AWAITING_APPROVAL' && 'Both parties must review and approve checklist'}
                {job.status === 'AWAITING_FUNDING' && 'Client must authorize PayPal escrow hold'}
                {job.status === 'FUNDED' && 'Freelancer must build deliverable and submit live URL'}
                {job.status === 'VERIFYING' && 'Cloud browser agent is executing test rubric...'}
                {job.status === 'PAID' && 'Completed: 100% payout released to freelancer'}
                {job.status === 'PARTIALLY_PAID' && '70% released. Freelancer can submit fixes for remaining 30%'}
                {job.status === 'HELD' && '0% released. Freelancer can fix issues and request a re-test'}
                {job.status === 'DISPUTED' && 'Under active review by PayGuard Admin arbitration'}
              </span>
            </div>
          </div>
        </div>

        {/* Milestone Stepper Timeline */}
        <div className="mb-8">
          <MilestoneStepper status={job.status} hasSubmission={Boolean(latestSubmission)} />
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/[0.08] mb-8 overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors duration-150 ${
              activeTab === 'overview'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Overview & Actions</span>
          </button>

          <button
            onClick={() => setActiveTab('checklist')}
            className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors duration-150 ${
              activeTab === 'checklist'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>AI Checklist ({latestChecklist?.items?.length || 0})</span>
          </button>

          {canFund && (
            <button
              onClick={() => setActiveTab('fund')}
              className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors duration-150 ${
                activeTab === 'fund'
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Fund Escrow</span>
            </button>
          )}

          {(job.status === 'VERIFYING' || activeRunId) && (
            <button
              onClick={() => setActiveTab('verification')}
              className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors duration-150 ${
                activeTab === 'verification'
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Live Verification</span>
            </button>
          )}

          {latestRun?.reports?.length > 0 && (
            <button
              onClick={() => setActiveTab('report')}
              className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors duration-150 ${
                activeTab === 'report'
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Decision Report</span>
            </button>
          )}
        </div>

        {/* Tab 1: Overview & Primary Actions */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Contextual Action Box */}
            <div className="bg-[#0e1015] border border-white/[0.08] rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">
                  {job.status === 'AWAITING_APPROVAL' && 'Step 1: Review & Lock Checklist'}
                  {job.status === 'AWAITING_FUNDING' && 'Step 2: Deposit Escrow Hold in PayPal'}
                  {job.status === 'FUNDED' && 'Step 3: Deliverable Ready? Submit Live URL'}
                  {job.status === 'VERIFYING' && 'AI Cloud Browser is Verifying Work'}
                  {job.status === 'PAID' && 'Escrow Fully Settled (100% Paid)'}
                  {job.status === 'PARTIALLY_PAID' && 'Partial Settlement: Re-test Available'}
                  {job.status === 'HELD' && 'Verification Incomplete: Re-test Available'}
                  {job.status === 'DISPUTED' && 'Dispute Arbitration in Progress'}
                </h3>
                <p className="text-xs text-slate-400 max-w-xl">
                  {job.status === 'AWAITING_APPROVAL' && 'Both parties must verify that the 100-point rubric correctly reflects project deliverables before money is locked.'}
                  {job.status === 'AWAITING_FUNDING' && 'Authorize the escrow hold through PayPal sandbox. Funds stay protected until verification completes.'}
                  {job.status === 'FUNDED' && 'The escrow hold is locked. Freelancer can now submit their HTTPS staging or production URL to initiate automated cloud testing.'}
                  {job.status === 'VERIFYING' && 'Watch live viewport assertions, responsive audits, and console error checks in real-time.'}
                  {['PAID', 'PARTIALLY_PAID', 'HELD'].includes(job.status) && 'The deterministic scoring engine has evaluated the deliverable and executed settlement.'}
                </p>
              </div>

              <div className="flex gap-3 flex-shrink-0">
                {job.status === 'AWAITING_APPROVAL' && (
                  <button
                    onClick={() => setActiveTab('checklist')}
                    className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-lg transition-transform duration-100 active:scale-[0.98]"
                  >
                    Go to Checklist Review →
                  </button>
                )}

                {canFund && (
                  <button
                    onClick={() => setActiveTab('fund')}
                    className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-lg transition-transform duration-100 active:scale-[0.98]"
                  >
                    Authorize PayPal Hold →
                  </button>
                )}

                {canSubmit && (
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-lg transition-transform duration-100 active:scale-[0.98] inline-flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Live Deliverable URL</span>
                  </button>
                )}

                {job.status === 'VERIFYING' && (
                  <button
                    onClick={() => setActiveTab('verification')}
                    className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-lg transition-transform duration-100 active:scale-[0.98]"
                  >
                    Watch Live Cloud Agent →
                  </button>
                )}

                {latestRun?.reports?.length > 0 && (
                  <button
                    onClick={() => setActiveTab('report')}
                    className="px-5 py-2.5 bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-bold rounded-lg transition-transform duration-100 active:scale-[0.98]"
                  >
                    View Decision Report →
                  </button>
                )}
              </div>
            </div>

            {/* Embedded Checklist Preview */}
            {latestChecklist && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white">
                    Approved acceptance test rubric
                  </h3>
                  <button
                    onClick={() => setActiveTab('checklist')}
                    className="text-xs font-semibold text-sky-400 hover:underline"
                  >
                    Full Checklist Editor →
                  </button>
                </div>
                <div className="bg-[#0e1015] rounded-xl border border-white/[0.08] divide-y divide-white/[0.06]">
                  {latestChecklist.items.map((item: any, idx: number) => (
                    <div key={item.id} className="p-4 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-500 font-bold">#{idx + 1}</span>
                        <div>
                          <span className="font-semibold text-slate-200">{item.description}</span>
                          <span className="text-slate-500 ml-2 font-mono uppercase text-[10px]">
                            [{item.testType}]
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-white/[0.04] text-slate-300 font-bold font-mono">
                        {item.weight} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Checklist Review & Edit */}
        {activeTab === 'checklist' && latestChecklist && (
          <ChecklistEditor
            jobId={job.id}
            checklist={latestChecklist}
            jobStatus={job.status}
            isClient={isClient}
            isFreelancer={isFreelancer}
            onRefresh={fetchJob}
          />
        )}
        {activeTab === 'checklist' && !latestChecklist && (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-sm">
            <FileCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700 mb-1">No checklist generated yet.</p>
            <p className="text-xs text-slate-400">The AI checklist is generated when a job is created. Refresh to try again.</p>
            <button onClick={fetchJob} className="mt-4 px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-lg hover:bg-sky-700 transition">
              Refresh
            </button>
          </div>
        )}

        {/* Tab 3: Fund Escrow Card */}
        {activeTab === 'fund' && (
          <FundEscrowCard
            jobId={job.id}
            amountCents={job.amount}
            freelancerEmail={job.freelancerEmail}
            onFunded={() => {
              fetchJob();
              setActiveTab('overview');
            }}
          />
        )}

        {/* Tab 4: Live Verification Screen */}
        {activeTab === 'verification' && latestChecklist && (
          <LiveVerificationView
            jobId={job.id}
            runId={activeRunId || 'run-preview'}
            checklistItems={latestChecklist.items}
            onComplete={() => {
              fetchJob();
              setActiveTab('report');
            }}
          />
        )}

        {/* Tab 5: Decision Report */}
        {activeTab === 'report' && latestRun && (
          <DecisionReport
            job={job}
            run={latestRun}
            onRetest={() => setShowSubmitModal(true)}
            onOpenDispute={() => setShowDisputeModal(true)}
          />
        )}

        {/* Submit Work Modal (FR-14) */}
        {showSubmitModal && latestChecklist && (
          <SubmitWorkModal
            jobId={job.id}
            checklistItems={latestChecklist.items}
            onSubmitted={(runId) => {
              setShowSubmitModal(false);
              setActiveRunId(runId);
              setActiveTab('verification');
              fetchJob();
            }}
            onClose={() => setShowSubmitModal(false)}
          />
        )}

        {/* Dispute Modal (FR-33) */}
        {showDisputeModal && (
          <DisputeModal
            jobId={job.id}
            onDisputeOpened={() => {
              setShowDisputeModal(false);
              fetchJob();
            }}
            onClose={() => setShowDisputeModal(false)}
          />
        )}
      </main>
    </AppShell>
  );
}

export default function JobDetailPage(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#05070c] flex items-center justify-center text-slate-400 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin mr-2 text-sky-400" />
          Loading escrow contract...
        </div>
      }
    >
      <JobDetailContent {...props} />
    </Suspense>
  );
}
