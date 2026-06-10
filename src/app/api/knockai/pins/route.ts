import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, mapPinToRow } from '@/lib/knockai/supabase';

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: true, skipped: true });

  try {
    const body = await req.json();
    // Accept { pin } (single) or { pins } (batch)
    const pinsToSync = body.pins
      ? (body.pins as any[])
      : body.pin
      ? [body.pin]
      : [];

    if (pinsToSync.length === 0) return NextResponse.json({ ok: true, skipped: true });

    const rows = pinsToSync
      .filter((p) => p?.id && p?.teamId)
      .map(mapPinToRow);

    if (rows.length === 0) return NextResponse.json({ ok: true, skipped: true });

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
