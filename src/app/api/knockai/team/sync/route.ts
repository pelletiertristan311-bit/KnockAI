import { NextRequest, NextResponse } from 'next/server';
import { getRedis, TEAM_KEY, TTL } from '@/lib/knockai/redis';

export async function POST(req: NextRequest) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ ok: true, skipped: true });

  try {
    const { teamId, teamMembers, teamDates, routes, team, pins, trailPoints } = await req.json();
    if (!teamId) return NextResponse.json({ error: 'Missing teamId' }, { status: 400 });

    const existing: any = await redis.get(TEAM_KEY(teamId));
    const current = existing ? (typeof existing === 'string' ? JSON.parse(existing) : existing) : {};

    // Merge pins by userId: replace the syncing user's pins, keep all other users' pins
    let mergedPins = current.teamPins || [];
    if (pins && pins.length >= 0) {
      const incomingUserIds = new Set((pins as any[]).map((p) => p.userId).filter(Boolean));
      mergedPins = [
        ...(current.teamPins || []).filter((p: any) => !incomingUserIds.has(p.userId)),
        ...pins,
      ];
    }

    // Merge trailPoints by userId: same strategy
    let mergedTrail = current.trailPoints || [];
    if (trailPoints && trailPoints.length >= 0) {
      const incomingTrailUserIds = new Set((trailPoints as any[]).map((p) => p.userId).filter(Boolean));
      mergedTrail = [
        ...(current.trailPoints || []).filter((p: any) => !incomingTrailUserIds.has(p.userId)),
        ...trailPoints,
      ];
    }

    const updated = {
      ...current,
      ...(team && { team }),
      ...(teamMembers && { teamMembers }),
      ...(teamDates && { teamDates }),
      ...(routes && { routes }),
      teamPins: mergedPins,
      trailPoints: mergedTrail,
    };

    await redis.set(TEAM_KEY(teamId), JSON.stringify(updated), { ex: TTL });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Team sync error:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
