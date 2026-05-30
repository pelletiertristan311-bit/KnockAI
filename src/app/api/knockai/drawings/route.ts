import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/knockai/supabase';

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: true, drawings: [] });
  const teamId = req.nextUrl.searchParams.get('teamId');
  if (!teamId) return NextResponse.json({ error: 'Missing teamId' }, { status: 400 });
  try {
    const { data, error } = await supabase.from('drawings').select('*').eq('team_id', teamId).order('created_at', { ascending: true });
    if (error) return NextResponse.json({ ok: true, drawings: [] });
    const drawings = (data || []).map((row: any) => ({
      id: String(row.id),
      teamId: String(row.team_id),
      userId: String(row.user_id),
      userName: row.user_name || '',
      coordinates: Array.isArray(row.coordinates) ? row.coordinates : (() => { try { return JSON.parse(row.coordinates || '[]'); } catch { return []; } })(),
      color: row.color || '#EF4444',
      createdAt: row.created_at || new Date().toISOString(),
    }));
    return NextResponse.json({ ok: true, drawings });
  } catch {
    return NextResponse.json({ ok: true, drawings: [] });
  }
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: true, skipped: true });

  try {
    const { drawing } = await req.json();
    if (!drawing?.id || !drawing?.teamId) return NextResponse.json({ ok: true, skipped: true });

    const { error } = await supabase.from('drawings').insert({
      id: drawing.id,
      team_id: drawing.teamId,
      user_id: drawing.userId,
      user_name: drawing.userName || '',
      coordinates: drawing.coordinates,
      color: drawing.color,
      created_at: drawing.createdAt,
    });

    if (error) {
      console.error('Supabase drawing insert error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Supabase drawings POST error:', err);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: true, skipped: true });

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ ok: true, skipped: true });

    const { error } = await supabase.from('drawings').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
