import { NextRequest, NextResponse } from 'next/server';
import { getRedis, TEAM_KEY, INVITE_KEY, USER_KEY, TTL } from '@/lib/knockai/redis';
import { getSession, unauthorized } from '@/lib/knockai/session';
import { checkRateLimit, tooManyRequests } from '@/lib/knockai/rateLimit';

export async function POST(req: NextRequest) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const session = getSession(req);
  if (!session) return unauthorized();

  // Throttle invite-code guesses per account.
  if (!(await checkRateLimit(`team-join:${session.email}`, 20, 60 * 60))) return tooManyRequests();

  try {
    const { inviteCode, user } = await req.json();
    if (!inviteCode) return NextResponse.json({ error: 'Missing invite code' }, { status: 400 });

    const inviteRaw = await redis.get(INVITE_KEY(inviteCode));
    if (!inviteRaw) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });

    const invite = typeof inviteRaw === 'string' ? JSON.parse(inviteRaw) : inviteRaw as { teamId: string; teamName: string };

    const teamRaw = await redis.get(TEAM_KEY(invite.teamId));
    if (!teamRaw) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    const teamData = typeof teamRaw === 'string' ? JSON.parse(teamRaw) : teamRaw as any;

    // Identity always comes from the authenticated session — a client can no
    // longer join a team "as" someone else's email.
    const memberEntry = { id: session.uid, fullName: user?.fullName || '', email: session.email, role: 'member', isOnline: true };
    const existingMember = (teamData.teamMembers || []).find((m: any) => m.email === session.email);
    if (!existingMember) {
      teamData.teamMembers = [...(teamData.teamMembers || []), memberEntry];
      await redis.set(TEAM_KEY(invite.teamId), JSON.stringify(teamData), { ex: TTL });
    }

    const userRaw = await redis.get(USER_KEY(session.email));
    if (userRaw) {
      const userData = typeof userRaw === 'string' ? JSON.parse(userRaw) : userRaw as any;
      if (userData.user) { userData.user.teamId = invite.teamId; userData.user.role = 'member'; }
      await redis.set(USER_KEY(session.email), JSON.stringify(userData), { ex: TTL });
    }

    return NextResponse.json({ ok: true, team: teamData.team, teamMembers: teamData.teamMembers, teamDates: teamData.teamDates || [], routes: teamData.routes || [], teamPins: teamData.teamPins || [], drawings: teamData.drawings || [] });
  } catch (err) {
    console.error('Team join error:', err);
    return NextResponse.json({ error: 'Failed to join team' }, { status: 500 });
  }
}
