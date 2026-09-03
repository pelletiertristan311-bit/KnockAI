import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/knockai/supabase';
import { getRedis, USER_KEY } from '@/lib/knockai/redis';
import { getSession, unauthorized } from '@/lib/knockai/session';

async function verifyTeamMembership(email: string, teamId: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true; // Redis not configured — nothing to check against locally.
  const raw = await redis.get(USER_KEY(email));
  const data = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
  return data?.user?.teamId === teamId;
}

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) return unauthorized();

  const body = await req.json();
  const { teamId, lat, lng, heading } = body;
  if (!teamId || lat == null || lng == null) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (!(await verifyTeamMembership(session.email, teamId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // Never trust a client-supplied userId — always the authenticated caller.
  const userId = session.uid;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });

  // Try UPDATE first (preserves clocked_in_at for existing sessions)
  const { data: updated } = await supabase
    .from('live_locations')
    .update({ lat, lng, heading: heading ?? null, is_active: true, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('team_id', teamId)
    .select('id');

  if (!updated || updated.length === 0) {
    // First clock-in: insert a fresh row
    const { error } = await supabase
      .from('live_locations')
      .insert({ user_id: userId, team_id: teamId, lat, lng, heading: heading ?? null, is_active: true, clocked_in_at: new Date().toISOString() });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = getSession(req);
  if (!session) return unauthorized();

  const body = await req.json();
  const { teamId } = body;
  if (!teamId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (!(await verifyTeamMembership(session.email, teamId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const userId = session.uid;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });

  const { error } = await supabase
    .from('live_locations')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('team_id', teamId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
