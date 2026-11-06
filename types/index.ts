// PayGuard Escrow - Shared Team Contracts & Type Definitions

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

export interface ChecklistItemDTO {
  id?: string;
  description: string;
  testType: TestType;
  criteria: string;
  weight: number; // 1-60, total checklist sum must be 100
  critical?: boolean;
  orderIndex?: number;
}

export interface TestResultDTO {
  itemId: string;
  result: TestResultStatus;
  evidenceScreenshotUrl?: string;
  logExcerpt?: string;
  explanation?: string;
  attempts?: number;
}

export type ScoreTier = 'PAID' | 'PARTIALLY_PAID' | 'HELD' | 'NEEDS_REVIEW';

export interface RunResult {
  runId: string;
  score: number;
  tier: ScoreTier;
  payoutPercent: number;
  results: TestResultDTO[];
  reportId?: string;
}

// Activity feed event protocol emitted during live verification runs
export interface RunEvent {
  runId: string;
  type: 'step' | 'test_result' | 'viewport' | 'score' | 'payout';
  message: string;
  data?: Record<string, unknown> | null;
  ts: number;
}

// Member A Payment Interfaces
export interface PaymentResult {
  success: boolean;
  captureId?: string;
  orderId?: string;
  authId?: string;
  amountCents: number;
  status: string;
  idempotencyKey: string;
  error?: string;
  rawResponse?: Record<string, unknown>;
}

export interface AuthStatus {
  jobId: string;
  authId?: string;
  orderId?: string;
  amountCents: number;
  capturedCents: number;
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
