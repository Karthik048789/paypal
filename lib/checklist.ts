import { prisma } from './db';
import { ChecklistItemDTO, TestType } from '@/types';
import { validateChecklistRules, transitionJobState } from './state-machine';

/**
 * Intelligent Checklist Generator (FR-6, FR-7)
 * Generates 3-12 items with test_type, criteria, weight (sum=100), and console health >=10
 */
export async function generateChecklistFromRequirements(
  requirements: string,
  title: string
): Promise<ChecklistItemDTO[]> {
  const reqLower = (requirements + ' ' + title).toLowerCase();

  // If user provided LLM_API_KEY, can make an LLM call; otherwise generate tailored schema
  // Let's create an intelligent generator tailored to the exact requirements
  const items: ChecklistItemDTO[] = [];

  // 1. Mandatory Console and Network Health Check (FR-7: minimum 10 weight)
  items.push({
    description: 'Clean Browser Console & Network Health',
    testType: 'console_errors',
    criteria: 'Zero unhandled uncaught JavaScript exceptions, 0 fatal 5xx network request errors on page load.',
    weight: 15,
    critical: true,
  });

  // 2. Mobile Responsive Layout Check (FR-18: 390x844 viewport)
  items.push({
    description: 'Mobile Viewport (390×844) Layout Integrity',
    testType: 'responsive',
    criteria: 'No horizontal overflow (scrollWidth <= innerWidth), readable typography, touch targets >= 44x44px.',
    weight: 20,
    critical: false,
  });

  // 3. Desktop Navigation & Core Structure (FR-18: 1440x900 viewport)
  items.push({
    description: 'Desktop (1440×900) Header Navigation & Links',
    testType: 'navigation',
    criteria: 'Top navigation links and CTA buttons are clickable and resolve without 404 or broken anchor links.',
    weight: 15,
    critical: false,
  });

  // 4. Functional Requirement Checks based on text
  if (reqLower.includes('login') || reqLower.includes('auth') || reqLower.includes('sign in')) {
    items.push({
      description: 'Authentication Flow & Form Validation',
      testType: 'functional',
      criteria: 'User can input credentials into the login form and receive successful session redirect or error messaging.',
      weight: 25,
      critical: true,
    });
    items.push({
      description: 'Protected Dashboard Content Rendering',
      testType: 'content_present',
      criteria: 'Post-login view correctly displays user profile, navigation menu, and expected dashboard widgets.',
      weight: 25,
      critical: false,
    });
  } else if (reqLower.includes('cart') || reqLower.includes('shop') || reqLower.includes('checkout')) {
    items.push({
      description: 'Shopping Cart & Checkout Flow',
      testType: 'functional',
      criteria: 'Items can be added to the cart, order summary recalculates, and checkout form validates inputs.',
      weight: 25,
      critical: true,
    });
    items.push({
      description: 'Product Catalog Presentation',
      testType: 'content_present',
      criteria: 'Products show titles, prices, descriptions, and functional filtering/search controls.',
      weight: 25,
      critical: false,
    });
  } else {
    items.push({
      description: 'Primary Interactive Feature Execution',
      testType: 'functional',
      criteria: 'Main user call-to-action triggers expected UI state change or submission without errors.',
      weight: 25,
      critical: true,
    });
    items.push({
      description: 'Core Content & Asset Presentation',
      testType: 'content_present',
      criteria: 'Hero section, feature cards, and footer contact info render correctly with visible assets.',
      weight: 25,
      critical: false,
    });
  }

  // Validate that weights sum to exactly 100
  const totalWeight = items.reduce((acc, item) => acc + item.weight, 0);
  if (totalWeight !== 100) {
    // Adjust last item weight to guarantee exact 100
    items[items.length - 1].weight += 100 - totalWeight;
  }

  return items;
}

/**
 * Creates or updates a checklist for a job with version incrementing
 */
