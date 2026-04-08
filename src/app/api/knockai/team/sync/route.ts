import { NextRequest, NextResponse } from 'next/server';
import { getRedis, TEAM_KEY, TTL } from '@/lib/knockai/redis';

export async function POST(req: NextRequest) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ ok: true, skipped: true });

  try {
    const { teamId, teamMembers, chatMessages, routes, team } = await req.json();
    if (!teamId) return NextResponse.json({ error: 'Missing teamId' }, { status: 400 });

    const existing: any = await redis.get(TEAM_KEY(teamId));
    const current = existing ? (typeof existing === 'string' ? JSON.parse(existing) : existing) : {};

    const updated = {
      ...current,
      ...(team && { team }),
      ...(teamMembers && { teamMembers }),
      ...(chatMessages && { chatMessages }),
      ...(routes && { routes }),
    };

    await redis.set(TEAM_KEY(teamId), JSON.stringify(updated), { ex: TTL });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Team sync error:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
