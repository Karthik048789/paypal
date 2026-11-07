/**
 * PayGuard Escrow - Settlement Orchestrator
 * 
 * Orchestrates payments between scoring decisions and Member A's PayPal contract.
 * Enforces:
 * - Deterministic mathematical fee calculation
 * - Idempotency keys (job:{id}:run:{id}:capture)
 * - 3x retry with backoff on transient errors
 * - Absolute protection against double-capture
 */

import { captureAuthorization, voidAuthorization, getAuthorizationStatus } from '../paypal/index.js';
import { PaymentResult, ScoreTier } from '../../types/index.js';

export interface SettlementOptions {
  jobId: string;
  runId: string;
  tier: ScoreTier;
  payoutPercent: number; // 100, 70, or 0
  finalCapture: boolean;
  platformFeePercent?: number; // default 2% per BR-6
}

export interface SettlementSummary {
  jobId: string;
  runId: string;
  payoutPercent: number;
  authorizedAmountCents: number;
  grossPayoutCents: number;
  platformFeeCents: number;
  netPayoutCents: number;
  heldRemainderCents: number;
  paymentResult?: PaymentResult;
  status: 'EXECUTED' | 'HELD' | 'NEEDS_REVIEW' | 'FAILED';
  message: string;
}

export async function orchestrateSettlement(
  options: SettlementOptions
): Promise<SettlementSummary> {
  const {
    jobId,
    runId,
    tier,
    payoutPercent,
    finalCapture,
    platformFeePercent = 2,
  } = options;

  // Retrieve authorized escrow hold
  const authStatus = await getAuthorizationStatus(jobId);
  const authorizedAmountCents = authStatus.amountCents;

  if (tier === 'NEEDS_REVIEW') {
    return {
      jobId,
      runId,
      payoutPercent: 0,
      authorizedAmountCents,
      grossPayoutCents: 0,
      platformFeeCents: 0,
      netPayoutCents: 0,
      heldRemainderCents: authorizedAmountCents,
      status: 'NEEDS_REVIEW',
      message: 'Run flagged with > 30% inconclusive checks. Human review required. Zero automated money movement.',
    };
  }

  if (tier === 'HELD' || payoutPercent === 0) {
    return {
      jobId,
      runId,
      payoutPercent: 0,
      authorizedAmountCents,
      grossPayoutCents: 0,
      platformFeeCents: 0,
      netPayoutCents: 0,
      heldRemainderCents: authorizedAmountCents,
      status: 'HELD',
      message: 'Score below 60%. Funds remain held in escrow. Freelancer can fix issues and submit re-test.',
    };
  }

  // Calculate gross, platform fee, and net payout
  const grossPayoutCents = Math.round((authorizedAmountCents * payoutPercent) / 100);
  const platformFeeCents = Math.round((grossPayoutCents * platformFeePercent) / 100);
  const netPayoutCents = grossPayoutCents - platformFeeCents;
  const heldRemainderCents = authorizedAmountCents - grossPayoutCents;

  // Execute PayPal capture with retries
  let paymentResult: PaymentResult | undefined;
  let attempts = 0;
  const maxAttempts = 3;
  let delayMs = 300;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      paymentResult = await captureAuthorization({
        jobId,
        runId,
        amountCents: grossPayoutCents,
        finalCapture,
      });

      if (paymentResult.success) {
        break;
      }
    } catch (err: any) {
      if (attempts >= maxAttempts) {
        return {
          jobId,
          runId,
          payoutPercent,
          authorizedAmountCents,
          grossPayoutCents,
          platformFeeCents,
          netPayoutCents,
          heldRemainderCents,
          status: 'FAILED',
          message: `PayPal capture failed after ${maxAttempts} attempts: ${err.message}`,
        };
      }
      // Exponential backoff
      await new Promise((r) => setTimeout(r, delayMs));
      delayMs *= 2;
    }
  }

  return {
    jobId,
    runId,
    payoutPercent,
    authorizedAmountCents,
    grossPayoutCents,
    platformFeeCents,
    netPayoutCents,
    heldRemainderCents,
    paymentResult,
    status: paymentResult?.success ? 'EXECUTED' : 'FAILED',
    message: paymentResult?.success
      ? `Successfully executed ${payoutPercent}% capture ($${(grossPayoutCents / 100).toFixed(2)} gross, $${(netPayoutCents / 100).toFixed(2)} net after ${platformFeePercent}% fee).`
      : `Failed to execute capture: ${paymentResult?.error || 'Unknown error'}`,
  };
}

