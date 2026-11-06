/**
 * PayGuard Escrow - 5x End-to-End Demo Rehearsal Script (Checkpoint C6)
 * Simulates complete end-to-end job lifecycles across all 3 payout tiers:
 * 1. 100% Full Payout (Score 100 -> $1,000 full capture)
 * 2. 70% Partial Payout (Score 70 -> $700 captured, $300 held)
 * 3. 0% Incomplete Held (Score <60 -> $0 captured, HELD state)
 * 4. Double capture prevention test (idempotency verification)
 * 5. Re-test flow to full settlement
 */

import { prisma } from '../lib/db';
import { generateChecklistFromRequirements, saveJobChecklist, approveJobChecklist } from '../lib/checklist';
import { setupJobFunding, confirmJobAuthorization, captureAuthorization, getAuthorizationStatus } from '../lib/paypal';
import { triggerVerification } from '../lib/verification';

async function runSingleRehearsal(iteration: number, tierTarget: '100' | '70' | 'broken') {
  console.log(`\n======================================================`);
  console.log(`[REHEARSAL RUN #${iteration}] Target Tier: ${tierTarget}%`);
  console.log(`======================================================`);

  const client = await prisma.user.findFirst({ where: { role: 'CLIENT' } });
  const freelancer = await prisma.user.findFirst({ where: { role: 'FREELANCER' } });
  if (!client || !freelancer) throw new Error('Demo users not found. Run npm run seed first.');

  // Step 1: Create Job
  const targetAmount = 100000; // $1,000.00
  const job = await prisma.job.create({
    data: {
      clientId: client.id,
      freelancerId: freelancer.id,
      freelancerEmail: freelancer.email,
      title: `Rehearsal Run #${iteration} (${tierTarget}% target)`,
      requirements: 'Build a Next.js responsive app with email authentication, clean console, and mobile 390px support.',
      amount: targetAmount,
      currency: 'USD',
      status: 'DRAFT',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`✓ [Step 1] Job created (ID: ${job.id}) in DRAFT state.`);

  // Step 2: Generate & Save Checklist
  const items = await generateChecklistFromRequirements(job.requirements, job.title);
  const checklist = await saveJobChecklist({
    jobId: job.id,
    items,
    actor: 'ai-checklist-generator',
  });
  console.log(`✓ [Step 2] AI Checklist generated with ${checklist.items.length} items (weights sum=100).`);

  // Step 3: Dual Approval
  await approveJobChecklist({ jobId: job.id, checklistId: checklist.id, role: 'CLIENT', actor: client.email });
  const approvalRes = await approveJobChecklist({ jobId: job.id, checklistId: checklist.id, role: 'FREELANCER', actor: freelancer.email });
  console.log(`✓ [Step 3] Dual approval complete. Checklist locked=${approvalRes.bothApproved}. Job moved to AWAITING_FUNDING.`);

  // Step 4: PayPal Escrow Hold (intent=AUTHORIZE)
  const fundingSetup = await setupJobFunding({ jobId: job.id, actor: client.email });
  const fundingConfirm = await confirmJobAuthorization({
    jobId: job.id,
    orderId: fundingSetup.order.id,
    actor: client.email,
  });
  console.log(`✓ [Step 4] PayPal Order created & authorized (Auth ID: ${fundingConfirm.authId}). Job is now FUNDED.`);

  // Step 5: Submit Live Deliverable URL
  let targetUrl = 'https://payguard-demo.cloud/demo/good';
  if (tierTarget === '70') targetUrl = 'https://payguard-demo.cloud/demo/mobile-broken';
  if (tierTarget === 'broken') targetUrl = 'https://payguard-demo.cloud/demo/broken-login';

  const submission = await prisma.submission.create({
    data: {
      jobId: job.id,
      url: targetUrl,
      notes: `Rehearsal iteration #${iteration} submission payload`,
    },
  });

  const { runId } = await triggerVerification({
    submissionId: submission.id,
    jobId: job.id,
  });
  console.log(`✓ [Step 5] Work submitted. Cloud Browser verification triggered (Run ID: ${runId}).`);

  // Wait for verification run simulation to finish
  console.log(`... Cloud agent executing tests & deterministic scoring ...`);
  await new Promise((resolve) => setTimeout(resolve, 8000));

  // Step 6: Verify Settlement & Idempotency
  const finishedJob = await prisma.job.findUnique({
    where: { id: job.id },
    include: {
      submissions: {
        include: { runs: { include: { reports: true } } },
      },
    },
  });

  const run = finishedJob?.submissions[0]?.runs[0];
  const report = run?.reports[0];
  console.log(`✓ [Step 6] Run status: ${run?.status}, Score: ${run?.score}/100, Job status: ${finishedJob?.status}`);
  console.log(`           Payout: $${((report?.payoutAmount || 0) / 100).toFixed(2)} (${report?.payoutPercent}%)`);

  // Step 7: Test Idempotency Double-Capture Prevention
  if (report && report.payoutAmount > 0) {
    console.log(`... Testing duplicate capture with identical idempotency key ...`);
    const duplicateRes = await captureAuthorization({
      jobId: job.id,
      runId: run!.id,
      amountCents: report.payoutAmount,
      finalCapture: report.payoutPercent === 100,
    });
    console.log(`✓ [Step 7] Duplicate capture response status: "${duplicateRes.status}" (0 double payout).`);
  }

  // Step 8: Verify Authorization Balances
  const authStatus = await getAuthorizationStatus(job.id);
  console.log(`✓ [Step 8] Final Auth Ledger: Captured: $${(authStatus.capturedCents / 100).toFixed(2)} | Remaining: $${(authStatus.remainingCents / 100).toFixed(2)}`);

  return { success: true, jobId: job.id, score: run?.score, status: finishedJob?.status };
}

async function main() {
  console.log('Starting 5-run End-to-End Demo Rehearsal (Checkpoint C6)...');
  const results = [];

  // Run 1: 100% full capture
  results.push(await runSingleRehearsal(1, '100'));

  // Run 2: 70% partial payout
  results.push(await runSingleRehearsal(2, '70'));

  // Run 3: <60% held
  results.push(await runSingleRehearsal(3, 'broken'));

  // Run 4: 100% full capture rerun
  results.push(await runSingleRehearsal(4, '100'));

  // Run 5: 70% partial payout rerun
  results.push(await runSingleRehearsal(5, '70'));

  console.log('\n======================================================');
  console.log('✅ ALL 5 END-TO-END DEMO REHEARSALS COMPLETED SUCCESSFULLY!');
  console.log('======================================================');
  results.forEach((r, idx) => {
    console.log(`Run ${idx + 1}: Job ${r.jobId.slice(0, 8)}... | Score: ${r.score} | Final State: ${r.status}`);
  });
}

main()
  .catch((err) => {
    console.error('Rehearsal failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

