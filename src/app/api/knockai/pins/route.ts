import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, mapPinToRow } from '@/lib/knockai/supabase';

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: true, skipped: true });

  try {
    const { pin } = await req.json();
    if (!pin?.id || !pin?.teamId) return NextResponse.json({ ok: true, skipped: true });

    const { error } = await supabase.from('pins').upsert(mapPinToRow(pin), { onConflict: 'id' });
    if (error) {
      console.error('Supabase pin upsert error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Supabase pins POST error:', err);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: true, skipped: true });

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ ok: true, skipped: true });

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
