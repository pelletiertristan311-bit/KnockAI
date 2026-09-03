import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/knockai/supabase';
import { getSession, unauthorized } from '@/lib/knockai/session';
import { verifyTeamMembership } from '@/lib/knockai/teamMembership';
import { getRedis, USER_KEY } from '@/lib/knockai/redis';

// Only managers/owners may place or remove signs — matches the client's own
// "only managers and owners can place signs" gating, enforced here too so
// it can't be bypassed by calling the API directly.
async function isManagerOrOwner(email: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;
  const raw = await redis.get(USER_KEY(email));
  const data = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
  const role = data?.user?.role;
  return role === 'manager' || role === 'owner';
}

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: true, signs: [] });

  const session = getSession(req);
  if (!session) return unauthorized();

  const teamId = req.nextUrl.searchParams.get('teamId');
  if (!teamId) return NextResponse.json({ error: 'Missing teamId' }, { status: 400 });
  if (!(await verifyTeamMembership(session.email, teamId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { data, error } = await supabase.from('signs').select('*').eq('team_id', teamId).order('created_at', { ascending: true });
    if (error) return NextResponse.json({ ok: true, signs: [] });
    const signs = (data || []).map((row: any) => ({
      id: String(row.id),
      teamId: String(row.team_id),
      userId: String(row.user_id),
      userName: row.user_name || '',
      lat: Number(row.lat),
      lng: Number(row.lng),
      label: row.label || '',
      createdAt: row.created_at || new Date().toISOString(),
    }));
    return NextResponse.json({ ok: true, signs });
  } catch {
    return NextResponse.json({ ok: true, signs: [] });
  }
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: true, skipped: true });

  const session = getSession(req);
  if (!session) return unauthorized();

  try {
    const { sign } = await req.json();
    if (!sign?.id || !sign?.teamId || sign.lat == null || sign.lng == null) return NextResponse.json({ ok: true, skipped: true });
    if (sign.userId !== session.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!(await verifyTeamMembership(session.email, sign.teamId)) || !(await isManagerOrOwner(session.email))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase.from('signs').insert({
      id: sign.id,
      team_id: sign.teamId,
      user_id: sign.userId,
      user_name: sign.userName || '',
      lat: sign.lat,
      lng: sign.lng,
      label: sign.label || '',
      created_at: sign.createdAt,
    });

    if (error) {
      console.error('Supabase sign insert error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Supabase signs POST error:', err);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: true, skipped: true });

  const session = getSession(req);
  if (!session) return unauthorized();

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ ok: true, skipped: true });

    const { data: existing } = await supabase.from('signs').select('team_id').eq('id', id).maybeSingle();
    if (!existing) return NextResponse.json({ ok: true });
    if (!(await verifyTeamMembership(session.email, existing.team_id)) || !(await isManagerOrOwner(session.email))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase.from('signs').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
