// PayGuard Escrow - Shared Team Contracts & Type Definitions
// Unified for Member A (Platform & UI) and Member B (Agent & Scoring Engine)

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

export type UserRole = 'CLIENT' | 'FREELANCER' | 'ADMIN';

export type TestType =
  | 'functional'
  | 'responsive'
  | 'console_errors'
  | 'content_present'
  | 'navigation';

export type TestResultStatus = 'pass' | 'fail' | 'inconclusive';
export type TestOutcome = TestResultStatus;

export interface ChecklistItemDTO {
  id?: string;
  checklistId?: string;
  description: string;
  testType: TestType;
  criteria: string;
  weight: number; // 1-60, total checklist sum must be 100
  critical?: boolean;
  orderIndex?: number;
}

export type ChecklistItem = ChecklistItemDTO & { id: string; critical: boolean };

export interface TestResultDTO {
  id?: string;
  runId?: string;
  itemId: string;
  result: TestResultStatus;
  evidenceScreenshotUrl?: string;
  logExcerpt?: string;
  explanation?: string;
  attempts?: number;
}

export type TestResult = TestResultDTO & { explanation: string; attempts: number };

export type ScoreTier = 'PAID' | 'PARTIALLY_PAID' | 'HELD' | 'NEEDS_REVIEW';

export interface RunResult {
  runId: string;
  jobId?: string;
  score: number;
  tier: ScoreTier;
  payoutPercent: number;
  results: TestResultDTO[];
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

// Activity feed event protocol emitted during live verification runs
export interface RunEvent {
  runId: string;
  jobId?: string;
  type: RunEventType;
  message: string;
  data?: Record<string, any> | null;
  ts: number;
}

// Member A Payment Interfaces
export interface PaymentResult {
  success: boolean;
  captureId?: string;
  transactionId?: string;
  orderId?: string;
  authId?: string;
  amountCents?: number;
  amountCapturedCents?: number;
  amountVoidedCents?: number;
  status: string;
  idempotencyKey: string;
  error?: string;
  rawResponse?: Record<string, unknown>;
  message?: string;
}

export interface AuthStatus {
  jobId: string;
  authId?: string;
  orderId?: string;
  amountCents: number;
  capturedCents: number;
  capturedAmountCents?: number;
  remainingCents: number;
  status: string;
  expiresAt?: Date | string | null;
}

// Timeline Stepper State Representation
export type MilestoneState = 'COMPLETED' | 'ACTIVE' | 'PENDING' | 'FAILED';

export interface MilestoneItem {
  id: string;
  label: string;
  status: MilestoneState;
  color: 'gray' | 'blue' | 'green' | 'yellow' | 'red';
  hex: string;
  icon: string;
  timestamp?: string;
}
