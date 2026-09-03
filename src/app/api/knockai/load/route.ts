import { NextRequest, NextResponse } from 'next/server';
import { getRedis, USER_KEY, TEAM_KEY } from '@/lib/knockai/redis';
import { getSession, unauthorized } from '@/lib/knockai/session';

export async function GET(req: NextRequest) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ ok: true, skipped: true });

  const session = getSession(req);
  if (!session) return unauthorized();

  try {
    // Identity and team come from the verified session, never from query
    // params, so this can only ever return the caller's own data.
    const userRaw = await redis.get(USER_KEY(session.email));
    const userData = userRaw ? (typeof userRaw === 'string' ? JSON.parse(userRaw) : userRaw) : null;

    const teamId = userData?.user?.teamId || userData?.team?.id;
    const teamRaw = teamId ? await redis.get(TEAM_KEY(teamId)) : null;
    const teamData = teamRaw ? (typeof teamRaw === 'string' ? JSON.parse(teamRaw) : teamRaw) : null;

    return NextResponse.json({ ok: true, userData, teamData });
  } catch (err) {
    console.error('Redis load error:', err);
    return NextResponse.json({ error: 'Load failed' }, { status: 500 });
  }
}
