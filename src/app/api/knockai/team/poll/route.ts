import { NextRequest, NextResponse } from 'next/server';
import { getRedis, TEAM_KEY } from '@/lib/knockai/redis';

export async function GET(req: NextRequest) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ ok: true, skipped: true });

  try {
    const teamId = req.nextUrl.searchParams.get('teamId');
    if (!teamId) return NextResponse.json({ error: 'Missing teamId' }, { status: 400 });

    const raw = await redis.get(TEAM_KEY(teamId));
    if (!raw) return NextResponse.json({ ok: true, data: null });

    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error('Team poll error:', err);
    return NextResponse.json({ error: 'Poll failed' }, { status: 500 });
  }
}
