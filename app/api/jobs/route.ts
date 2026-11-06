import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { generateChecklistFromRequirements, saveJobChecklist } from '@/lib/checklist';
import { buildFreelancerInviteHtml, sendEmail } from '@/lib/email';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let whereClause: any = {};
    if (user.role === 'CLIENT') {
      whereClause = { clientId: user.id };
    } else if (user.role === 'FREELANCER') {
      whereClause = {
        OR: [{ freelancerId: user.id }, { freelancerEmail: user.email }],
      };
    }
    // Admin sees all

    const jobs = await prisma.job.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true, email: true } },
        freelancer: { select: { id: true, name: true, email: true } },
        checklists: {
          orderBy: { version: 'desc' },
          take: 1,
          include: { items: true },
        },
        paymentAuthorizations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return NextResponse.json({ jobs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch jobs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, requirements, amount, deadline, freelancerEmail } = body;

    // FR-4 Validations
    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!requirements || requirements.trim().length < 20 || requirements.trim().length > 2000) {
      return NextResponse.json(
        { error: 'Requirements must be between 20 and 2000 characters' },
        { status: 400 }
      );
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum < 5 || amountNum > 5000) {
      return NextResponse.json(
        { error: 'Amount must be between $5.00 and $5,000.00 USD' },
        { status: 400 }
      );
    }

    const amountCents = Math.round(amountNum * 100);

    if (!freelancerEmail || !freelancerEmail.includes('@')) {
      return NextResponse.json({ error: 'A valid freelancer email is required' }, { status: 400 });
    }

    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
      return NextResponse.json({ error: 'Deadline must be a valid future date' }, { status: 400 });
    }

    // Check if freelancer user already exists in db
    const existingFreelancer = await prisma.user.findUnique({
      where: { email: freelancerEmail.toLowerCase().trim() },
    });

    // Create the Job in DRAFT state
    const job = await prisma.job.create({
      data: {
        clientId: user.id,
        freelancerId: existingFreelancer ? existingFreelancer.id : null,
        freelancerEmail: freelancerEmail.toLowerCase().trim(),
        title: title.trim(),
        requirements: requirements.trim(),
        amount: amountCents,
        currency: 'USD',
        status: 'DRAFT',
        deadline: deadlineDate,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actor: user.email,
        action: 'JOB_CREATED',
        entity: 'Job',
        entityId: job.id,
        after: JSON.stringify({ title, amount: amountCents, freelancerEmail }),
      },
    });

    // Auto-generate AI verification checklist from natural-language requirements (FR-6)
    const checklistItems = await generateChecklistFromRequirements(requirements, title);
    const checklist = await saveJobChecklist({
      jobId: job.id,
      items: checklistItems,
      actor: 'checklist-generator-llm',
    });

    // Send email invitation to freelancer (FR-5)
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const inviteLink = `${appUrl}/jobs/${job.id}`;
    await sendEmail({
      to: freelancerEmail,
      subject: `Escrow Invitation: ${title} ($${(amountCents / 100).toFixed(2)})`,
      html: buildFreelancerInviteHtml({
        jobTitle: title,
        clientName: user.name,
        amountFormatted: `$${(amountCents / 100).toFixed(2)} USD`,
        inviteLink,
      }),
    });

    return NextResponse.json({ success: true, job, checklist }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
