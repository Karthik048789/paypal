import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { generateChecklistFromRequirements, saveJobChecklist } from '@/lib/checklist';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    if (job.status !== 'DRAFT' && job.status !== 'AWAITING_APPROVAL') {
      return NextResponse.json(
        { error: 'Cannot regenerate checklist for a job that is already funded or in progress' },
        { status: 400 }
      );
    }

    const items = await generateChecklistFromRequirements(job.requirements, job.title);
    const checklist = await saveJobChecklist({
      jobId: job.id,
      items,
      actor: user.email,
    });

    return NextResponse.json({ success: true, checklist });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Checklist generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

