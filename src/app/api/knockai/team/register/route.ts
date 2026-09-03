import { NextRequest, NextResponse } from 'next/server';
import { getRedis, TEAM_KEY, INVITE_KEY, TTL } from '@/lib/knockai/redis';
import { getSession, unauthorized } from '@/lib/knockai/session';

export async function POST(req: NextRequest) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const session = getSession(req);
  if (!session) return unauthorized();

  try {
    const { team, teamMembers } = await req.json();
    if (!team?.id || !team?.inviteCode) return NextResponse.json({ error: 'Missing team data' }, { status: 400 });

    // The creator is always the authenticated session's identity — a client
    // can no longer register a team under someone else's userId/email.
    const safeTeam = { ...team, ownerId: session.uid };
    const safeMembers = (teamMembers || []).map((m: any) => ({ ...m, id: session.uid, email: session.email, role: 'owner' }));

    const teamData = { team: safeTeam, teamMembers: safeMembers, teamDates: [], routes: [] };

    await Promise.all([
      redis.set(TEAM_KEY(safeTeam.id), JSON.stringify(teamData), { ex: TTL }),
      redis.set(INVITE_KEY(safeTeam.inviteCode), JSON.stringify({ teamId: safeTeam.id, teamName: safeTeam.name, ownerId: safeTeam.ownerId }), { ex: TTL }),
    ]);

    return NextResponse.json({ ok: true, team: safeTeam });
  } catch (err) {
    console.error('Team register error:', err);
    return NextResponse.json({ error: 'Failed to register team' }, { status: 500 });
  }
}
