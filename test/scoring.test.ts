import { describe, it, expect, beforeEach } from 'vitest';
import { computeScore } from '../lib/scoring/engine.js';
import { orchestrateSettlement } from '../lib/scoring/settlement.js';
import { resetLedgerForTesting, mockAuthorizeJob } from '../lib/paypal/index.js';
import { ChecklistItem, TestResult } from '../types/index.js';

describe('Deterministic Scoring Engine (lib/scoring/engine.ts)', () => {
  const baseItems: ChecklistItem[] = [
    { id: 'item-1', description: 'Functional login', testType: 'functional', criteria: 'Logs in', weight: 40, critical: false },
    { id: 'item-2', description: 'Mobile responsive', testType: 'responsive', criteria: 'No overflow', weight: 30, critical: false },
    { id: 'item-3', description: 'Navigation links', testType: 'navigation', criteria: 'Works', weight: 20, critical: false },
    { id: 'item-4', description: 'Console health', testType: 'console_errors', criteria: '0 errors', weight: 10, critical: false },
  ];

  it('computes 100% score when all items pass (BR-1)', () => {
    const results: TestResult[] = baseItems.map((item) => ({
      itemId: item.id,
      result: 'pass',
      explanation: 'Check passed',
      attempts: 1,
    }));

    const output = computeScore(baseItems, results);
    expect(output.score).toBe(100);
    expect(output.tier).toBe('PAID');
    expect(output.payoutPercent).toBe(100);
    expect(output.finalCapture).toBe(true);
  });

  it('boundary test 90 points -> PAID (100% payout, final_capture=true)', () => {
    const customItems: ChecklistItem[] = [
      { id: 'i1', description: 'Task 1', testType: 'functional', criteria: '', weight: 90, critical: false },
      { id: 'i2', description: 'Task 2', testType: 'responsive', criteria: '', weight: 10, critical: false },
    ];
    const results: TestResult[] = [
      { itemId: 'i1', result: 'pass', explanation: '', attempts: 1 },
      { itemId: 'i2', result: 'fail', explanation: '', attempts: 1 },
    ];

    const output = computeScore(customItems, results);
    expect(output.score).toBe(90);
    expect(output.tier).toBe('PAID');
    expect(output.payoutPercent).toBe(100);
    expect(output.finalCapture).toBe(true);
  });

  it('boundary test 89 points -> PARTIALLY_PAID (70% payout, final_capture=false)', () => {
    const customItems: ChecklistItem[] = [
      { id: 'i1', description: 'Task 1', testType: 'functional', criteria: '', weight: 89, critical: false },
      { id: 'i2', description: 'Task 2', testType: 'responsive', criteria: '', weight: 11, critical: false },
    ];
    const results: TestResult[] = [
      { itemId: 'i1', result: 'pass', explanation: '', attempts: 1 },
      { itemId: 'i2', result: 'fail', explanation: '', attempts: 1 },
    ];

    const output = computeScore(customItems, results);
    expect(output.score).toBe(89);
    expect(output.tier).toBe('PARTIALLY_PAID');
    expect(output.payoutPercent).toBe(70);
    expect(output.finalCapture).toBe(false);
  });

  it('boundary test 60 points -> PARTIALLY_PAID (70% payout, final_capture=false)', () => {
    const customItems: ChecklistItem[] = [
      { id: 'i1', description: 'Task 1', testType: 'functional', criteria: '', weight: 60, critical: false },
      { id: 'i2', description: 'Task 2', testType: 'responsive', criteria: '', weight: 40, critical: false },
    ];
    const results: TestResult[] = [
      { itemId: 'i1', result: 'pass', explanation: '', attempts: 1 },
      { itemId: 'i2', result: 'fail', explanation: '', attempts: 1 },
    ];

    const output = computeScore(customItems, results);
    expect(output.score).toBe(60);
    expect(output.tier).toBe('PARTIALLY_PAID');
    expect(output.payoutPercent).toBe(70);
    expect(output.finalCapture).toBe(false);
  });

  it('boundary test 59 points -> HELD (0% payout, money held in escrow)', () => {
    const customItems: ChecklistItem[] = [
      { id: 'i1', description: 'Task 1', testType: 'functional', criteria: '', weight: 59, critical: false },
      { id: 'i2', description: 'Task 2', testType: 'responsive', criteria: '', weight: 41, critical: false },
    ];
    const results: TestResult[] = [
      { itemId: 'i1', result: 'pass', explanation: '', attempts: 1 },
      { itemId: 'i2', result: 'fail', explanation: '', attempts: 1 },
    ];

    const output = computeScore(customItems, results);
    expect(output.score).toBe(59);
    expect(output.tier).toBe('HELD');
    expect(output.payoutPercent).toBe(0);
    expect(output.finalCapture).toBe(false);
  });

  it('hard critical-fail override: failing a critical item forces score = 0 (BR-5)', () => {
    const itemsWithCritical: ChecklistItem[] = [
      { id: 'crit-1', description: 'Site loads at all', testType: 'functional', criteria: 'HTTP 200', weight: 50, critical: true },
      { id: 'other-1', description: 'Other features', testType: 'functional', criteria: 'OK', weight: 50, critical: false },
    ];
    const results: TestResult[] = [
      { itemId: 'crit-1', result: 'fail', explanation: 'Site timed out', attempts: 2 },
      { itemId: 'other-1', result: 'pass', explanation: 'OK', attempts: 1 },
    ];

    const output = computeScore(itemsWithCritical, results);
    expect(output.criticalFailed).toBe(true);
    expect(output.score).toBe(0);
    expect(output.tier).toBe('HELD');
    expect(output.payoutPercent).toBe(0);
  });

  it('flags NEEDS_REVIEW when > 30% of items are inconclusive (FR-23)', () => {
    const items: ChecklistItem[] = [
      { id: 'i1', description: 'Test 1', testType: 'functional', criteria: '', weight: 25, critical: false },
      { id: 'i2', description: 'Test 2', testType: 'functional', criteria: '', weight: 25, critical: false },
      { id: 'i3', description: 'Test 3', testType: 'functional', criteria: '', weight: 25, critical: false },
      { id: 'i4', description: 'Test 4', testType: 'functional', criteria: '', weight: 25, critical: false },
    ];
    // 2 out of 4 is 50% > 30%
    const results: TestResult[] = [
      { itemId: 'i1', result: 'pass', explanation: '', attempts: 1 },
      { itemId: 'i2', result: 'inconclusive', explanation: 'Captcha encountered', attempts: 2 },
      { itemId: 'i3', result: 'inconclusive', explanation: 'Cloudflare block', attempts: 2 },
      { itemId: 'i4', result: 'pass', explanation: '', attempts: 1 },
    ];

    const output = computeScore(items, results);
    expect(output.tier).toBe('NEEDS_REVIEW');
    expect(output.payoutPercent).toBe(0);
  });
});

