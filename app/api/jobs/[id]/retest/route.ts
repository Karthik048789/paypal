import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { validateSubmissionUrl, encryptCredentials } from '@/lib/security';
import { triggerVerification } from '@/lib/verification';

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
        submissions: {
          orderBy: { createdAt: 'desc' },
          include: { runs: true },
        },
      },
    });

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    // Allowed in PARTIALLY_PAID or HELD
    if (job.status !== 'PARTIALLY_PAID' && job.status !== 'HELD') {
      return NextResponse.json(
        { error: `Re-test is only available for PARTIALLY_PAID or HELD jobs (current status: ${job.status})` },
        { status: 400 }
      );
    }

    // Check re-test cap: max 3 re-tests per job (FR-29)
    // Total runs count across all submissions
    const totalRuns = job.submissions.reduce((acc, s) => acc + s.runs.length, 0);
    // Initial submission has 1 run, so re-tests are totalRuns - 1
    const retestCount = Math.max(0, totalRuns - 1);
    if (retestCount >= 3) {
      return NextResponse.json(
        { error: 'Maximum of 3 re-tests per job has been reached. Please contact Admin or open a dispute.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const latestSubmission = job.submissions[0];
    const targetUrl = body.url || latestSubmission?.url;
    const notes = body.notes || 'Bug fixes applied for re-test.';

    if (!targetUrl) {
      return NextResponse.json({ error: 'Submission URL is required' }, { status: 400 });
    }

    const urlValidation = await validateSubmissionUrl(targetUrl);
    if (!urlValidation.valid) {
      return NextResponse.json({ error: urlValidation.error }, { status: 400 });
    }

    const newSubmission = await prisma.submission.create({
      data: {
        jobId: id,
        url: targetUrl.trim(),
        credentialsEncrypted: body.credentials ? encryptCredentials(body.credentials) : latestSubmission?.credentialsEncrypted,
        notes: notes.trim(),
      },
    });

    const { runId } = await triggerVerification({
      submissionId: newSubmission.id,
      jobId: id,
    });

    return NextResponse.json({
      success: true,
      submissionId: newSubmission.id,
      runId,
      retestNumber: retestCount + 1,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to request re-test';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

