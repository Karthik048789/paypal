import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { transitionJobState } from '@/lib/state-machine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        disputes: { where: { status: 'OPEN' } },
      },
    });

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    // Edge case: "Both parties dispute at once -> one dispute per job and a single Admin resolution" (SRS 2.9)
    if (job.disputes.length > 0) {
      return NextResponse.json(
        { error: 'An active dispute is already open for this job.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { reason } = body;

    if (!reason || reason.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide a clear reason for the dispute (at least 10 characters).' },
        { status: 400 }
      );
    }

    // Create dispute
    const dispute = await prisma.dispute.create({
      data: {
        jobId: id,
        openedBy: user.id,
        reason: reason.trim(),
        status: 'OPEN',
      },
    });

    // Freeze further automated capture: transition job to DISPUTED (FR-34)
    await transitionJobState(id, 'DISPUTED', user.email, { disputeId: dispute.id, reason });

    return NextResponse.json({ success: true, dispute });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to open dispute';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

