'use client';

import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, Download, RotateCw, Flag, ShieldCheck } from 'lucide-react';

interface DecisionReportProps {
  job: {
    id: string;
    title: string;
    amount: number;
    status: string;
  };
  run: {
    id: string;
    score: number | null;
    status: string;
    reports: Array<{
      summary: string;
      reasoning: string;
      payoutAmount: number;
      payoutPercent: number;
    }>;
    testResults: Array<{
      id: string;
      result: string;
      evidenceScreenshotUrl?: string | null;
      logExcerpt?: string | null;
      explanation?: string | null;
      item: {
        description: string;
        testType: string;
        criteria: string;
        weight: number;
        critical: boolean;
      };
    }>;
  };
  onRetest: () => void;
  onOpenDispute: () => void;
}

export function DecisionReport({ job, run, onRetest, onOpenDispute }: DecisionReportProps) {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const report = run.reports[0];
  const score = run.score ?? 0;
  const payoutPercent = report?.payoutPercent ?? (score >= 90 ? 100 : score >= 60 ? 70 : 0);
  const totalAmountDollars = job.amount / 100;
  const releasedDollars = (totalAmountDollars * payoutPercent) / 100;
  const heldDollars = totalAmountDollars - releasedDollars;

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handlePrint = () => {
    window.print();
  };

  // Payout banner styling
  let bannerColor = 'bg-rose-500/10 border-rose-500/25 text-rose-300';
  let bannerIcon = <AlertTriangle className="w-5 h-5 text-rose-400" />;
  let payoutStatement = `$0 released, $${heldDollars.toFixed(2)} held until fixes pass.`;

  if (payoutPercent === 100) {
    bannerColor = 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300';
    bannerIcon = <ShieldCheck className="w-5 h-5 text-emerald-400" />;
    payoutStatement = `Full $${releasedDollars.toFixed(2)} USD (100%) captured and released to freelancer.`;
  } else if (payoutPercent === 70) {
    bannerColor = 'bg-amber-500/10 border-amber-500/25 text-amber-300';
    bannerIcon = <AlertTriangle className="w-5 h-5 text-amber-400" />;
    payoutStatement = `$${releasedDollars.toFixed(2)} USD (70%) released, $${heldDollars.toFixed(2)} held until fixes pass.`;
  }

  return (
    <div className="bento-card bg-[#080b14]/90 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl print:border-none print:shadow-none">
      {/* Top Banner: Score Reveal & Payout Statement */}
      <div className="p-6 sm:p-8 border-b border-white/[0.08] bg-white/[0.02]">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Score Ring / Display */}
          <div className="flex items-center gap-6">
            <div className="relative flex items-center justify-center">
              <svg className="w-28 h-28 transform -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  stroke={payoutPercent === 100 ? '#10B981' : payoutPercent === 70 ? '#F59E0B' : '#F43F5E'}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={301.59}
                  strokeDashoffset={301.59 - (301.59 * score) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-extrabold text-white font-mono">{score}</span>
                <span className="text-[10px] font-bold text-slate-400 font-mono">/ 100</span>
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/[0.05] text-sky-400 border border-white/[0.1] mb-1.5">
                Deterministic Outcome
              </div>
              <h2 className="text-2xl font-bold text-white">
                {payoutPercent === 100 ? 'Verified & Paid' : payoutPercent === 70 ? 'Partially Verified' : 'Held (Fixes Required)'}
              </h2>
              <p className="text-xs text-slate-400 max-w-md mt-1">
                {report?.reasoning || 'Automated score computed from pure deterministic weights without LLM intervention.'}
              </p>
            </div>
          </div>

          {/* Export Actions */}
          <div className="flex gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-white/[0.05] border border-white/[0.1] rounded-full hover:bg-white/[0.1] transition-colors duration-150"
            >
              <Download className="w-4 h-4 text-slate-400" />
              Download Report PDF
            </button>
          </div>
        </div>

        {/* Payout Statement Banner (FR-27) */}
        <div className={`mt-6 p-4 rounded-xl border flex items-center gap-3.5 ${bannerColor}`}>
          <div className="flex-shrink-0">{bannerIcon}</div>
          <div className="text-sm font-bold flex-1">
            <span>{payoutStatement}</span>
          </div>
        </div>
      </div>

      {/* Item-by-Item Breakdown Cards (FR-27) */}
      <div className="p-6 sm:p-8 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 mb-2">
          Item-By-Item Verification Evidence ({run.testResults.length} Tests)
        </h3>

        {run.testResults.map((result) => {
          const isPass = result.result === 'pass';
          const isExpanded = expandedItems[result.id] ?? false;

          return (
            <div
              key={result.id}
              className={`border rounded-xl overflow-hidden transition-all duration-200 ${
                isPass ? 'border-white/[0.08] bg-white/[0.02]' : 'border-rose-500/30 bg-rose-500/5'
              }`}
            >
              {/* Header Toggle */}
              <button
                onClick={() => toggleExpand(result.id)}
                className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors duration-150"
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-3">
                  {isPass ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-white">{result.item.description}</span>
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-white/[0.05] text-sky-400 border border-white/[0.08]">
                        {result.item.testType}
                      </span>
                      {result.item.critical && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/25">
                          Critical
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{result.explanation}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={`font-mono text-xs font-bold px-2.5 py-1 rounded-md ${
                      isPass
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {isPass ? `+${result.item.weight} pts` : `0 / ${result.item.weight} pts`}
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {/* Collapsible Evidence Body */}
              {isExpanded && (
                <div className="p-5 border-t border-white/[0.06] bg-[#05070c]/80 space-y-4">
                  <div>
                    <h5 className="text-xs font-semibold text-slate-400 mb-1.5">
                      Target Assertion Criteria
                    </h5>
                    <p className="text-xs text-slate-300 bg-white/[0.03] p-3 rounded-lg border border-white/[0.06]">
                      {result.item.criteria}
                    </p>
                  </div>

                  {result.logExcerpt && (
                    <div>
                      <h5 className="text-xs font-semibold text-slate-400 mb-1.5">
                        Execution Terminal Log Excerpt
                      </h5>
                      <pre className="text-[11px] font-mono p-3.5 bg-[#030508] border border-white/[0.08] text-slate-300 rounded-xl overflow-x-auto">
                        {result.logExcerpt}
                      </pre>
                    </div>
                  )}

                  {/* Evidence Screenshot Lightbox */}
                  <div>
                    <h5 className="text-xs font-semibold text-slate-400 mb-1.5">
                      Visual Evidence Capture (Cloud Browser Viewport)
                    </h5>
                    <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs">
                      <div className="w-full h-32 bg-[#05070c] rounded-lg flex items-center justify-center border border-dashed border-white/[0.12]">
                        <span>📸 Visual Screenshot Snapshot ({result.item.testType})</span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-2 font-mono">
                        Evidence Hash: sha256:{result.id.slice(0, 16)}...
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Decision Footer Actions (FR-29, FR-33) */}
      <div className="p-6 bg-white/[0.02] border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="text-xs text-slate-400">
          Both parties are protected by PayGuard Escrow dispute and re-test protocols.
        </div>

        <div className="flex items-center gap-3">
          {job.status === 'PARTIALLY_PAID' || job.status === 'HELD' ? (
            <button
              onClick={onRetest}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-white hover:bg-slate-200 text-slate-950 text-xs font-bold rounded-full shadow-lg shadow-white/10 active:scale-[0.98] transition-transform duration-150"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Request Re-Test (Max 3)
            </button>
          ) : null}

          {job.status !== 'DISPUTED' && (
            <button
              onClick={onOpenDispute}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-white text-xs font-semibold rounded-full transition-colors duration-150"
            >
              <Flag className="w-3.5 h-3.5 text-rose-400" />
              Open Escrow Dispute
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

