import { NextRequest, NextResponse } from 'next/server';
import { getRedis, TEAM_KEY, USER_KEY } from '@/lib/knockai/redis';
import { getSession, unauthorized } from '@/lib/knockai/session';

export async function GET(req: NextRequest) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ ok: true, skipped: true });

  const session = getSession(req);
  if (!session) return unauthorized();

  try {
    const teamId = req.nextUrl.searchParams.get('teamId');
    if (!teamId) return NextResponse.json({ error: 'Missing teamId' }, { status: 400 });

    const ownRaw = await redis.get(USER_KEY(session.email));
    const own = ownRaw ? (typeof ownRaw === 'string' ? JSON.parse(ownRaw) : ownRaw) : null;
    if (own?.user?.teamId !== teamId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const raw = await redis.get(TEAM_KEY(teamId));
    if (!raw) return NextResponse.json({ ok: true, pins: [] });

    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return NextResponse.json({ ok: true, pins: data.teamPins || [] });
  } catch (err) {
    console.error('Team pins poll error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
