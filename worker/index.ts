/**
 * PayGuard Escrow - Background Verification Worker Service
 * 
 * Subscribes to verification requests and executes full end-to-end testing:
 * - Browser Agent execution (Playwright / Kernel CDP)
 * - Real-time activity feed streaming (Supabase Realtime / Event bus)
 * - Deterministic scoring & financial settlement
 * - Report writing
 */

import { executeVerificationRun } from '../lib/agent/runner.js';
import { generateFallbackChecklist } from '../lib/agent/checklist.js';
import { ChecklistItem, RunEvent } from '../types/index.js';

export interface VerificationJobPayload {
  jobId: string;
  runId: string;
  targetUrl: string;
  checklistItems?: ChecklistItem[];
  requirements?: string;
  credentials?: { email?: string; password?: string };
  allowLocalhost?: boolean;
  cdpUrl?: string;
}

export class VerificationWorker {
  private isProcessing = false;

  /**
   * Process a single verification job
   */
  async processJob(
    payload: VerificationJobPayload,
    onEvent?: (event: RunEvent) => void
  ) {
    const {
      jobId,
      runId,
      targetUrl,
      checklistItems,
      requirements,
      credentials,
      allowLocalhost = true,
      cdpUrl,
    } = payload;

    console.log(`\n======================================================`);
    console.log(`[PayGuard Worker] Starting Run ${runId} for Job ${jobId}`);
    console.log(`Target URL: ${targetUrl}`);
    console.log(`======================================================\n`);

    // Prepare checklist items
    const items = checklistItems && checklistItems.length > 0
      ? checklistItems
      : generateFallbackChecklist(requirements || 'Build a functional web application with responsive design and login.');

    const result = await executeVerificationRun({
      runId,
      jobId,
      targetUrl,
      items,
      credentials,
      allowLocalhost,
      cdpUrl,
      headless: true,
      onEvent: (event) => {
        const timeStr = new Date(event.ts).toLocaleTimeString();
        console.log(`[${timeStr}] [${event.type.toUpperCase()}] ${event.message}`);
        if (onEvent) {
          onEvent(event);
        }
      },
    });

    console.log(`\n======================================================`);
    console.log(`[PayGuard Worker] Verification Run Complete`);
    console.log(`Score: ${result.runResult.score}/100 | Tier: ${result.runResult.tier}`);
    console.log(`Settlement Status: ${result.settlement.status}`);
    console.log(`Settlement Message: ${result.settlement.message}`);
    console.log(`Report ID: ${result.report.reportId}`);
    console.log(`======================================================\n`);

    return result;
  }
}

// Standalone execution runner for testing & local development
if (process.env.RUN_WORKER_CLI === 'true') {
  const worker = new VerificationWorker();
  const testJob: VerificationJobPayload = {
    jobId: process.env.JOB_ID || 'job-demo-001',
    runId: process.env.RUN_ID || `run-${Date.now()}`,
    targetUrl: process.env.TARGET_URL || 'http://localhost:4100/working',
    allowLocalhost: true,
  };

  worker.processJob(testJob).then(() => {
    console.log('Worker finished test job.');
  }).catch((err) => {
    console.error('Worker failed:', err);
  });
}

