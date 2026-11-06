import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { setupJobFunding } from '@/lib/paypal';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await setupJobFunding({
      jobId: id,
      actor: user.email,
    });

    return NextResponse.json({
      success: true,
      orderId: result.order.id,
      order: result.order,
      paymentAuthId: result.paymentAuth.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create PayPal authorization order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

