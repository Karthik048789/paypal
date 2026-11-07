/**
 * PayGuard Escrow - Shared TypeScript Types & Contracts
 * Shared between Member A (Platform & UI) and Member B (Agent & Scoring Engine)
 */

export type JobStatus =
  | 'DRAFT'
  | 'AWAITING_APPROVAL'
  | 'AWAITING_FUNDING'
  | 'FUNDED'
  | 'VERIFYING'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'HELD'
  | 'NEEDS_REVIEW'
  | 'DISPUTED'
  | 'EXPIRED'
  | 'CANCELLED';

export type TestType =
  | 'functional'
  | 'responsive'
  | 'console_errors'
  | 'content_present'
  | 'navigation';

export interface ChecklistItem {
  id: string;
  checklistId?: string;
  description: string;
  testType: TestType;
  criteria: string;
  weight: number; // 1-60, must sum to 100
  critical: boolean; // Hard-fail: if true and fails, score = 0
}

export type TestOutcome = 'pass' | 'fail' | 'inconclusive';

export interface TestResult {
  id?: string;
  runId?: string;
  itemId: string;
  result: TestOutcome;
  evidenceScreenshotUrl?: string;
  logExcerpt?: string;
  explanation: string;
  attempts: number; // up to 3 runs via majority vote
}

export type ScoreTier = 'PAID' | 'PARTIALLY_PAID' | 'HELD' | 'NEEDS_REVIEW';

export interface RunResult {
  runId: string;
  jobId: string;
  score: number; // 0 - 100
  tier: ScoreTier;
  payoutPercent: number; // 100, 70, or 0
  results: TestResult[];
  reportId?: string;
  summary?: string;
  reasoning?: string;
}

export type RunEventType =
  | 'step'
  | 'test_result'
  | 'viewport'
  | 'score'
  | 'payout'
  | 'error';

export interface RunEvent {
  runId: string;
  jobId: string;
  type: RunEventType;
  message: string;
  data?: Record<string, any>;
  ts: number;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  status: 'COMPLETED' | 'PENDING' | 'VOIDED' | 'FAILED';
  amountCapturedCents?: number;
  amountVoidedCents?: number;
  error?: string;
  idempotencyKey: string;
}

export interface AuthStatus {
  jobId: string;
  authId: string;
  status: 'CREATED' | 'AUTHORIZED' | 'CAPTURED' | 'VOIDED' | 'EXPIRED';
  amountCents: number;
  capturedAmountCents: number;
  expiresAt: string;
}

