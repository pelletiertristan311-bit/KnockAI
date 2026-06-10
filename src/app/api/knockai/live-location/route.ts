import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/knockai/supabase';

export async function POST(req: Request) {
  const body = await req.json();
  const { userId, teamId, lat, lng, heading } = body;
  if (!userId || !teamId || lat == null || lng == null) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

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

export async function DELETE(req: Request) {
  const body = await req.json();
  const { userId, teamId } = body;
  if (!userId || !teamId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

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
