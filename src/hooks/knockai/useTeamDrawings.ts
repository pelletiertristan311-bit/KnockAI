'use client';
import { useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/lib/knockai/supabase';
import { useKnockAIStore, type TeamDrawing } from '@/lib/knockai/store';

export type { TeamDrawing };

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

export function useTeamDrawings(teamId: string | undefined, userId: string | undefined): void {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !teamId) return;

    // Initial load: merge all team drawings into the store
    supabase
      .from('drawings')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error || !data) return;
        const remote = data.map(mapRowToDrawing);
        useKnockAIStore.setState((state) => {
          const byId = new Map(state.teamDrawings.map((d) => [d.id, d]));
          remote.forEach((d) => { if (!byId.has(d.id)) byId.set(d.id, d); });
          return { teamDrawings: Array.from(byId.values()) };
        });
      });

    const channel = supabase
      .channel(`knockai-drawings-${teamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drawings', filter: `team_id=eq.${teamId}` },
        (payload) => {
          const currentUserId = useKnockAIStore.getState().user?.id;

          if (payload.eventType === 'INSERT') {
            const d = mapRowToDrawing(payload.new as Record<string, any>);
            // Skip own drawings — already added optimistically via addTeamDrawing
            if (d.userId === currentUserId) return;
            useKnockAIStore.setState((state) => ({
              teamDrawings: [...state.teamDrawings.filter((x) => x.id !== d.id), d],
            }));
          }

          if (payload.eventType === 'DELETE') {
            const id = String((payload.old as Record<string, any>).id);
            useKnockAIStore.setState((state) => ({
              teamDrawings: state.teamDrawings.filter((x) => x.id !== id),
            }));
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
}
