'use client';
import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient, mapRowToPin } from '@/lib/knockai/supabase';
import { useKnockAIStore, type PinNotification } from '@/lib/knockai/store';

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

    const fetchAllPins = () => {
      supabase
        .from('pins')
        .select('*')
        .eq('team_id', teamId)
        .order('placed_at', { ascending: true })
        .then(({ data, error }) => {
          if (error || !data) return;
          const remotePins = data.map(mapRowToPin);
          const { pins: localPins } = useKnockAIStore.getState();
          const byId = new Map<string, typeof remotePins[0]>(remotePins.map((p) => [p.id, p]));
          localPins.forEach((p) => { if (!byId.has(p.id)) byId.set(p.id, p as typeof remotePins[0]); });
          useKnockAIStore.setState({ pins: Array.from(byId.values()) });
        });
    };

    // Load ALL team pins from Supabase on mount
    fetchAllPins();

    // Refetch all pins when app comes back to foreground (covers background/closed case)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchAllPins();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Realtime — every change visible to everyone instantly
    const channel = supabase
      .channel(`knockai-pins-${teamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pins', filter: `team_id=eq.${teamId}` },
        (payload) => {
          const currentUserId = useKnockAIStore.getState().user?.id;

          if (payload.eventType === 'INSERT') {
            const newPin = mapRowToPin(payload.new as Record<string, any>);
            // Skip own insert — already added optimistically in store.addPin
            if (newPin.userId === currentUserId) return;
            useKnockAIStore.setState((state) => ({
              pins: [...state.pins.filter((p) => p.id !== newPin.id), newPin],
            }));
            // In-app notification
            const notif: PinNotification = {
              id: `pinnotif-${Date.now()}-${newPin.id}`,
              memberName: newPin.placedByName,
              address: newPin.address || `${newPin.lat.toFixed(4)}, ${newPin.lng.toFixed(4)}`,
              pinType: newPin.type,
              timestamp: new Date().toISOString(),
            };
            useKnockAIStore.setState((state) => ({
              pinNotifications: [...state.pinNotifications.slice(-4), notif],
            }));
            setTimeout(() => useKnockAIStore.getState().dismissPinNotification(notif.id), 6000);
          }

          if (payload.eventType === 'UPDATE') {
            // Process all updates — including own (handles multi-device scenario)
            const updatedPin = mapRowToPin(payload.new as Record<string, any>);
            useKnockAIStore.setState((state) => ({
              pins: state.pins.map((p) => (p.id === updatedPin.id ? updatedPin : p)),
            }));
          }

          if (payload.eventType === 'DELETE') {
            // Process all deletes — everyone loses the pin immediately
            const deletedId = String((payload.old as Record<string, any>).id);
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
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setStatus('disabled');
    };
  }, [teamId, userId]);

  return status;
}
