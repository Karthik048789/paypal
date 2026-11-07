import { NextRequest, NextResponse } from 'next/server';
import { registerUser, signSessionToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, password, role, paypalEmail } = body;

    if (!email || !name || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const user = await registerUser({
      email,
      name,
      password,
      role: role || 'CLIENT',
      paypalEmail,
    });

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
    const message = err instanceof Error ? err.message : 'Registration failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

