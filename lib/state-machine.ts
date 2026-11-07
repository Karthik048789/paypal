import { JobStatus, ScoreTier } from '@/types';
import { prisma } from './db';

/**
 * PayGuard Escrow Strict State Transition Graph
 * DRAFT -> AWAITING_APPROVAL -> AWAITING_FUNDING -> FUNDED -> VERIFYING
 * VERIFYING -> PAID | PARTIALLY_PAID | HELD | NEEDS_REVIEW
 * PARTIALLY_PAID / HELD -> VERIFYING (re-test)
 * Any (post-decision) -> DISPUTED -> resolved
 * FUNDED / HELD / PARTIALLY_PAID / DRAFT / AWAITING_APPROVAL -> EXPIRED / CANCELLED
 */
export const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  DRAFT: ['AWAITING_APPROVAL', 'CANCELLED'],
  AWAITING_APPROVAL: ['AWAITING_FUNDING', 'DRAFT', 'CANCELLED'],
  AWAITING_FUNDING: ['FUNDED', 'AWAITING_APPROVAL', 'CANCELLED'],
  FUNDED: ['VERIFYING', 'EXPIRED', 'CANCELLED', 'DISPUTED'],
  VERIFYING: ['PAID', 'PARTIALLY_PAID', 'HELD', 'NEEDS_REVIEW'],
  PAID: ['DISPUTED'],
  PARTIALLY_PAID: ['VERIFYING', 'DISPUTED', 'EXPIRED', 'PAID'], // re-test transitions to VERIFYING; on re-test >=90 can become PAID
  HELD: ['VERIFYING', 'DISPUTED', 'EXPIRED', 'CANCELLED'], // re-test transitions to VERIFYING
  NEEDS_REVIEW: ['PAID', 'PARTIALLY_PAID', 'HELD', 'DISPUTED', 'CANCELLED'],
  DISPUTED: ['PAID', 'PARTIALLY_PAID', 'HELD', 'CANCELLED'], // resolved states
  EXPIRED: [],
  CANCELLED: [],
};

export class InvalidStateTransitionError extends Error {
  constructor(public currentStatus: JobStatus, public nextStatus: JobStatus) {
    super(`Invalid job state transition from ${currentStatus} to ${nextStatus}.`);
    this.name = 'InvalidStateTransitionError';
  }
}

export function canTransition(currentStatus: JobStatus, nextStatus: JobStatus): boolean {
  if (currentStatus === nextStatus) return true;
  const allowed = VALID_TRANSITIONS[currentStatus];
  return Boolean(allowed && allowed.includes(nextStatus));
}

export function assertCanTransition(currentStatus: JobStatus, nextStatus: JobStatus): void {
  if (!canTransition(currentStatus, nextStatus)) {
    throw new InvalidStateTransitionError(currentStatus, nextStatus);
  }
}

/**
 * Pure Deterministic Scoring Engine
 * Spec Section 2.4 (BR-1 to BR-5) & Section 3.4 item 5
 * - Hard-fail critical item fails -> score 0, tier HELD, payout 0%
 * - Inconclusive ratio > 30% -> tier NEEDS_REVIEW, payout 0%
 * - Score >= 90: Capture 100% (final_capture = true), State PAID
 * - Score 60-89: Capture 70% (final_capture = false), State PARTIALLY_PAID
 * - Score < 60: Capture 0%, State HELD
 */
export interface ScoreInputItem {
  id: string;
  weight: number;
  critical?: boolean;
  result: 'pass' | 'fail' | 'inconclusive';
}

export interface ScoreCalculationResult {
  score: number;
  tier: ScoreTier;
  payoutPercent: number;
  hasCriticalFail: boolean;
  inconclusiveCount: number;
  inconclusiveRatio: number;
  reasoning: string;
}

