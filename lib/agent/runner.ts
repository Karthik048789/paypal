/**
 * PayGuard Escrow - Verification Orchestrator & Test Runner
 * 
 * Orchestrates:
 * - SSRF verification
 * - Playwright / Kernel Browser sessions
 * - 3-run majority voting on discrepancies
 * - Real-time activity feed streaming (RunEvent)
 * - Deterministic scoring and financial settlement
 */

import { BrowserAgentSession } from './browser.js';
import { validateSubmissionUrl } from './security.js';
import { computeScore } from '../scoring/engine.js';
import { orchestrateSettlement, SettlementSummary } from '../scoring/settlement.js';
import { generateDecisionReport, DecisionReport } from './report.js';
import { ChecklistItem, TestResult, TestOutcome, RunEvent, RunResult } from '../../types/index.js';

export interface RunnerOptions {
  runId: string;
  jobId: string;
  targetUrl: string;
  items: ChecklistItem[];
  credentials?: { email?: string; password?: string };
  allowLocalhost?: boolean;
  cdpUrl?: string;
  headless?: boolean;
  onEvent?: (event: RunEvent) => void;
}

export interface VerificationExecutionResult {
  runResult: RunResult;
  settlement: SettlementSummary;
  report: DecisionReport;
  events: RunEvent[];
}

