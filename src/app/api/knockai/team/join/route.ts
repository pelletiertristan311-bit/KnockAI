import { NextRequest, NextResponse } from 'next/server';
import { getRedis, TEAM_KEY, INVITE_KEY, USER_KEY, TTL } from '@/lib/knockai/redis';

export async function POST(req: NextRequest) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  try {
    const { inviteCode, user } = await req.json();
    if (!inviteCode || !user?.email) return NextResponse.json({ error: 'Missing invite code or user' }, { status: 400 });

    const inviteRaw = await redis.get(INVITE_KEY(inviteCode));
    if (!inviteRaw) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });

    const invite = typeof inviteRaw === 'string' ? JSON.parse(inviteRaw) : inviteRaw as { teamId: string; teamName: string };

    const teamRaw = await redis.get(TEAM_KEY(invite.teamId));
    if (!teamRaw) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    const teamData = typeof teamRaw === 'string' ? JSON.parse(teamRaw) : teamRaw as any;

    const existingMember = (teamData.teamMembers || []).find((m: any) => m.email === user.email);
    if (!existingMember) {
      teamData.teamMembers = [
        ...(teamData.teamMembers || []),
        { id: user.id, fullName: user.fullName, email: user.email, role: 'member', isOnline: true },
      ];
      await redis.set(TEAM_KEY(invite.teamId), JSON.stringify(teamData), { ex: TTL });
    }

    const userRaw = await redis.get(USER_KEY(user.email.toLowerCase()));
    if (userRaw) {
      const userData = typeof userRaw === 'string' ? JSON.parse(userRaw) : userRaw as any;
      if (userData.user) { userData.user.teamId = invite.teamId; userData.user.role = 'member'; }
      await redis.set(USER_KEY(user.email.toLowerCase()), JSON.stringify(userData), { ex: TTL });
    }

    return NextResponse.json({ ok: true, team: teamData.team, teamMembers: teamData.teamMembers, chatMessages: teamData.chatMessages || [], routes: teamData.routes || [] });
  } catch (err) {
    console.error('Team join error:', err);
    return NextResponse.json({ error: 'Failed to join team' }, { status: 500 });
  }
}
