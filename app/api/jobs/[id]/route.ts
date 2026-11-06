import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, email: true, paypalEmail: true } },
        freelancer: { select: { id: true, name: true, email: true, paypalEmail: true } },
        checklists: {
          orderBy: { version: 'desc' },
          include: {
            items: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
        paymentAuthorizations: {
          orderBy: { createdAt: 'desc' },
        },
        submissions: {
          orderBy: { createdAt: 'desc' },
          include: {
            runs: {
              orderBy: { createdAt: 'desc' },
              include: {
                testResults: {
                  include: {
                    item: true,
                  },
                },
                reports: true,
              },
            },
          },
        },
        paymentEvents: {
          orderBy: { createdAt: 'desc' },
        },
        disputes: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Role-based access check (SRS 2.2: Access limited to its two participants and Admin)
    const isParticipant =
      user.role === 'ADMIN' ||
      job.clientId === user.id ||
      job.freelancerId === user.id ||
      job.freelancerEmail.toLowerCase() === user.email.toLowerCase();

    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden: You do not have access to this job' }, { status: 403 });
    }

    // If freelancer is viewing and not yet bound, auto-bind freelancerId
    if (user.role === 'FREELANCER' && !job.freelancerId && job.freelancerEmail.toLowerCase() === user.email.toLowerCase()) {
      await prisma.job.update({
        where: { id: job.id },
        data: { freelancerId: user.id },
      });
    }

    return NextResponse.json({ job });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
