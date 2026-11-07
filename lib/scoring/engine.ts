/**
 * PayGuard Escrow - Deterministic Scoring Engine
 * 
 * Architectural rule: Pure deterministic function. Zero LLM calls.
 * Formula: score = Σ weight(item) where result == 'pass'
 * Critical-fail override: any failed critical item overrides score to 0.
 */

import { ChecklistItem, TestResult, ScoreTier, RunResult } from '../../types/index.js';

export interface ScoringOutput {
  score: number;
  tier: ScoreTier;
  payoutPercent: number;
  finalCapture: boolean;
  totalWeight: number;
  passedWeight: number;
  inconclusiveCount: number;
  criticalFailed: boolean;
  criticalFailedItems: string[];
}

export function computeScore(
  items: ChecklistItem[],
  results: TestResult[]
): ScoringOutput {
  if (!items || items.length === 0) {
    throw new Error('Cannot score run: checklist items are empty');
  }

  const resultMap = new Map<string, TestResult>();
  for (const res of results) {
    resultMap.set(res.itemId, res);
  }

  let totalWeight = 0;
  let passedWeight = 0;
  let inconclusiveCount = 0;
  let criticalFailed = false;
  const criticalFailedItems: string[] = [];

  for (const item of items) {
    totalWeight += item.weight;
    const testRes = resultMap.get(item.id);

    if (!testRes) {
      // Unexecuted or missing result counts as fail
      if (item.critical) {
        criticalFailed = true;
        criticalFailedItems.push(item.id);
      }
      continue;
    }

    if (testRes.result === 'pass') {
      passedWeight += item.weight;
    } else if (testRes.result === 'inconclusive') {
      inconclusiveCount++;
    } else if (testRes.result === 'fail') {
      if (item.critical) {
        criticalFailed = true;
        criticalFailedItems.push(item.id);
      }
    }
  }

  // FR-23: If > 30% of items are inconclusive, flag as NEEDS_REVIEW
  const inconclusiveRatio = inconclusiveCount / items.length;
  if (inconclusiveRatio > 0.3) {
    return {
      score: passedWeight,
      tier: 'NEEDS_REVIEW',
      payoutPercent: 0,
      finalCapture: false,
      totalWeight,
      passedWeight,
      inconclusiveCount,
      criticalFailed,
      criticalFailedItems,
    };
  }

  // BR-5: Hard-fail critical item override (score = 0)
  let rawScore = passedWeight;
  if (criticalFailed) {
    rawScore = 0;
  }

  // Normalize to 0-100 bounds
  const normalizedScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  // BR-1 to BR-3: Payout Tier Mapping
  let tier: ScoreTier = 'HELD';
  let payoutPercent = 0;
  let finalCapture = false;

  if (normalizedScore >= 90) {
    // BR-1 (>= 90): Capture 100%, final_capture=true
    tier = 'PAID';
    payoutPercent = 100;
    finalCapture = true;
  } else if (normalizedScore >= 60) {
    // BR-2 (60-89): Capture 70%, final_capture=false (holds remaining 30%)
    tier = 'PARTIALLY_PAID';
    payoutPercent = 70;
    finalCapture = false;
  } else {
    // BR-3 (< 60): No capture, state HELD
    tier = 'HELD';
    payoutPercent = 0;
    finalCapture = false;
  }

  return {
    score: normalizedScore,
    tier,
    payoutPercent,
    finalCapture,
    totalWeight,
    passedWeight,
    inconclusiveCount,
    criticalFailed,
    criticalFailedItems,
  };
}

