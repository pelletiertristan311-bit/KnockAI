'use client';
import { useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/lib/knockai/supabase';
import { useKnockAIStore, type TeamSign } from '@/lib/knockai/store';

export type { TeamSign };

function mapRowToSign(row: Record<string, any>): TeamSign {
  return {
    id: String(row.id),
    teamId: String(row.team_id),
    userId: String(row.user_id),
    userName: row.user_name || '',
    lat: Number(row.lat),
    lng: Number(row.lng),
    label: row.label || '',
    photoUrl: row.photo_url || undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function useTeamSigns(teamId: string | undefined, userId: string | undefined): void {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !teamId) return;

    fetch(`/api/knockai/signs?teamId=${teamId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json?.signs) return;
        const remote: TeamSign[] = json.signs;
        useKnockAIStore.setState((state) => {
          const byId = new Map(state.teamSigns.map((s) => [s.id, s]));
          remote.forEach((s) => { if (!byId.has(s.id)) byId.set(s.id, s); });
          return { teamSigns: Array.from(byId.values()) };
        });
      })
      .catch(() => {});

    const channel = supabase
      .channel(`knockai-signs-${teamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signs', filter: `team_id=eq.${teamId}` },
        (payload) => {
          const currentUserId = useKnockAIStore.getState().user?.id;

          if (payload.eventType === 'INSERT') {
            const s = mapRowToSign(payload.new as Record<string, any>);
            if (s.userId === currentUserId) return; // already added optimistically
            useKnockAIStore.setState((state) => ({
              teamSigns: [...state.teamSigns.filter((x) => x.id !== s.id), s],
            }));
          }

          if (payload.eventType === 'DELETE') {
            const id = String((payload.old as Record<string, any>).id);
            useKnockAIStore.setState((state) => ({
              teamSigns: state.teamSigns.filter((x) => x.id !== id),
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
      useKnockAIStore.setState({ teamSigns: [] });
    };
  }, [teamId, userId]);
}