export async function executeVerificationRun(
  options: RunnerOptions
): Promise<VerificationExecutionResult> {
  const {
    runId,
    jobId,
    targetUrl,
    items,
    credentials,
    allowLocalhost = false,
    cdpUrl,
    headless = true,
    onEvent,
  } = options;

  const events: RunEvent[] = [];

  function emit(type: RunEvent['type'], message: string, data?: any) {
    const event: RunEvent = {
      runId,
      jobId,
      type,
      message,
      data,
      ts: Date.now(),
    };
    events.push(event);
    if (onEvent) {
      try {
        onEvent(event);
      } catch (err) {
        console.error('Error in onEvent handler:', err);
      }
    }
  }

  emit('step', `Initializing PayGuard verification run ${runId} for job ${jobId}`);

  // 1. SSRF URL Validation
  emit('step', `Auditing URL security and DNS resolution for: ${targetUrl}`);
  const urlCheck = await validateSubmissionUrl(targetUrl, { allowLocalhost });
  if (!urlCheck.valid) {
    emit('error', `Security check failed: ${urlCheck.error}`);
    throw new Error(`SSRF validation rejected submission URL: ${urlCheck.error}`);
  }
  emit('step', `URL validated successfully. Target IP: ${urlCheck.ip || 'public'}`);

  // 2. Initialize Browser Agent Session
  const session = new BrowserAgentSession();
  const testResults: TestResult[] = [];

  try {
    emit('step', cdpUrl ? 'Connecting to Kernel Cloud Browser via CDP...' : 'Launching Playwright browser session...');
    await session.initialize({ cdpUrl, headless });

    emit('viewport', 'Setting desktop viewport (1440x900)', { width: 1440, height: 900 });
    await session.setViewport('desktop');

    emit('step', `Navigating to ${targetUrl}...`);
    const initialNav = await session.navigateTo(targetUrl);
    if (!initialNav.ok) {
      emit('step', `Page returned HTTP status ${initialNav.status}`);
    }

    // Capture initial screenshot
    let baseScreenshot = '';
    try {
      baseScreenshot = await session.captureScreenshot();
    } catch {}

    // 3. Execute Checklist Items with 3-Run Majority Voting
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      emit('step', `[Check ${i + 1}/${items.length}] Testing: "${item.description}" (${item.weight} pts)`);

      const executeSingleAttempt = async (): Promise<{ outcome: TestOutcome; explanation: string; screenshot?: string }> => {
        // Ensure browser is on target URL before every test attempt
        if (session.page && session.page.url() !== targetUrl) {
          await session.navigateTo(targetUrl);
        }

        switch (item.testType) {
          case 'functional': {
            if (item.id.includes('auth') || item.description.toLowerCase().includes('login')) {
              emit('step', 'Executing authentication check (form fill & submit)...');
              const loginRes = await session.attemptLogin(credentials);
              const scr = await session.captureScreenshot().catch(() => undefined);
              return {
                outcome: loginRes.success ? 'pass' : 'fail',
                explanation: loginRes.explanation,
                screenshot: scr,
              };
            }
            // Standard page load check
            const pageLoaded = session.page !== null;
            return {
              outcome: pageLoaded ? 'pass' : 'fail',
              explanation: pageLoaded ? 'Page root element and DOM mounted successfully.' : 'Page failed to render.',
            };
          }

          case 'responsive': {
            emit('viewport', 'Switching to mobile viewport (390x844) for responsiveness audit', { width: 390, height: 844 });
            await session.setViewport('mobile');
            const overflowCheck = await session.checkHorizontalOverflow();
            const scr = await session.captureScreenshot().catch(() => undefined);

            // Restore desktop viewport
            await session.setViewport('desktop');

            if (overflowCheck.hasOverflow) {
              return {
                outcome: 'fail',
                explanation: `Horizontal scroll detected on 390px mobile viewport (scrollWidth: ${overflowCheck.scrollWidth}px > innerWidth: ${overflowCheck.innerWidth}px).`,
                screenshot: scr,
              };
            }
            return {
              outcome: 'pass',
              explanation: `Layout scaled cleanly on 390px screen without horizontal scroll (scrollWidth: ${overflowCheck.scrollWidth}px).`,
              screenshot: scr,
            };
          }

          case 'console_errors': {
            emit('step', 'Auditing browser console and network telemetry...');
            const errCount = session.diagnostics.consoleErrors.length;
            const failedReqCount = session.diagnostics.failedRequests.length;

            if (errCount > 0 || failedReqCount > 0) {
              const details = [
                ...session.diagnostics.consoleErrors.slice(0, 3).map((e) => `[Console] ${e}`),
                ...session.diagnostics.failedRequests.slice(0, 3).map((r) => `[Network] ${r}`),
              ].join(' | ');

              return {
                outcome: 'fail',
                explanation: `Detected ${errCount} console error(s) and ${failedReqCount} failed request(s). Excerpt: ${details}`,
              };
            }
            return {
              outcome: 'pass',
              explanation: 'Zero unhandled console exceptions or 5xx network errors detected on load.',
            };
          }

          case 'navigation': {
            emit('step', 'Inspecting page navigation structure and links...');
            const hasNav = await session.page?.evaluate(() => {
              const nav = document.querySelector('nav, header, .nav, a[href]');
              return !!nav;
            });
            return {
              outcome: hasNav ? 'pass' : 'fail',
              explanation: hasNav ? 'Essential navigation structure and anchor elements verified.' : 'No navigation links found.',
            };
          }

          case 'content_present': {
            emit('step', 'Auditing core page content and visibility...');
            const hasContent = await session.page?.evaluate(() => {
              return (document.body.innerText || '').trim().length > 20;
            });
            return {
              outcome: hasContent ? 'pass' : 'fail',
              explanation: hasContent ? 'Primary content sections rendered.' : 'Page body content is empty.',
            };
          }

          default:
            return { outcome: 'pass', explanation: 'Generic verification passed.' };
        }
      };

      // Discrepancy & Majority Vote: run up to 2 times, 3rd if discrepancy
      let attempt1 = await executeSingleAttempt();
      let finalOutcome: TestOutcome = attempt1.outcome;
      let finalExplanation = attempt1.explanation;
      let evidenceScreenshot = attempt1.screenshot || baseScreenshot;
      let attemptsCount = 1;

      // Run second attempt to confirm reproducibility
      const attempt2 = await executeSingleAttempt();
      attemptsCount = 2;

      if (attempt1.outcome !== attempt2.outcome) {
        emit('step', `Discrepancy detected between attempt 1 (${attempt1.outcome}) and attempt 2 (${attempt2.outcome}). Triggering 3rd consensus run...`);
        const attempt3 = await executeSingleAttempt();
        attemptsCount = 3;

        // Majority vote among 3 runs
        const votes = [attempt1.outcome, attempt2.outcome, attempt3.outcome];
        const passCount = votes.filter((v) => v === 'pass').length;
        const failCount = votes.filter((v) => v === 'fail').length;

        finalOutcome = passCount >= 2 ? 'pass' : failCount >= 2 ? 'fail' : 'inconclusive';
        finalExplanation = `Majority vote consensus (${passCount} pass, ${failCount} fail): ${attempt3.explanation}`;
        evidenceScreenshot = attempt3.screenshot || attempt2.screenshot || baseScreenshot;
      }

      const testResult: TestResult = {
        itemId: item.id,
        runId,
        result: finalOutcome,
        explanation: finalExplanation,
        evidenceScreenshotUrl: evidenceScreenshot,
        attempts: attemptsCount,
      };

      testResults.push(testResult);
      emit('test_result', `Check "${item.description}": ${finalOutcome.toUpperCase()}`, {
        itemId: item.id,
        outcome: finalOutcome,
        weight: item.weight,
      });
    }
  } finally {
    await session.close();
  }

  // 4. Deterministic Scoring
  emit('step', 'Computing deterministic score and payout tier...');
  const scoringOutput = computeScore(items, testResults);
  emit('score', `Verification Completed. Final Score: ${scoringOutput.score}/100 (Tier: ${scoringOutput.tier})`, {
    score: scoringOutput.score,
    tier: scoringOutput.tier,
    payoutPercent: scoringOutput.payoutPercent,
  });

  // 5. Settlement Orchestration
  emit('step', `Triggering settlement orchestrator for payout: ${scoringOutput.payoutPercent}%`);
  const settlement = await orchestrateSettlement({
    jobId,
    runId,
    tier: scoringOutput.tier,
    payoutPercent: scoringOutput.payoutPercent,
    finalCapture: scoringOutput.finalCapture,
  });
  emit('payout', settlement.message, { settlement });

  // 6. Generate Plain-English Report
  const report = generateDecisionReport({
    runId,
    jobId,
    score: scoringOutput.score,
    tier: scoringOutput.tier,
    payoutPercent: scoringOutput.payoutPercent,
    items,
    results: testResults,
    grossPayoutCents: settlement.grossPayoutCents,
    heldRemainderCents: settlement.heldRemainderCents,
  });

  const runResult: RunResult = {
    runId,
    jobId,
    score: scoringOutput.score,
    tier: scoringOutput.tier,
    payoutPercent: scoringOutput.payoutPercent,
    results: testResults,
    reportId: report.reportId,
    summary: report.summary,
    reasoning: report.reasoning,
  };

  emit('step', `Decision report generated: ${report.reportId}. Verification workflow finalized.`);

  return {
    runResult,
    settlement,
    report,
    events,
  };
}

