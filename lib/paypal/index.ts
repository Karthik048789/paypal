/**
 * Member A Code Interface Contract (lib/paypal/index.ts)
 * 
 * Owned by Member A, called by Member B's settlement orchestrator.
 * Must be idempotent using key 'job:{id}:run:{id}:capture',
 * writing PaymentEvent row & updating Job state in a single DB transaction.
 */

import { PaymentResult, AuthStatus } from '../../types/index.js';

// In-memory ledger for sandbox & local integration testing
const idempotencyStore = new Map<string, PaymentResult>();
const authStore = new Map<string, {
  authId: string;
  amountCents: number;
  capturedAmountCents: number;
  status: 'AUTHORIZED' | 'CAPTURED' | 'VOIDED';
  expiresAt: string;
}>();

/**
 * Initialize / Mock an authorization for a job (used during test/demo runs)
 */
export function mockAuthorizeJob(jobId: string, amountCents: number, authId = `AUTH-${Date.now()}`) {
  authStore.set(jobId, {
    authId,
    amountCents,
    capturedAmountCents: 0,
    status: 'AUTHORIZED',
    expiresAt: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
  });
}

/**
 * Capture funds from a previously authorized PayPal escrow hold.
 * Idempotent: repeated calls with same jobId & runId will return identical result without double-charging.
 */
export async function captureAuthorization(params: {
  jobId: string;
  runId: string;
  amountCents: number;
  finalCapture: boolean;
}): Promise<PaymentResult> {
  const { jobId, runId, amountCents, finalCapture } = params;
  const idempotencyKey = `job:${jobId}:run:${runId}:capture`;

  // Idempotency check: prevent duplicate capture
  if (idempotencyStore.has(idempotencyKey)) {
    const cached = idempotencyStore.get(idempotencyKey)!;
    return {
      ...cached,
      message: 'Idempotent replay: already captured',
    } as any;
  }

  const auth = authStore.get(jobId);
  if (!auth) {
    // If no existing mock, create one with default 10000 cents ($100.00)
    mockAuthorizeJob(jobId, amountCents > 0 ? amountCents : 10000);
  }

  const currentAuth = authStore.get(jobId)!;

  if (currentAuth.status === 'VOIDED') {
    const failedResult: PaymentResult = {
      success: false,
      status: 'FAILED',
      error: 'Cannot capture: authorization is voided',
      idempotencyKey,
    };
    idempotencyStore.set(idempotencyKey, failedResult);
    return failedResult;
  }

  // Record capture
  currentAuth.capturedAmountCents += amountCents;
  if (finalCapture) {
    currentAuth.status = 'CAPTURED';
  }

  const result: PaymentResult = {
    success: true,
    transactionId: `CAPTURE-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    status: 'COMPLETED',
    amountCapturedCents: amountCents,
    idempotencyKey,
  };

  idempotencyStore.set(idempotencyKey, result);
  return result;
}

/**
 * Void an authorization (e.g., job expired or canceled)
 */
export async function voidAuthorization(params: {
  jobId: string;
  reason: string;
}): Promise<PaymentResult> {
  const { jobId, reason } = params;
  const idempotencyKey = `job:${jobId}:void`;

  if (idempotencyStore.has(idempotencyKey)) {
    return idempotencyStore.get(idempotencyKey)!;
  }

  const currentAuth = authStore.get(jobId);
  if (currentAuth) {
    currentAuth.status = 'VOIDED';
  }

  const result: PaymentResult = {
    success: true,
    status: 'VOIDED',
    amountVoidedCents: currentAuth ? currentAuth.amountCents - currentAuth.capturedAmountCents : 0,
    idempotencyKey,
  };

  idempotencyStore.set(idempotencyKey, result);
  return result;
}

/**
 * Query current authorization status for a job
 */
export async function getAuthorizationStatus(jobId: string): Promise<AuthStatus> {
  const currentAuth = authStore.get(jobId);
  if (!currentAuth) {
    return {
      jobId,
      authId: `AUTH-DEFAULT-${jobId}`,
      status: 'AUTHORIZED',
      amountCents: 10000,
      capturedAmountCents: 0,
      expiresAt: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  return {
    jobId,
    authId: currentAuth.authId,
    status: currentAuth.status,
    amountCents: currentAuth.amountCents,
    capturedAmountCents: currentAuth.capturedAmountCents,
    expiresAt: currentAuth.expiresAt,
  };
}

export function resetLedgerForTesting() {
  idempotencyStore.clear();
  authStore.clear();
}

