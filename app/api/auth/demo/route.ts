import { NextRequest, NextResponse } from 'next/server';
import { ensureDemoUsers, authenticateWithPassword, signSessionToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await ensureDemoUsers();
    const body = await req.json();
    const role = (body.role || 'CLIENT').toUpperCase();

    let email = 'client@payguard.dev';
    if (role === 'FREELANCER') email = 'freelancer@payguard.dev';
    if (role === 'ADMIN') email = 'admin@payguard.dev';

    const user = await authenticateWithPassword(email, 'password123');
    if (!user) {
      return NextResponse.json({ error: 'Failed to authenticate demo user' }, { status: 500 });
    }

    const token = signSessionToken(user);
    const res = NextResponse.json({ success: true, user });

    res.cookies.set('payguard_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Demo login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

