import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { saveJobChecklist } from '@/lib/checklist';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const body = await req.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Items array is required' }, { status: 400 });
    }

    const updatedChecklist = await saveJobChecklist({
      jobId: id,
      items,
      actor: user.email,
    });

    return NextResponse.json({ success: true, checklist: updatedChecklist });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update checklist';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

