import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { approveJobChecklist } from '@/lib/checklist';

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
        checklists: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const checklist = job.checklists[0];
    if (!checklist) return NextResponse.json({ error: 'No checklist to approve' }, { status: 400 });

    // Determine role of the approver
    let role: 'CLIENT' | 'FREELANCER';
    if (job.clientId === user.id) {
      role = 'CLIENT';
    } else if (
      job.freelancerId === user.id ||
      job.freelancerEmail.toLowerCase() === user.email.toLowerCase()
    ) {
      role = 'FREELANCER';
    } else if (user.role === 'ADMIN') {
      // Admin can approve for either party if specified
      const body = await req.json().catch(() => ({}));
      role = body.asRole === 'FREELANCER' ? 'FREELANCER' : 'CLIENT';
    } else {
      return NextResponse.json({ error: 'You are not a participant in this job' }, { status: 403 });
    }

    const result = await approveJobChecklist({
      jobId: id,
      checklistId: checklist.id,
      role,
      actor: user.email,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to approve checklist';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
