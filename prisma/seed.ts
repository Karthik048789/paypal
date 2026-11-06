import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting PayGuard Escrow Database Seed ---');

  // Clean existing data for clean seed
  await prisma.auditLog.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.report.deleteMany();
  await prisma.testResult.deleteMany();
  await prisma.verificationRun.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.paymentEvent.deleteMany();
  await prisma.paymentAuthorization.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.checklist.deleteMany();
  await prisma.job.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Seed Users
  const clientUser = await prisma.user.create({
    data: {
      email: 'client@payguard.dev',
      name: 'Alice (Client)',
      passwordHash,
      paypalEmail: 'alice-buyer@payguard.dev',
      role: 'CLIENT',
    },
  });

  const freelancerUser = await prisma.user.create({
    data: {
      email: 'freelancer@payguard.dev',
      name: 'Bob (Freelancer)',
      passwordHash,
      paypalEmail: 'bob-seller@payguard.dev',
      role: 'FREELANCER',
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@payguard.dev',
      name: 'Admin PayGuard',
      passwordHash,
      paypalEmail: 'admin@payguard.dev',
      role: 'ADMIN',
    },
  });

  console.log('✓ Seeded 3 core users (Client, Freelancer, Admin)');

  // 2. Seed Job 1: 100% Verified and Paid in Full ($1,000 USD)
  const job1 = await prisma.job.create({
    data: {
      clientId: clientUser.id,
      freelancerId: freelancerUser.id,
      freelancerEmail: freelancerUser.email,
      title: 'Full-Stack Next.js SaaS Authentication & Dashboard',
      requirements:
        'Deliver a secure web app with email authentication, responsive 390px mobile layout, and clean zero-error browser console.',
      amount: 100000, // $1000.00
      currency: 'USD',
      status: 'PAID',
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    },
  });

  const checklist1 = await prisma.checklist.create({
    data: {
      jobId: job1.id,
      version: 1,
      isLocked: true,
      approvedByClientAt: new Date(),
      approvedByFreelancerAt: new Date(),
      items: {
        create: [
          {
            description: 'Clean Console & Zero 5xx Errors',
            testType: 'console_errors',
            criteria: 'Zero unhandled uncaught JavaScript exceptions on load.',
            weight: 20,
            critical: true,
            orderIndex: 0,
          },
          {
            description: 'Mobile Viewport (390×844) Layout Integrity',
            testType: 'responsive',
            criteria: 'No horizontal overflow (scrollWidth <= innerWidth).',
            weight: 25,
            critical: false,
            orderIndex: 1,
          },
          {
            description: 'Authentication Redirect & Session Creation',
            testType: 'functional',
            criteria: 'User can sign in and redirect to protected dashboard.',
            weight: 35,
            critical: true,
            orderIndex: 2,
          },
          {
            description: 'Header Navigation Links Functional',
            testType: 'navigation',
            criteria: 'Top navigation links and CTA buttons resolve with status < 400.',
            weight: 20,
            critical: false,
            orderIndex: 3,
          },
        ],
      },
    },
    include: { items: true },
  });

  await prisma.paymentAuthorization.create({
    data: {
      jobId: job1.id,
      paypalOrderId: 'ORDER-PAYPAL-SEED-100',
      paypalAuthId: 'AUTH-PAYPAL-SEED-100',
      amount: 100000,
      capturedAmount: 100000,
      status: 'COMPLETELY_CAPTURED',
      expiresAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.paymentEvent.create({
    data: {
      jobId: job1.id,
      type: 'capture',
      amount: 100000,
      paypalRef: 'CAPTURE-SEED-100-FULL',
      idempotencyKey: `job:${job1.id}:run:run-seed-100:capture`,
      metadata: JSON.stringify({ finalCapture: true, tier: 'PAID' }),
    },
  });

  const sub1 = await prisma.submission.create({
    data: {
      jobId: job1.id,
      url: 'https://payguard-demo.cloud/demo/good',
      notes: 'Initial production deliverable meeting all specs.',
    },
  });

  const run1 = await prisma.verificationRun.create({
    data: {
      submissionId: sub1.id,
      status: 'COMPLETED',
      score: 100,
      kernelSessionId: 'kernel-session-seed-100',
      replayUrl: 'https://view.kernel.sh/live/seed_100',
      endedAt: new Date(),
    },
  });

  for (const item of checklist1.items) {
    await prisma.testResult.create({
      data: {
        runId: run1.id,
        itemId: item.id,
        result: 'pass',
        logExcerpt: `[PASSED] Assertion for ${item.description}: 0 errors.`,
        explanation: `Requirement verified successfully: ${item.criteria}`,
        evidenceScreenshotUrl: `/evidence/${item.testType}.png`,
      },
    });
  }

  await prisma.report.create({
    data: {
      runId: run1.id,
      summary: 'Verification completed with perfect score of 100/100.',
      reasoning: 'All test requirements passed. 100% full payout ($1,000 USD) released to freelancer.',
      payoutAmount: 100000,
      payoutPercent: 100,
    },
  });

  console.log('✓ Seeded Job 1: 100% Verified & Paid ($1,000 USD)');

  // 3. Seed Job 2: 70% Partially Paid ($700 released, $300 held)
  const job2 = await prisma.job.create({
    data: {
      clientId: clientUser.id,
      freelancerId: freelancerUser.id,
      freelancerEmail: freelancerUser.email,
      title: 'E-Commerce Marketplace Product Grid & Mobile Experience',
      requirements: 'Build a catalog grid with mobile responsiveness and console safety.',
      amount: 100000, // $1000.00
      currency: 'USD',
      status: 'PARTIALLY_PAID',
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  });

  const checklist2 = await prisma.checklist.create({
    data: {
      jobId: job2.id,
      version: 1,
      isLocked: true,
      approvedByClientAt: new Date(),
      approvedByFreelancerAt: new Date(),
      items: {
        create: [
          {
            description: 'Console & Network Health Check',
            testType: 'console_errors',
            criteria: 'Zero unhandled uncaught JavaScript exceptions.',
            weight: 20,
            critical: true,
            orderIndex: 0,
          },
          {
            description: 'Mobile Viewport (390×844) Layout Integrity',
            testType: 'responsive',
            criteria: 'No horizontal scroll overflow.',
            weight: 30, // 30 points failed -> score 70!
            critical: false,
            orderIndex: 1,
          },
          {
            description: 'Product Catalog Interactive Search',
            testType: 'functional',
            criteria: 'Search filters items correctly.',
            weight: 30,
            critical: false,
            orderIndex: 2,
          },
          {
            description: 'Navigation Links & Footer',
            testType: 'navigation',
            criteria: 'Links clickable and functional.',
            weight: 20,
            critical: false,
            orderIndex: 3,
          },
        ],
      },
    },
    include: { items: true },
  });

  await prisma.paymentAuthorization.create({
    data: {
      jobId: job2.id,
      paypalOrderId: 'ORDER-PAYPAL-SEED-70',
      paypalAuthId: 'AUTH-PAYPAL-SEED-70',
      amount: 100000,
      capturedAmount: 70000, // $700 captured
      status: 'PARTIALLY_CAPTURED',
      expiresAt: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.paymentEvent.create({
    data: {
      jobId: job2.id,
      type: 'capture',
      amount: 70000,
      paypalRef: 'CAPTURE-SEED-70-PARTIAL',
      idempotencyKey: `job:${job2.id}:run:run-seed-70:capture`,
      metadata: JSON.stringify({ finalCapture: false, tier: 'PARTIALLY_PAID' }),
    },
  });

  const sub2 = await prisma.submission.create({
    data: {
      jobId: job2.id,
      url: 'https://payguard-demo.cloud/demo/mobile-broken',
      notes: 'Initial submission with known mobile responsive work in progress.',
    },
  });

  const run2 = await prisma.verificationRun.create({
    data: {
      submissionId: sub2.id,
      status: 'COMPLETED',
      score: 70,
      kernelSessionId: 'kernel-session-seed-70',
      endedAt: new Date(),
    },
  });

  for (const item of checklist2.items) {
    const isMobileItem = item.testType === 'responsive';
    await prisma.testResult.create({
      data: {
        runId: run2.id,
        itemId: item.id,
        result: isMobileItem ? 'fail' : 'pass',
        logExcerpt: isMobileItem
          ? '[WARN] Horizontal layout overflow detected: scrollWidth 442px > innerWidth 390px.'
          : `[PASSED] Assertion for ${item.description}: 0 errors.`,
        explanation: isMobileItem
          ? 'Mobile viewport (390px) layout overflowed by 52px. Elements clipped.'
          : `Requirement verified successfully: ${item.criteria}`,
        evidenceScreenshotUrl: `/evidence/${item.testType}.png`,
      },
    });
  }

  await prisma.report.create({
    data: {
      runId: run2.id,
      summary: 'Score 70/100: Partial payout released per BR-2.',
      reasoning: 'Score 70/100. We released $700. The mobile layout overflows on 390 px screens. Fix it and request a re-test to release the remaining $300.',
      payoutAmount: 70000,
      payoutPercent: 70,
    },
  });

  console.log('✓ Seeded Job 2: 70% Partially Paid ($700 released, $300 held)');

  // 4. Seed Job 3: Fresh Job in Review (AWAITING_APPROVAL) for live demo interaction
  const job3 = await prisma.job.create({
    data: {
      clientId: clientUser.id,
      freelancerId: freelancerUser.id,
      freelancerEmail: freelancerUser.email,
      title: 'Customer Feedback & Analytics Widget Development',
      requirements:
        'Embeddable feedback widget with star rating, text comment validation, clean console, and 390px mobile responsiveness.',
      amount: 50000, // $500.00
      currency: 'USD',
      status: 'AWAITING_APPROVAL',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.checklist.create({
    data: {
      jobId: job3.id,
      version: 1,
      isLocked: false,
      items: {
        create: [
          {
            description: 'Zero Uncaught Runtime Console Errors',
            testType: 'console_errors',
            criteria: 'Zero unhandled exceptions or 5xx API failures on widget load.',
            weight: 20,
            critical: true,
            orderIndex: 0,
          },
          {
            description: 'Mobile Viewport (390×844) Responsiveness',
            testType: 'responsive',
            criteria: 'Modal widget scales properly on mobile screen width without clipping.',
            weight: 25,
            critical: false,
            orderIndex: 1,
          },
          {
            description: 'Interactive Star Rating Submission',
            testType: 'functional',
            criteria: 'Selecting star rating updates UI state and submits payload.',
            weight: 35,
            critical: true,
            orderIndex: 2,
          },
          {
            description: 'Form Validation & Feedback Prompt',
            testType: 'content_present',
            criteria: 'Shows confirmation thank you message upon submission.',
            weight: 20,
            critical: false,
            orderIndex: 3,
          },
        ],
      },
    },
  });

  console.log('✓ Seeded Job 3: Awaiting Dual Approval ($500 USD)');
  console.log('--- PayGuard Escrow Seed Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
