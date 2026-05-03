import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/knockai/supabase';

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
