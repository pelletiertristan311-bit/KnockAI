import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getRedis, AUTH_KEY, USER_KEY, TEAM_KEY } from '@/lib/knockai/redis';
import { setSessionCookie } from '@/lib/knockai/session';
import { checkRateLimit, getClientIp, tooManyRequests } from '@/lib/knockai/rateLimit';

const GENERIC_LOGIN_ERROR = 'Email ou mot de passe incorrect';

export async function POST(req: NextRequest) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });

    const normalizedEmail = email.toLowerCase().trim();

    // Throttle by IP (broad) and by the targeted email (focused) to slow
    // both distributed and single-account brute-force attempts.
    const ip = getClientIp(req);
    const [ipOk, emailOk] = await Promise.all([
      checkRateLimit(`login:ip:${ip}`, 20, 5 * 60),
      checkRateLimit(`login:email:${normalizedEmail}`, 8, 15 * 60),
    ]);
    if (!ipOk || !emailOk) return tooManyRequests();

    const authRaw = await redis.get(AUTH_KEY(normalizedEmail));
    // Same message whether the account doesn't exist or the password is
    // wrong — otherwise this endpoint can be used to find out which emails
    // are registered.
    if (!authRaw) return NextResponse.json({ error: GENERIC_LOGIN_ERROR }, { status: 401 });

    const auth = typeof authRaw === 'string' ? JSON.parse(authRaw) : authRaw as { passwordHash: string; userId: string };
    const valid = await bcrypt.compare(password, auth.passwordHash);
    if (!valid) return NextResponse.json({ error: GENERIC_LOGIN_ERROR }, { status: 401 });

    const userRaw = await redis.get(USER_KEY(normalizedEmail));
    const userData = userRaw ? (typeof userRaw === 'string' ? JSON.parse(userRaw) : userRaw) : null;

    let teamData = null;
    const teamId = userData?.team?.id || userData?.user?.teamId;
    if (teamId) {
      const teamRaw = await redis.get(TEAM_KEY(teamId));
      teamData = teamRaw ? (typeof teamRaw === 'string' ? JSON.parse(teamRaw) : teamRaw) : null;
    }

    const response = NextResponse.json({ ok: true, userData, teamData });
    setSessionCookie(response, { uid: auth.userId, email: normalizedEmail });
    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
