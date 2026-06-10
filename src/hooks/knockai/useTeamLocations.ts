'use client';
import { useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/lib/knockai/supabase';
import { useKnockAIStore, type LiveLocation } from '@/lib/knockai/store';

function rowToLoc(row: Record<string, any>): LiveLocation {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    teamId: String(row.team_id),
    lat: Number(row.lat),
    lng: Number(row.lng),
    heading: row.heading != null ? Number(row.heading) : undefined,
    isActive: Boolean(row.is_active),
    clockedInAt: row.clocked_in_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export function useTeamLocations(teamId: string | undefined, userId: string | undefined) {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !teamId || !userId) {
      useKnockAIStore.setState({ liveLocations: [] });
      return;
    }

    // Initial load of active teammates
    supabase
      .from('live_locations')
      .select('*')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .then(({ data }) => {
        if (!data) return;
        const locs = data.filter((r) => r.user_id !== userId).map(rowToLoc);
        useKnockAIStore.setState({ liveLocations: locs });
      });

    // Realtime subscription
    const channel = supabase
      .channel(`knockai-livelocations-${teamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_locations', filter: `team_id=eq.${teamId}` },
        (payload) => {
          const currentUserId = useKnockAIStore.getState().user?.id;

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as Record<string, any>;
            if (row.user_id === currentUserId) return;

            const loc = rowToLoc(row);

            if (!loc.isActive) {
              useKnockAIStore.setState((state) => ({
                liveLocations: state.liveLocations.filter((l) => l.userId !== loc.userId),
              }));
            } else {
              useKnockAIStore.setState((state) => ({
                liveLocations: [
                  ...state.liveLocations.filter((l) => l.userId !== loc.userId),
                  loc,
                ],
              }));
            }
          }

          if (payload.eventType === 'DELETE') {
            const row = payload.old as Record<string, any>;
            useKnockAIStore.setState((state) => ({
              liveLocations: state.liveLocations.filter((l) => l.userId !== String(row.user_id)),
            }));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      useKnockAIStore.setState({ liveLocations: [] });
    };
  }, [teamId, userId]);
}
