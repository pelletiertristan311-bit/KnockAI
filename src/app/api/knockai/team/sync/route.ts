import { NextRequest, NextResponse } from 'next/server';
import { getRedis, TEAM_KEY, USER_KEY, TTL } from '@/lib/knockai/redis';
import { getSession, unauthorized } from '@/lib/knockai/session';

export async function POST(req: NextRequest) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ ok: true, skipped: true });

  const session = getSession(req);
  if (!session) return unauthorized();

  try {
    const { teamId, teamMembers, teamDates, routes, team, pins, trailPoints, drawings } = await req.json();
    if (!teamId) return NextResponse.json({ error: 'Missing teamId' }, { status: 400 });

    // Verify the authenticated user actually belongs to this team before
    // letting them write anything into its shared record.
    const ownRaw = await redis.get(USER_KEY(session.email));
    const own = ownRaw ? (typeof ownRaw === 'string' ? JSON.parse(ownRaw) : ownRaw) : null;
    if (own?.user?.teamId !== teamId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const uid = session.uid;
    // Only ever accept pins/trail points/drawings the caller attributes to
    // themselves — otherwise a team member could inject or overwrite data
    // under a teammate's userId.
    const safePins = Array.isArray(pins) ? pins.filter((p: any) => p?.userId === uid) : pins;
    const safeTrail = Array.isArray(trailPoints) ? trailPoints.filter((p: any) => p?.userId === uid) : trailPoints;
    const safeDrawings = Array.isArray(drawings) ? drawings.filter((d: any) => d?.userId === uid) : drawings;

    const existing: any = await redis.get(TEAM_KEY(teamId));
    const current = existing ? (typeof existing === 'string' ? JSON.parse(existing) : existing) : {};

    // Enforce role-change permissions server-side: only the current owner
    // may grant or revoke 'owner', and only owner/manager may change any
    // role at all (never their own). A disallowed change is silently
    // reverted to the previously stored role rather than rejecting the
    // whole sync, so unrelated fields (isOnline, doorsToday, ...) still go
    // through.
    let safeTeamMembers = teamMembers;
    if (Array.isArray(teamMembers)) {
      const priorMembers = current.teamMembers || [];
      const priorById = new Map(priorMembers.map((m: any) => [m.id, m]));
      const callerRole = (priorById.get(uid) as any)?.role || 'member';

      safeTeamMembers = teamMembers.map((m: any) => {
        const prior: any = priorById.get(m.id);
        if (!prior || prior.role === m.role) return m; // new member or no role change
        const touchesOwner = m.role === 'owner' || prior.role === 'owner';
        const allowed = callerRole === 'owner' || (callerRole === 'manager' && !touchesOwner && m.id !== uid);
        return allowed ? m : { ...m, role: prior.role };
      });

      // Removal validation: anyone may remove themselves (leaving the
      // team), but only owner/manager may remove someone else. Restore
      // anyone else missing from the incoming list otherwise.
      if (callerRole !== 'owner' && callerRole !== 'manager') {
        const newIds = new Set(safeTeamMembers.map((m: any) => m.id));
        const restored = priorMembers.filter((m: any) => m.id !== uid && !newIds.has(m.id));
        safeTeamMembers = [...safeTeamMembers, ...restored];
      }
    }

    // Merge pins by userId: replace the syncing user's pins, keep all other users' pins
    let mergedPins = current.teamPins || [];
    if (safePins && safePins.length > 0) {
      mergedPins = [
        ...(current.teamPins || []).filter((p: any) => p.userId !== uid),
        ...safePins,
      ];
    }

    // Merge trailPoints by userId: same strategy
    let mergedTrail = current.trailPoints || [];
    if (safeTrail && safeTrail.length > 0) {
      mergedTrail = [
        ...(current.trailPoints || []).filter((p: any) => p.userId !== uid),
        ...safeTrail,
      ];
    }

    // Merge drawings by userId: replace syncing user's drawings, keep others'
    let mergedDrawings = current.drawings || [];
    if (safeDrawings !== undefined) {
      mergedDrawings = [
        ...(current.drawings || []).filter((d: any) => d.userId !== uid),
        ...safeDrawings,
      ];
    }

    const updated = {
      ...current,
      ...(team && { team }),
      ...(safeTeamMembers && { teamMembers: safeTeamMembers }),
      ...(teamDates && { teamDates }),
      ...(routes && { routes }),
      teamPins: mergedPins,
      trailPoints: mergedTrail,
      drawings: mergedDrawings,
    };

    await redis.set(TEAM_KEY(teamId), JSON.stringify(updated), { ex: TTL });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Team sync error:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
