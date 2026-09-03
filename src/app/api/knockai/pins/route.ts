import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, mapPinToRow } from '@/lib/knockai/supabase';
import { getSession, unauthorized } from '@/lib/knockai/session';
import { verifyTeamMembership } from '@/lib/knockai/teamMembership';

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: true, skipped: true });

  const session = getSession(req);
  if (!session) return unauthorized();

  try {
    const body = await req.json();
    // Accept { pin } (single) or { pins } (batch)
    const pinsToSync = body.pins
      ? (body.pins as any[])
      : body.pin
      ? [body.pin]
      : [];

    if (pinsToSync.length === 0) return NextResponse.json({ ok: true, skipped: true });

    // Only ever accept pins the caller attributes to themselves, and only
    // for a team they actually belong to — otherwise any authenticated
    // caller could write pins under a teammate's name or into a team
    // they're not part of.
    const ownPins = pinsToSync.filter((p) => p?.id && p?.teamId && p?.userId === session.uid);
    const teamIds = Array.from(new Set(ownPins.map((p) => p.teamId)));
    const membership = await Promise.all(teamIds.map(async (id) => [id, await verifyTeamMembership(session.email, id)] as const));
    const allowedTeamIds = new Set(membership.filter(([, ok]) => ok).map(([id]) => id));
    const safePins = ownPins.filter((p) => allowedTeamIds.has(p.teamId));

    if (safePins.length === 0) return NextResponse.json({ ok: true, skipped: true });

    const rows = safePins.map(mapPinToRow);

    const { error } = await supabase.from('pins').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('Supabase pin upsert error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, synced: rows.length });
  } catch (err) {
    console.error('Supabase pins POST error:', err);
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

    // Look up which team this pin belongs to before allowing the delete —
    // a shared team pin board means any team member may remove it, but only
    // members of that specific team.
    const { data: existing } = await supabase.from('pins').select('team_id').eq('id', id).maybeSingle();
    if (!existing) return NextResponse.json({ ok: true });
    if (!(await verifyTeamMembership(session.email, existing.team_id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase.from('pins').delete().eq('id', id);
    if (error) {
      console.error('Supabase pin delete error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Supabase pins DELETE error:', err);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  return POST(req);
}