describe('Settlement Orchestrator (lib/scoring/settlement.ts)', () => {
  beforeEach(() => {
    resetLedgerForTesting();
  });

  it('correctly calculates 70% partial payout and 2% platform fee', async () => {
    const jobId = 'job-70-test';
    const runId = 'run-1';
    mockAuthorizeJob(jobId, 10000); // $100.00 in escrow

    const settlement = await orchestrateSettlement({
      jobId,
      runId,
      tier: 'PARTIALLY_PAID',
      payoutPercent: 70,
      finalCapture: false,
      platformFeePercent: 2,
    });

    expect(settlement.status).toBe('EXECUTED');
    expect(settlement.payoutPercent).toBe(70);
    expect(settlement.authorizedAmountCents).toBe(10000);
    expect(settlement.grossPayoutCents).toBe(7000); // $70.00
    expect(settlement.platformFeeCents).toBe(140);  // $1.40 (2% of $70)
    expect(settlement.netPayoutCents).toBe(6860);    // $68.60
    expect(settlement.heldRemainderCents).toBe(3000);// $30.00 held
  });

  it('guarantees idempotency and prevents double-capture on repeat execution (FR-26)', async () => {
    const jobId = 'job-idempotency-test';
    const runId = 'run-repeat';
    mockAuthorizeJob(jobId, 5000); // $50.00

    const firstRun = await orchestrateSettlement({
      jobId,
      runId,
      tier: 'PAID',
      payoutPercent: 100,
      finalCapture: true,
    });
    expect(firstRun.status).toBe('EXECUTED');
    const firstTxId = firstRun.paymentResult?.transactionId;

    // Second execution with identical keys
    const secondRun = await orchestrateSettlement({
      jobId,
      runId,
      tier: 'PAID',
      payoutPercent: 100,
      finalCapture: true,
    });

    expect(secondRun.paymentResult?.transactionId).toBe(firstTxId);
    expect((secondRun.paymentResult as any)?.message).toContain('Idempotent replay');
  });

  it('leaves funds held in escrow when tier is HELD (<60%)', async () => {
    const jobId = 'job-held-test';
    const runId = 'run-held';
    mockAuthorizeJob(jobId, 8000);

    const settlement = await orchestrateSettlement({
      jobId,
      runId,
      tier: 'HELD',
      payoutPercent: 0,
      finalCapture: false,
    });

    expect(settlement.status).toBe('HELD');
    expect(settlement.grossPayoutCents).toBe(0);
    expect(settlement.heldRemainderCents).toBe(8000);
  });
});

