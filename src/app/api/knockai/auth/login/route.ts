import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getRedis, AUTH_KEY, USER_KEY, TEAM_KEY } from '@/lib/knockai/redis';

export async function POST(req: NextRequest) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });

    const normalizedEmail = email.toLowerCase().trim();
    const authRaw = await redis.get(AUTH_KEY(normalizedEmail));
    if (!authRaw) return NextResponse.json({ error: 'No account found with this email' }, { status: 401 });

    const auth = typeof authRaw === 'string' ? JSON.parse(authRaw) : authRaw as { passwordHash: string; userId: string };
    const valid = await bcrypt.compare(password, auth.passwordHash);
    if (!valid) return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });

    const userRaw = await redis.get(USER_KEY(normalizedEmail));
    const userData = userRaw ? (typeof userRaw === 'string' ? JSON.parse(userRaw) : userRaw) : null;

    let teamData = null;
    const teamId = userData?.team?.id || userData?.user?.teamId;
    if (teamId) {
      const teamRaw = await redis.get(TEAM_KEY(teamId));
      teamData = teamRaw ? (typeof teamRaw === 'string' ? JSON.parse(teamRaw) : teamRaw) : null;
    }

    return NextResponse.json({ ok: true, userData, teamData });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
