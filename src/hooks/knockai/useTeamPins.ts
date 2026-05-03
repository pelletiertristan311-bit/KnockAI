'use client';
import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient, mapRowToPin } from '@/lib/knockai/supabase';
import { useKnockAIStore } from '@/lib/knockai/store';

export type RealtimeStatus = 'disabled' | 'connecting' | 'live' | 'error';

export function useTeamPins(teamId: string | undefined, userId: string | undefined): RealtimeStatus {
  const channelRef = useRef<any>(null);
  const [status, setStatus] = useState<RealtimeStatus>('disabled');

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !teamId || !userId) {
      setStatus('disabled');
      return;
    }

    setStatus('connecting');

    // Load all existing team pins from Supabase on mount
    supabase
      .from('pins')
      .select('*')
      .eq('team_id', teamId)
      .order('placed_at', { ascending: true })
      .then(({ data, error }) => {
        if (error || !data) return;
        const remotePins = data.map(mapRowToPin);
        const { pins: localPins } = useKnockAIStore.getState();
        // Keep own pins from local state (optimistic), merge all teammate pins from Supabase
        const ownPins = localPins.filter((p) => p.userId === userId);
        const teammatePins = remotePins.filter((p) => p.userId !== userId);
        // Also recover own pins from Supabase that might not be in local state
        const localOwnIds = new Set(ownPins.map((p) => p.id));
        const supabaseOwnPins = remotePins.filter((p) => p.userId === userId && !localOwnIds.has(p.id));
        useKnockAIStore.setState({
          pins: [...ownPins, ...supabaseOwnPins, ...teammatePins],
        });
      });

    // Subscribe to realtime changes filtered by team_id
    const channel = supabase
      .channel(`knockai-pins-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pins',
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          const currentUserId = useKnockAIStore.getState().user?.id;

          if (payload.eventType === 'INSERT') {
            const newPin = mapRowToPin(payload.new as Record<string, any>);
            // Skip own pins — already added optimistically
            if (newPin.userId === currentUserId) return;
            useKnockAIStore.setState((state) => ({
              pins: [...state.pins.filter((p) => p.id !== newPin.id), newPin],
            }));
          }

          if (payload.eventType === 'UPDATE') {
            const updatedPin = mapRowToPin(payload.new as Record<string, any>);
            if (updatedPin.userId === currentUserId) return;
            useKnockAIStore.setState((state) => ({
              pins: state.pins.map((p) => p.id === updatedPin.id ? updatedPin : p),
            }));
          }

          if (payload.eventType === 'DELETE') {
            const deletedId = String((payload.old as Record<string, any>).id);
            const { user } = useKnockAIStore.getState();
            // Don't delete own pins from realtime (they're managed locally)
            const pinToDelete = useKnockAIStore.getState().pins.find((p) => p.id === deletedId);
            if (pinToDelete?.userId === user?.id) return;
            useKnockAIStore.setState((state) => ({
              pins: state.pins.filter((p) => p.id !== deletedId),
            }));
          }
        }
      )
      .subscribe((subStatus) => {
        if (subStatus === 'SUBSCRIBED') setStatus('live');
        else if (subStatus === 'CHANNEL_ERROR' || subStatus === 'TIMED_OUT') setStatus('error');
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setStatus('disabled');
    };
  }, [teamId, userId]);

  return status;
}
