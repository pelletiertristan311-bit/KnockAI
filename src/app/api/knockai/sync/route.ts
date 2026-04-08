import { NextRequest, NextResponse } from 'next/server';
import { getRedis, USER_KEY, TEAM_KEY } from '@/lib/knockai/redis';

export async function POST(req: NextRequest) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ ok: true, skipped: true });

  try {
    const { email, userData, teamId, teamData } = await req.json();
    if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });

    await redis.set(USER_KEY(email), JSON.stringify(userData), { ex: 60 * 60 * 24 * 365 });

    if (teamId && teamData) {
      await redis.set(TEAM_KEY(teamId), JSON.stringify(teamData), { ex: 60 * 60 * 24 * 365 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Redis sync error:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
