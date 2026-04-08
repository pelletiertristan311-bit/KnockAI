import { NextRequest, NextResponse } from 'next/server';
import { getRedis, USER_KEY, TEAM_KEY } from '@/lib/knockai/redis';

export async function GET(req: NextRequest) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ ok: true, skipped: true });

  try {
    const email = req.nextUrl.searchParams.get('email');
    const teamId = req.nextUrl.searchParams.get('teamId');
    if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });

    const [userRaw, teamRaw] = await Promise.all([
      redis.get(USER_KEY(email)),
      teamId ? redis.get(TEAM_KEY(teamId)) : Promise.resolve(null),
    ]);

    return NextResponse.json({
      ok: true,
      userData: userRaw ? (typeof userRaw === 'string' ? JSON.parse(userRaw) : userRaw) : null,
      teamData: teamRaw ? (typeof teamRaw === 'string' ? JSON.parse(teamRaw) : teamRaw) : null,
    });
  } catch (err) {
    console.error('Redis load error:', err);
    return NextResponse.json({ error: 'Load failed' }, { status: 500 });
  }
}
