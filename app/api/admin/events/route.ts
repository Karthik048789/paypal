import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const [paymentEvents, auditLogs, disputes] = await Promise.all([
      prisma.paymentEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { job: { select: { title: true } } },
      }),
      prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 100,
      }),
      prisma.dispute.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          job: { select: { title: true, amount: true } },
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

    return NextResponse.json({ paymentEvents, auditLogs, disputes });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch admin events';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
