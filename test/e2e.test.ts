import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createDemoServer } from '../demo-sites/server.js';
import { VerificationWorker } from '../worker/index.js';
import { resetLedgerForTesting, mockAuthorizeJob } from '../lib/paypal/index.js';
import { ChecklistItem } from '../types/index.js';

describe('PayGuard Escrow End-to-End Verification Pipeline', () => {
  let server: http.Server;
  const PORT = 4102;
  const worker = new VerificationWorker();

  const standardChecklist: ChecklistItem[] = [
    {
      id: 'chk-load',
      description: 'Site loads over HTTP 200',
      testType: 'functional',
      criteria: 'Page loads',
      weight: 20,
      critical: true,
    },
    {
      id: 'chk-console',
      description: 'Console and background network health audit',
      testType: 'console_errors',
      criteria: '0 errors',
      weight: 15,
      critical: false,
    },
    {
      id: 'chk-mobile',
      description: 'Mobile responsive layout scalability (390x844)',
      testType: 'responsive',
      criteria: 'No overflow',
      weight: 30,
      critical: false,
    },
    {
      id: 'chk-nav',
      description: 'Navigation elements present',
      testType: 'navigation',
      criteria: 'Links work',
      weight: 15,
      critical: false,
    },
    {
      id: 'chk-auth',
      description: 'Authentication and login flow',
      testType: 'functional',
      criteria: 'Redirects successfully',
      weight: 20,
      critical: false,
    },
  ];

  beforeAll(async () => {
    resetLedgerForTesting();
    const app = createDemoServer();
    await new Promise<void>((resolve) => {
      server = app.listen(PORT, () => resolve());
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('Tier 1 (100% Payout): Fully working site achieves score 100 and captures 100% funds', async () => {
    const jobId = 'e2e-job-working';
    const runId = 'e2e-run-working';
    mockAuthorizeJob(jobId, 10000); // $100 authorized

    const result = await worker.processJob({
      jobId,
      runId,
      targetUrl: `http://localhost:${PORT}/working`,
      checklistItems: standardChecklist,
      allowLocalhost: true,
    });

    expect(result.runResult.score).toBe(100);
    expect(result.runResult.tier).toBe('PAID');
    expect(result.runResult.payoutPercent).toBe(100);
    expect(result.settlement.status).toBe('EXECUTED');
    expect(result.settlement.grossPayoutCents).toBe(10000);
    expect(result.settlement.netPayoutCents).toBe(9800); // after 2% fee
    expect(result.settlement.heldRemainderCents).toBe(0);
    expect(result.report.passedItemsCount).toBe(5);
    expect(result.report.failedItemsCount).toBe(0);
  }, 45000);

  it('Tier 2 (70% Payout): Broken mobile site achieves score 70 and executes partial capture', async () => {
    const jobId = 'e2e-job-mobile';
    const runId = 'e2e-run-mobile';
    mockAuthorizeJob(jobId, 10000); // $100 authorized

    const result = await worker.processJob({
      jobId,
      runId,
      targetUrl: `http://localhost:${PORT}/broken-mobile`,
      checklistItems: standardChecklist,
      allowLocalhost: true,
    });

    // Score is 100 - 30 (mobile weight) = 70
    expect(result.runResult.score).toBe(70);
    expect(result.runResult.tier).toBe('PARTIALLY_PAID');
    expect(result.runResult.payoutPercent).toBe(70);
    expect(result.settlement.status).toBe('EXECUTED');
    expect(result.settlement.grossPayoutCents).toBe(7000);
    expect(result.settlement.netPayoutCents).toBe(6860); // after 2% fee
    expect(result.settlement.heldRemainderCents).toBe(3000); // $30 held
    expect(result.report.failedItemsCount).toBe(1);
    expect(result.report.summary).toContain('70% released');
  }, 45000);

  it('Tier 3 (0% Payout / Held): Broken login site fails authentication and holds 100% funds', async () => {
    const jobId = 'e2e-job-login';
    const runId = 'e2e-run-login';
    mockAuthorizeJob(jobId, 10000); // $100 authorized

    // Checklist where failing login drops score below 60
    const loginHeavyChecklist: ChecklistItem[] = [
      { id: 'chk-load', description: 'Loads', testType: 'functional', criteria: '', weight: 20, critical: false },
      { id: 'chk-console', description: 'Console', testType: 'console_errors', criteria: '', weight: 10, critical: false },
      { id: 'chk-auth', description: 'Authentication flow', testType: 'functional', criteria: '', weight: 70, critical: false },
    ];

    const result = await worker.processJob({
      jobId,
      runId,
      targetUrl: `http://localhost:${PORT}/broken-login`,
      checklistItems: loginHeavyChecklist,
      allowLocalhost: true,
    });

    // 20 + 10 = 30 points < 60
    expect(result.runResult.score).toBe(30);
    expect(result.runResult.tier).toBe('HELD');
    expect(result.runResult.payoutPercent).toBe(0);
    expect(result.settlement.status).toBe('HELD');
    expect(result.settlement.grossPayoutCents).toBe(0);
    expect(result.settlement.heldRemainderCents).toBe(10000);
    expect(result.report.summary).toContain('Funds Held in Escrow');
  }, 45000);
});

