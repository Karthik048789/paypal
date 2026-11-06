import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { captureAuthorization, voidAuthorization } from '@/lib/paypal';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        job: {
          include: {
            paymentAuthorizations: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });

    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    if (dispute.status !== 'OPEN' && dispute.status !== 'UNDER_REVIEW') {
      return NextResponse.json({ error: 'Dispute is already resolved' }, { status: 400 });
    }

    const body = await req.json();
    const { action, reason, overrideAmountCents } = body; // action: 'uphold' | 'override' | 'void'

    if (!reason || reason.trim().length < 5) {
      return NextResponse.json({ error: 'A written reason is mandatory for resolving disputes' }, { status: 400 });
    }

    const job = dispute.job;
    let newStatus = 'RESOLVED_UPHELD';

    if (action === 'override') {
      newStatus = 'RESOLVED_OVERRIDDEN';
      const amountToCapture = overrideAmountCents ? Number(overrideAmountCents) : job.amount;

      await captureAuthorization({
        jobId: job.id,
        runId: `admin-override-${dispute.id}`,
        amountCents: amountToCapture,
        finalCapture: true,
      });
    } else if (action === 'void') {
      newStatus = 'RESOLVED_VOIDED';
      await voidAuthorization({
        jobId: job.id,
        reason: `Admin dispute resolution void: ${reason}`,
      });
    } else {
      // uphold
      newStatus = 'RESOLVED_UPHELD';
      await prisma.job.update({
        where: { id: job.id },
        data: { status: 'HELD' },
      });
    }

    const updatedDispute = await prisma.dispute.update({
      where: { id },
      data: {
        status: newStatus,
        resolution: reason.trim(),
        resolvedBy: user.email,
        resolvedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        actor: user.email,
        action: 'DISPUTE_RESOLVED',
        entity: 'Dispute',
        entityId: id,
        after: JSON.stringify({ action, reason, disputeStatus: newStatus }),
      },
    });

    return NextResponse.json({ success: true, dispute: updatedDispute });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Dispute resolution failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
