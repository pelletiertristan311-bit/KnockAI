import { NextRequest, NextResponse } from 'next/server';
import { getRedis, USER_KEY, TEAM_KEY } from '@/lib/knockai/redis';
import { getSession, unauthorized } from '@/lib/knockai/session';

export async function POST(req: NextRequest) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ ok: true, skipped: true });

  const session = getSession(req);
  if (!session) return unauthorized();

  try {
    const { userData, teamId, teamData } = await req.json();

    // Check the *previously stored* team membership before overwriting
    // anything — checking against the record we're about to write would just
    // be validating the client's claim against itself.
    let belongsToTeam = false;
    if (teamId && teamData) {
      const priorRaw = await redis.get(USER_KEY(session.email));
      const prior = priorRaw ? (typeof priorRaw === 'string' ? JSON.parse(priorRaw) : priorRaw) : null;
      belongsToTeam = prior?.user?.teamId === teamId;
    }

    // Always write under the authenticated caller's own email — the client
    // can no longer choose which account's record gets overwritten.
    await redis.set(USER_KEY(session.email), JSON.stringify(userData), { ex: 60 * 60 * 24 * 365 });

    if (teamId && teamData && belongsToTeam) {
      await redis.set(TEAM_KEY(teamId), JSON.stringify(teamData), { ex: 60 * 60 * 24 * 365 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Redis sync error:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
