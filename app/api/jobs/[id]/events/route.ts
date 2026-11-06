import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { eventBus } from '@/lib/verification';
import { RunEvent } from '@/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // 1. Send initial connection packet with current job status
      const job = await prisma.job.findUnique({
        where: { id },
        include: {
          paymentAuthorizations: { orderBy: { createdAt: 'desc' }, take: 1 },
          submissions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              runs: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: { testResults: true, reports: true },
              },
            },
          },
        },
      });

      if (!job) {
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'Job not found' })}\n\n`));
        controller.close();
        return;
      }

      controller.enqueue(
        encoder.encode(
          `event: init\ndata: ${JSON.stringify({
            jobId: job.id,
            status: job.status,
            amount: job.amount,
            activeRun: job.submissions[0]?.runs[0] || null,
          })}\n\n`
        )
      );

      // 2. Subscribe to event bus for runs belonging to this job's submissions
      // Collect all run IDs for this job so we can filter events correctly
      const jobRunIds = new Set<string>(
        job.submissions.flatMap((s) => s.runs.map((r) => r.id))
      );

      const unsubscribe = eventBus.subscribe('all', async (event: RunEvent) => {
        try {
          // Only forward events that belong to this job's runs
          if (!event.runId || jobRunIds.has(event.runId)) {
            // Also add new run IDs dynamically as they are created
            if (event.runId) jobRunIds.add(event.runId);
            controller.enqueue(
              encoder.encode(`event: run_event\ndata: ${JSON.stringify(event)}\n\n`)
            );
          }
        } catch {
          // Client disconnected
        }
      });

      // Keepalive heartbeat every 15s
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
