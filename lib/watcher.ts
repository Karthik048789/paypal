import { prisma } from './db';
import { reauthorizePayPalHold } from './paypal/client';
import { voidAuthorization } from './paypal';

export interface WatcherRunReport {
  checkedCount: number;
  reauthorizedCount: number;
  expiredCount: number;
  errors: string[];
  timestamp: string;
}

/**
 * Authorization Watcher Cron Job (FR-13, FR-37, BR-7)
 * Runs hourly to:
 * 1. Identify authorizations within 24 hours of expiration and attempt re-authorization
 * 2. Identify jobs past deadline + 7 days with no submission, void authorization, and set status to EXPIRED
 */
export async function runAuthorizationWatcher(): Promise<WatcherRunReport> {
  const report: WatcherRunReport = {
    checkedCount: 0,
    reauthorizedCount: 0,
    expiredCount: 0,
    errors: [],
    timestamp: new Date().toISOString(),
  };

  const now = new Date();
  const warningWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    // 1. Check for authorizations expiring within 24 hours
    const expiringAuths = await prisma.paymentAuthorization.findMany({
      where: {
        status: { in: ['AUTHORIZED', 'PARTIALLY_CAPTURED'] },
        expiresAt: {
          not: null,
          lte: warningWindow,
          gt: now,
        },
      },
      include: {
        job: true,
      },
    });

    report.checkedCount += expiringAuths.length;

    for (const auth of expiringAuths) {
      if (!auth.paypalAuthId) continue;
      try {
        const remainingCents = auth.amount - auth.capturedAmount;
        if (remainingCents > 0) {
          const reauthRes = await reauthorizePayPalHold({
            authId: auth.paypalAuthId,
            amountCents: remainingCents,
          });

          const newExpiry = new Date(now.getTime() + 29 * 24 * 60 * 60 * 1000);

          await prisma.paymentAuthorization.update({
            where: { id: auth.id },
            data: {
              expiresAt: newExpiry,
            },
          });

          await prisma.paymentEvent.create({
            data: {
              jobId: auth.jobId,
              type: 'reauthorize',
              amount: remainingCents,
              paypalRef: reauthRes.id || auth.paypalAuthId,
              idempotencyKey: `watcher:reauth:${auth.id}:${now.toISOString().slice(0, 10)}`,
              metadata: JSON.stringify({ reauthRes, prevExpiry: auth.expiresAt }),
            },
          });

          report.reauthorizedCount++;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown reauthorization error';
        report.errors.push(`Reauth error for auth ${auth.id}: ${message}`);
      }
    }

    // 2. Check for jobs past deadline + 7 days with no submissions (FR-37)
    const overdueJobs = await prisma.job.findMany({
      where: {
        status: 'FUNDED',
        deadline: {
          lte: sevenDaysAgo,
        },
        submissions: {
          none: {},
        },
      },
    });

    for (const job of overdueJobs) {
      try {
        await voidAuthorization({
          jobId: job.id,
          reason: 'DEADLINE_PASSED_SEVEN_DAYS_NO_SUBMISSION',
        });

        await prisma.job.update({
          where: { id: job.id },
          data: { status: 'EXPIRED' },
        });

        await prisma.auditLog.create({
          data: {
            actor: 'authorization-watcher',
            action: 'JOB_EXPIRED',
            entity: 'Job',
            entityId: job.id,
            after: JSON.stringify({ status: 'EXPIRED', reason: 'Deadline + 7 days passed with no submission' }),
          },
        });

        report.expiredCount++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown void error';
        report.errors.push(`Expiry void error for job ${job.id}: ${message}`);
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown watcher error';
    report.errors.push(`Watcher execution failed: ${message}`);
  }

  return report;
}

