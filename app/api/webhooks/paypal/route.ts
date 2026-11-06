import { NextRequest, NextResponse } from 'next/server';
import { processPayPalWebhookEvent } from '@/lib/paypal';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const event = JSON.parse(rawBody);

    if (!event || !event.id || !event.event_type) {
      return NextResponse.json({ error: 'Malformed webhook payload' }, { status: 400 });
    }

    // Process event with deduplication
    const result = await processPayPalWebhookEvent(event);

    return NextResponse.json({ received: true, duplicate: result.duplicate });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

