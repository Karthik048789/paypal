import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  try {
    const { id, runId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const run = await prisma.verificationRun.findUnique({
      where: { id: runId },
      include: {
        testResults: {
          include: {
            item: true,
          },
        },
        reports: true,
        submission: {
          include: {
            job: {
              include: {
                client: { select: { id: true, name: true, email: true } },
                freelancer: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
    });

    if (!run) {
      return NextResponse.json({ error: 'Verification run not found' }, { status: 404 });
    }

    return NextResponse.json({ run });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch run';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
