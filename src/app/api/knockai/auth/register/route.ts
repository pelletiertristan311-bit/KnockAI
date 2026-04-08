import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getRedis, AUTH_KEY, USER_KEY } from '@/lib/knockai/redis';

export async function POST(req: NextRequest) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  try {
    const { email, password, fullName } = await req.json();
    if (!email || !password || !fullName) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await redis.get(AUTH_KEY(normalizedEmail));
    if (existing) return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const createdAt = new Date().toISOString();

    await redis.set(AUTH_KEY(normalizedEmail), JSON.stringify({ passwordHash, userId, createdAt }), { ex: 60 * 60 * 24 * 365 * 10 });

    const initialUserData = {
      user: { id: userId, email: normalizedEmail, fullName, role: 'member', language: 'fr', distanceUnit: 'km', aiEnabled: true, nameChangesUsed: 0 },
      pins: [], sessions: [], routes: [], chatMessages: [], team: null, teamMembers: [],
    };
    await redis.set(USER_KEY(normalizedEmail), JSON.stringify(initialUserData), { ex: 60 * 60 * 24 * 365 * 10 });

    return NextResponse.json({ ok: true, userId });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