export async function saveJobChecklist({
  jobId,
  items,
  actor,
}: {
  jobId: string;
  items: ChecklistItemDTO[];
  actor: string;
}) {
  const validation = validateChecklistRules(items);
  if (!validation.valid) {
    throw new Error(`Invalid checklist: ${validation.errors.join(' ')}`);
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      checklists: {
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  });

  if (!job) throw new Error(`Job not found: ${jobId}`);

  // Check if job is already funded (BR-8: The checklist cannot change after funding without a new cycle)
  if (['FUNDED', 'VERIFYING', 'PAID', 'PARTIALLY_PAID', 'HELD'].includes(job.status)) {
    throw new Error('Checklist is locked and cannot be edited after the job has been funded (BR-8).');
  }

  const latestChecklist = job.checklists[0];
  const nextVersion = latestChecklist ? latestChecklist.version + 1 : 1;

  // Create new checklist version
  const newChecklist = await prisma.checklist.create({
    data: {
      jobId,
      version: nextVersion,
      isLocked: false,
      items: {
        create: items.map((item, index) => ({
          description: item.description,
          testType: item.testType,
          criteria: item.criteria,
          weight: item.weight,
          critical: Boolean(item.critical),
          orderIndex: item.orderIndex ?? index,
        })),
      },
    },
    include: {
      items: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actor,
      action: 'CHECKLIST_SAVED',
      entity: 'Checklist',
      entityId: newChecklist.id,
      after: JSON.stringify({ version: nextVersion, itemCount: items.length }),
    },
  });

  // Ensure state is at least AWAITING_APPROVAL
  if (job.status === 'DRAFT') {
    await transitionJobState(jobId, 'AWAITING_APPROVAL', actor);
  }

  return newChecklist;
}

/**
 * Approves checklist as Client or Freelancer (FR-8, FR-9)
 * If both have approved, locks the checklist and transitions job to AWAITING_FUNDING
 */
export async function approveJobChecklist({
  jobId,
  checklistId,
  role,
  actor,
}: {
  jobId: string;
  checklistId: string;
  role: 'CLIENT' | 'FREELANCER';
  actor: string;
}) {
  const checklist = await prisma.checklist.findUnique({
    where: { id: checklistId },
    include: { job: true },
  });

  if (!checklist) throw new Error(`Checklist not found: ${checklistId}`);
  if (checklist.jobId !== jobId) throw new Error('Checklist does not belong to this job.');
  if (checklist.isLocked) throw new Error('Checklist is already locked.');

  const updateData: { approvedByClientAt?: Date; approvedByFreelancerAt?: Date; isLocked?: boolean } = {};
  if (role === 'CLIENT') {
    updateData.approvedByClientAt = new Date();
  } else if (role === 'FREELANCER') {
    updateData.approvedByFreelancerAt = new Date();
  }

  const clientApproved = role === 'CLIENT' || Boolean(checklist.approvedByClientAt);
  const freelancerApproved = role === 'FREELANCER' || Boolean(checklist.approvedByFreelancerAt);

  const bothApproved = clientApproved && freelancerApproved;
  if (bothApproved) {
    updateData.isLocked = true;
  }

  const updatedChecklist = await prisma.checklist.update({
    where: { id: checklistId },
    data: updateData,
    include: { items: true },
  });

  await prisma.auditLog.create({
    data: {
      actor,
      action: `CHECKLIST_APPROVED_${role}`,
      entity: 'Checklist',
      entityId: checklistId,
      after: JSON.stringify({ clientApproved, freelancerApproved, isLocked: bothApproved }),
    },
  });

  // If both approved, move job to AWAITING_FUNDING (FR-9)
  if (bothApproved && checklist.job.status === 'AWAITING_APPROVAL') {
    await transitionJobState(jobId, 'AWAITING_FUNDING', actor);
  }

  return { checklist: updatedChecklist, bothApproved };
}

