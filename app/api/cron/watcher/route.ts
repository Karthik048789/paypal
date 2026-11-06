import { NextResponse } from 'next/server';
import { runAuthorizationWatcher } from '@/lib/watcher';

export async function GET() {
  const report = await runAuthorizationWatcher();
  return NextResponse.json({ success: true, report });
}

export async function POST() {
  const report = await runAuthorizationWatcher();
  return NextResponse.json({ success: true, report });
}