export function calculateDeterministicScore(items: ScoreInputItem[]): ScoreCalculationResult {
  if (!items || items.length === 0) {
    return {
      score: 0,
      tier: 'HELD',
      payoutPercent: 0,
      hasCriticalFail: false,
      inconclusiveCount: 0,
      inconclusiveRatio: 0,
      reasoning: 'No checklist items provided.',
    };
  }

  let totalScore = 0;
  let hasCriticalFail = false;
  let inconclusiveCount = 0;

  for (const item of items) {
    if (item.result === 'pass') {
      totalScore += item.weight;
    } else if (item.result === 'fail') {
      if (item.critical) {
        hasCriticalFail = true;
      }
    } else if (item.result === 'inconclusive') {
      inconclusiveCount++;
    }
  }

  const inconclusiveRatio = inconclusiveCount / items.length;

  // Hard-fail critical check override (BR-5)
  if (hasCriticalFail) {
    return {
      score: 0,
      tier: 'HELD',
      payoutPercent: 0,
      hasCriticalFail: true,
      inconclusiveCount,
      inconclusiveRatio,
      reasoning: 'Critical requirement failed (BR-5). Final score forced to 0. Funds remain held.',
    };
  }

  // FR-23: If > 30% are inconclusive, flagged NEEDS_REVIEW and no automatic payment
  if (inconclusiveRatio > 0.3) {
    return {
      score: totalScore,
      tier: 'NEEDS_REVIEW',
      payoutPercent: 0,
      hasCriticalFail: false,
      inconclusiveCount,
      inconclusiveRatio,
      reasoning: `Over 30% of tests were inconclusive (${(inconclusiveRatio * 100).toFixed(0)}%). Flagged for manual review.`,
    };
  }

  // Standard Deterministic Tiers (BR-1, BR-2, BR-3)
  if (totalScore >= 90) {
    return {
      score: totalScore,
      tier: 'PAID',
      payoutPercent: 100,
      hasCriticalFail: false,
      inconclusiveCount,
      inconclusiveRatio,
      reasoning: `Excellent score of ${totalScore}/100 meets the 90+ threshold. 100% full payment released.`,
    };
  } else if (totalScore >= 60) {
    return {
      score: totalScore,
      tier: 'PARTIALLY_PAID',
      payoutPercent: 70,
      hasCriticalFail: false,
      inconclusiveCount,
      inconclusiveRatio,
      reasoning: `Score of ${totalScore}/100 qualifies for partial payment. 70% released, 30% held until fixes are verified.`,
    };
  } else {
    return {
      score: totalScore,
      tier: 'HELD',
      payoutPercent: 0,
      hasCriticalFail: false,
      inconclusiveCount,
      inconclusiveRatio,
      reasoning: `Score of ${totalScore}/100 is below the 60 threshold. No funds released. Freelancer can fix issues and submit a re-test.`,
    };
  }
}

/**
 * Validates Checklist Items (FR-6, FR-7)
 * - 3 to 12 items
 * - Weights sum strictly to 100
 * - Each weight between 1 and 60
 * - Console/network health carries a minimum weight of 10
 */
export function validateChecklistRules(
  items: Array<{ description: string; testType: string; weight: number; critical?: boolean }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!items || items.length < 3 || items.length > 12) {
    errors.push(`Checklist must contain between 3 and 12 items (current count: ${items ? items.length : 0}).`);
  }

  let totalWeight = 0;
  let hasConsoleOrNetworkHealth = false;

  for (let i = 0; i < (items || []).length; i++) {
    const item = items[i];
    if (typeof item.weight !== 'number' || item.weight < 1 || item.weight > 60) {
      errors.push(`Item ${i + 1} weight must be an integer between 1 and 60 (got ${item.weight}).`);
    }
    totalWeight += item.weight;

    if (
      item.testType === 'console_errors' ||
      item.description.toLowerCase().includes('console') ||
      item.description.toLowerCase().includes('network')
    ) {
      if (item.weight >= 10) {
        hasConsoleOrNetworkHealth = true;
      }
    }
  }

  if (totalWeight !== 100) {
    errors.push(`Total checklist weight must sum to exactly 100 (current sum: ${totalWeight}).`);
  }

  if (!hasConsoleOrNetworkHealth) {
    errors.push('Console and network health check must be present with a minimum weight of 10.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Transitions job state in database with audit logging
 */
export async function transitionJobState(
  jobId: string,
  targetStatus: JobStatus,
  actor: string = 'system',
  metadata?: Record<string, unknown>
) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  const currentStatus = job.status as JobStatus;
  assertCanTransition(currentStatus, targetStatus);

  const updatedJob = await prisma.$transaction(async (tx) => {
    const updated = await tx.job.update({
      where: { id: jobId },
      data: { status: targetStatus },
    });

    await tx.auditLog.create({
      data: {
        actor,
        action: 'STATE_TRANSITION',
        entity: 'Job',
        entityId: jobId,
        before: JSON.stringify({ status: currentStatus }),
        after: JSON.stringify({ status: targetStatus, metadata }),
      },
    });

    return updated;
  });

  return updatedJob;
}

