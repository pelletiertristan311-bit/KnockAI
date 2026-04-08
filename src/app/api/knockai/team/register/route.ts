import { NextRequest, NextResponse } from 'next/server';
import { getRedis, TEAM_KEY, INVITE_KEY, TTL } from '@/lib/knockai/redis';

export async function POST(req: NextRequest) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  try {
    const { team, teamMembers } = await req.json();
    if (!team?.id || !team?.inviteCode) return NextResponse.json({ error: 'Missing team data' }, { status: 400 });

    const teamData = { team, teamMembers: teamMembers || [], chatMessages: [], routes: [] };

    await Promise.all([
      redis.set(TEAM_KEY(team.id), JSON.stringify(teamData), { ex: TTL }),
      redis.set(INVITE_KEY(team.inviteCode), JSON.stringify({ teamId: team.id, teamName: team.name, ownerId: team.ownerId }), { ex: TTL }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Team register error:', err);
    return NextResponse.json({ error: 'Failed to register team' }, { status: 500 });
  }
}
