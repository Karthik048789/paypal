import { NextRequest, NextResponse } from 'next/server';
import { authenticateWithPassword, ensureDemoUsers, signSessionToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await ensureDemoUsers();
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await authenticateWithPassword(email, password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = signSessionToken(user);
    const res = NextResponse.json({ success: true, user });

    res.cookies.set('payguard_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days (FR-2)
    });

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

