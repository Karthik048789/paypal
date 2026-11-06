import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from './db';
import { UserRole } from '@/types';

const SESSION_COOKIE_NAME = 'payguard_session';
const SESSION_EXPIRY_DAYS = 7; // FR-2: 7 days of inactivity

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  paypalEmail?: string | null;
}

/**
 * Creates encrypted signed session payload
 */
export function signSessionToken(user: SessionUser): string {
  const payload = JSON.stringify({
    ...user,
    exp: Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  });
  const secret = process.env.SESSION_SECRET || 'payguard-default-session-secret-2026';
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(payload).toString('base64') + '.' + hmac;
}

/**
 * Verifies session token
 */
export function verifySessionToken(token: string): SessionUser | null {
  try {
    const [payloadB64, hmac] = token.split('.');
    if (!payloadB64 || !hmac) return null;

    const secret = process.env.SESSION_SECRET || 'payguard-default-session-secret-2026';
    const payload = Buffer.from(payloadB64, 'base64').toString('utf8');
    const expectedHmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    if (hmac !== expectedHmac) return null;

    const data = JSON.parse(payload);
    if (Date.now() > data.exp) return null; // Expired

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role as UserRole,
      paypalEmail: data.paypalEmail,
    };
  } catch {
    return null;
  }
}

/**
 * Gets currently logged-in user from request cookies
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Authenticates user credentials
 */
export async function authenticateWithPassword(email: string, passwordPlain: string): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) return null;

  const valid = await bcrypt.compare(passwordPlain, user.passwordHash);
  if (!valid) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    paypalEmail: user.paypalEmail,
  };
}

/**
 * Registers new user
 */
export async function registerUser({
  email,
  name,
  password,
  role = 'CLIENT',
  paypalEmail,
}: {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
  paypalEmail?: string;
}): Promise<SessionUser> {
  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const newUser = await prisma.user.create({
    data: {
      email: email.toLowerCase().trim(),
      name,
      passwordHash,
      role,
      paypalEmail: paypalEmail?.trim(),
    },
  });

  return {
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role as UserRole,
    paypalEmail: newUser.paypalEmail,
  };
}

/**
 * Helper to seed default demo users if they don't exist
 */
export async function ensureDemoUsers() {
  const defaultUsers = [
    {
      email: 'client@payguard.dev',
      name: 'Alice (Client)',
      password: 'password123',
      role: 'CLIENT' as UserRole,
      paypalEmail: 'alice-buyer@payguard.dev',
    },
    {
      email: 'freelancer@payguard.dev',
      name: 'Bob (Freelancer)',
      password: 'password123',
      role: 'FREELANCER' as UserRole,
      paypalEmail: 'bob-seller@payguard.dev',
    },
    {
      email: 'admin@payguard.dev',
      name: 'Admin PayGuard',
      password: 'password123',
      role: 'ADMIN' as UserRole,
      paypalEmail: 'admin@payguard.dev',
    },
  ];

  for (const u of defaultUsers) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      await prisma.user.create({
        data: {
          email: u.email,
          name: u.name,
          passwordHash,
          role: u.role,
          paypalEmail: u.paypalEmail,
        },
      });
    }
  }
}
