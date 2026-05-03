import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('xxx')) return null;
  if (!_client) {
    _client = createClient(url, key, {
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return _client;
}

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('xxx')) return null;
  return createClient(url, key);
}

export function mapRowToPin(row: Record<string, any>) {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    placedByName: row.placed_by_name || '',
    teamId: row.team_id ? String(row.team_id) : undefined,
    lat: Number(row.lat),
    lng: Number(row.lng),
    address: row.address || '',
    type: row.status as 'sale' | 'not_interested' | 'call_back' | 'ai_knocked',
    notes: row.notes || undefined,
    placedByAi: Boolean(row.placed_by_ai),
    placedAt: row.placed_at || row.created_at || new Date().toISOString(),
  };
}

export function mapPinToRow(pin: Record<string, any>) {
  return {
    id: pin.id,
    team_id: pin.teamId,
    user_id: pin.userId,
    placed_by_name: pin.placedByName,
    lat: pin.lat,
    lng: pin.lng,
    status: pin.type,
    address: pin.address,
    notes: pin.notes || null,
    placed_by_ai: pin.placedByAi || false,
    placed_at: pin.placedAt,
  };
}
