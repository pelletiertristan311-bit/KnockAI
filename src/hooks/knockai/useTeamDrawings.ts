'use client';
import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '@/lib/knockai/supabase';

export interface TeamDrawing {
  id: string;
  teamId: string;
  userId: string;
  userName?: string;
  coordinates: [number, number][];
  color: string;
  createdAt: string;
}

function mapRowToDrawing(row: Record<string, any>): TeamDrawing {
  let coords: [number, number][] = [];
  try {
    coords = Array.isArray(row.coordinates) ? row.coordinates : JSON.parse(row.coordinates || '[]');
  } catch { coords = []; }
  return {
    id: String(row.id),
    teamId: String(row.team_id),
    userId: String(row.user_id),
    userName: row.user_name || '',
    coordinates: coords,
    color: row.color || '#EF4444',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function useTeamDrawings(teamId: string | undefined, userId: string | undefined): {
  drawings: TeamDrawing[];
  addLocalDrawing: (d: TeamDrawing) => void;
  removeLocalDrawing: (id: string) => void;
} {
  const [drawings, setDrawings] = useState<TeamDrawing[]>([]);
  const channelRef = useRef<any>(null);

  const addLocalDrawing = (d: TeamDrawing) => {
    setDrawings((prev) => [...prev.filter((x) => x.id !== d.id), d]);
  };

  const removeLocalDrawing = (id: string) => {
    setDrawings((prev) => prev.filter((x) => x.id !== id));
  };

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !teamId) return;

    supabase
      .from('drawings')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setDrawings(data.map(mapRowToDrawing));
      });

    const channel = supabase
      .channel(`knockai-drawings-${teamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drawings', filter: `team_id=eq.${teamId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const d = mapRowToDrawing(payload.new as Record<string, any>);
            setDrawings((prev) => [...prev.filter((x) => x.id !== d.id), d]);
          }
          if (payload.eventType === 'DELETE') {
            const id = String((payload.old as Record<string, any>).id);
            setDrawings((prev) => prev.filter((x) => x.id !== id));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [teamId, userId]);

  return { drawings, addLocalDrawing, removeLocalDrawing };
}
