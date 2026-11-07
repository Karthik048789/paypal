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
        submissions: true,
      },
    });

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    // FR-16: Submission is allowed only in FUNDED or PARTIALLY_PAID (re-test) states
    if (job.status !== 'FUNDED' && job.status !== 'PARTIALLY_PAID' && job.status !== 'HELD') {
      return NextResponse.json(
        {
          error: `Submission not allowed in current job state (${job.status}). Job must be FUNDED or PARTIALLY_PAID.`,
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { url, credentials, notes } = body;

    // Validate URL with SSRF checks (FR-15, NFR-S5)
    const urlValidation = await validateSubmissionUrl(url);
    if (!urlValidation.valid) {
      return NextResponse.json({ error: urlValidation.error }, { status: 400 });
    }

    // Encrypt test credentials if provided (NFR-S3)
    let encryptedCredentials: string | null = null;
    if (credentials && credentials.trim().length > 0) {
      if (credentials.length > 200) {
        return NextResponse.json({ error: 'Test credentials must not exceed 200 characters' }, { status: 400 });
      }
      encryptedCredentials = encryptCredentials(credentials.trim());
    }

    // Create Submission record
    const submission = await prisma.submission.create({
      data: {
        jobId: id,
        url: url.trim(),
        credentialsEncrypted: encryptedCredentials,
        notes: notes ? notes.trim() : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actor: user.email,
        action: 'WORK_SUBMITTED',
        entity: 'Submission',
        entityId: submission.id,
        after: JSON.stringify({ url: url.trim(), hasCredentials: Boolean(credentials) }),
      },
    });

    // Trigger Verification Orchestrator (FR-17)
    const { runId } = await triggerVerification({
      submissionId: submission.id,
      jobId: id,
    });

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      runId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Submission failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

