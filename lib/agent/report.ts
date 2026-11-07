/**
 * PayGuard Escrow - Decision Report Generator
 * 
 * Generates transparent, plain-English rationales for both parties.
 * Architectural rule: Explanations are strictly bound to deterministic results;
 * the report generator CANNOT alter scores or financial decisions.
 */

import { ChecklistItem, TestResult, RunResult, ScoreTier } from '../../types/index.js';

export interface DecisionReport {
  reportId: string;
  runId: string;
  jobId: string;
  score: number;
  tier: ScoreTier;
  payoutPercent: number;
  summary: string;
  reasoning: string;
  passedItemsCount: number;
  failedItemsCount: number;
  inconclusiveItemsCount: number;
  itemizedBreakdown: Array<{
    itemId: string;
    description: string;
    testType: string;
    result: string;
    weight: number;
    critical: boolean;
    explanation: string;
    evidenceScreenshotUrl?: string;
  }>;
  nextSteps: string;
  timestamp: string;
}

export function generateDecisionReport(params: {
  runId: string;
  jobId: string;
  score: number;
  tier: ScoreTier;
  payoutPercent: number;
  items: ChecklistItem[];
  results: TestResult[];
  grossPayoutCents?: number;
  heldRemainderCents?: number;
}): DecisionReport {
  const {
    runId,
    jobId,
    score,
    tier,
    payoutPercent,
    items,
    results,
    grossPayoutCents = 0,
    heldRemainderCents = 0,
  } = params;

  const resultMap = new Map<string, TestResult>();
  results.forEach((r) => resultMap.set(r.itemId, r));

  let passed = 0;
  let failed = 0;
  let inconclusive = 0;

  const itemizedBreakdown = items.map((item) => {
    const res = resultMap.get(item.id);
    const outcome = res?.result || 'fail';

    if (outcome === 'pass') passed++;
    else if (outcome === 'fail') failed++;
    else inconclusive++;

    return {
      itemId: item.id,
      description: item.description,
      testType: item.testType,
      result: outcome,
      weight: item.weight,
      critical: item.critical,
      explanation: res?.explanation || 'No verification data recorded for this item.',
      evidenceScreenshotUrl: res?.evidenceScreenshotUrl,
    };
  });

  const releasedFormatted = `$${(grossPayoutCents / 100).toFixed(2)}`;
  const heldFormatted = `$${(heldRemainderCents / 100).toFixed(2)}`;

  let summary = '';
  let reasoning = '';
  let nextSteps = '';

  switch (tier) {
    case 'PAID':
      summary = `Full Release: Verified score of ${score}/100. 100% of escrow funds (${releasedFormatted}) released.`;
      reasoning = `All critical and functional checklist items satisfied acceptance criteria without blocking errors. The automated QA browser agent confirmed responsive rendering, functional authentication, and console integrity.`;
      nextSteps = `Job completed. Payment has been captured and disbursed via PayPal sandbox. No further action needed.`;
      break;

    case 'PARTIALLY_PAID':
      summary = `Partial Release: Verified score of ${score}/100. 70% released (${releasedFormatted}), 30% held (${heldFormatted}).`;
      reasoning = `Core website functionality is sound, but minor non-critical specification flaws were detected (e.g. mobile viewport overflow or responsive constraints). Per Escrow Rule BR-2, 70% is disbursed immediately to compensate completed work.`;
      nextSteps = `The freelancer can review the failed items below, submit code fixes, and request a re-test within 30 days to release the remaining 30% held balance.`;
      break;

    case 'HELD':
      summary = `Funds Held in Escrow: Verified score of ${score}/100. Zero funds released.`;
      reasoning = `The deliverable did not meet minimum acceptance criteria (< 60 points) or a critical hard-fail prerequisite (such as page load or core authentication) failed during verification.`;
      nextSteps = `100% of funds remain safely held in PayPal escrow. The freelancer can review failure logs, resolve issues, and trigger a re-test.`;
      break;

    case 'NEEDS_REVIEW':
      summary = `Flagged for Human Review: ${inconclusive} inconclusive checks detected.`;
      reasoning = `More than 30% of checklist items could not be verified automatically (e.g. due to bot challenges, 2FA, or unreachable endpoints). In accordance with safety protocol FR-23, automated capture is frozen.`;
      nextSteps = `Escrow administrator and project parties have been notified to review deliverable manually.`;
      break;
  }

  return {
    reportId: `REP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    runId,
    jobId,
    score,
    tier,
    payoutPercent,
    summary,
    reasoning,
    passedItemsCount: passed,
    failedItemsCount: failed,
    inconclusiveItemsCount: inconclusive,
    itemizedBreakdown,
    nextSteps,
    timestamp: new Date().toISOString(),
  };
}

