import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../lib/db';
import { captureAuthorization, voidAuthorization, getAuthorizationStatus } from '../lib/paypal';

test('PayPal Engine Interface Contract & Idempotency (Member A Contract)', async (t) => {
  // Setup a test job in database
  const clientUser = await prisma.user.findFirst({ where: { role: 'CLIENT' } });
  assert.ok(clientUser, 'Client user exists');

  const testJob = await prisma.job.create({
    data: {
      clientId: clientUser.id,
      freelancerEmail: 'freelancer-test@payguard.dev',
      title: 'Automated Payment Contract Verification Job',
      requirements: 'Testing PayPal engine capture, void, and idempotency guarantees.',
      amount: 50000, // $500.00
      status: 'FUNDED',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      paymentAuthorizations: {
        create: {
          paypalOrderId: 'ORDER-TEST-IDEMP-01',
          paypalAuthId: 'AUTH-TEST-IDEMP-01',
          amount: 50000,
          capturedAmount: 0,
          status: 'AUTHORIZED',
          expiresAt: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000),
        },
      },
    },
    include: {
      paymentAuthorizations: true,
    },
  });

  const runId = `test-run-${Date.now()}`;

  await t.test('getAuthorizationStatus returns accurate initial balance', async () => {
    const status = await getAuthorizationStatus(testJob.id);
    assert.equal(status.jobId, testJob.id);
    assert.equal(status.amountCents, 50000);
    assert.equal(status.capturedCents, 0);
    assert.equal(status.remainingCents, 50000);
    assert.equal(status.status, 'AUTHORIZED');
  });

  await t.test('captureAuthorization executes first capture and updates job state', async () => {
    const res = await captureAuthorization({
      jobId: testJob.id,
      runId,
      amountCents: 35000, // 70% of 500.00 = $350.00
      finalCapture: false,
    });

    assert.equal(res.success, true);
    assert.equal(res.amountCents, 35000);
    assert.equal(res.status, 'COMPLETED');
    assert.equal(res.idempotencyKey, `job:${testJob.id}:run:${runId}:capture`);

    // Verify DB state
    const updatedJob = await prisma.job.findUnique({ where: { id: testJob.id } });
    assert.equal(updatedJob?.status, 'PARTIALLY_PAID');

    // Verify PaymentEvent record
    const event = await prisma.paymentEvent.findUnique({
      where: { idempotencyKey: res.idempotencyKey },
    });
    assert.ok(event, 'PaymentEvent row was written');
    assert.equal(event?.amount, 35000);
    assert.equal(event?.type, 'capture');
  });

  await t.test('Strict Idempotency: Duplicate capture call returns ALREADY_CAPTURED and does not double-charge', async () => {
    // Calling with same jobId and runId
    const duplicateRes = await captureAuthorization({
      jobId: testJob.id,
      runId,
      amountCents: 35000,
      finalCapture: false,
    });

    assert.equal(duplicateRes.success, true);
    assert.equal(duplicateRes.status, 'ALREADY_CAPTURED');
    assert.equal(duplicateRes.idempotencyKey, `job:${testJob.id}:run:${runId}:capture`);

    // Verify only ONE PaymentEvent exists for this key
    const events = await prisma.paymentEvent.findMany({
      where: { idempotencyKey: duplicateRes.idempotencyKey },
    });
    assert.equal(events.length, 1, 'Exactly one payment event exists under the unique key');
  });

  await t.test('voidAuthorization voids hold and sets CANCELLED state', async () => {
    // Create job to void
    const voidJob = await prisma.job.create({
      data: {
        clientId: clientUser.id,
        freelancerEmail: 'void-test@payguard.dev',
        title: 'Void Test Contract',
        requirements: 'Testing void functionality.',
        amount: 20000,
        status: 'FUNDED',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        paymentAuthorizations: {
          create: {
            paypalOrderId: 'ORDER-TEST-VOID-01',
            paypalAuthId: 'AUTH-TEST-VOID-01',
            amount: 20000,
            status: 'AUTHORIZED',
          },
        },
      },
    });

    const voidRes = await voidAuthorization({
      jobId: voidJob.id,
      reason: 'CLIENT_CANCELLATION',
    });

    assert.equal(voidRes.success, true);
    assert.equal(voidRes.status, 'VOIDED');

    const updated = await prisma.job.findUnique({ where: { id: voidJob.id } });
    assert.equal(updated?.status, 'CANCELLED');
  });
});
