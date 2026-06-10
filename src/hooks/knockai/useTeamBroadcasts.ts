'use client';
import { useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/lib/knockai/supabase';

export type TeamToast = {
  id: string;
  type: 'clock_in' | 'clock_out' | 'sale';
  userName: string;
  profilePhotoUrl?: string;
  address?: string;
};

type SetToasts = React.Dispatch<React.SetStateAction<TeamToast[]>>;

// Single centralized Supabase Realtime listener for all team broadcast events.
// All broadcasts use the channel `team:{teamId}` with events: clock_in, clock_out, sale_made.
export function useTeamBroadcasts(
  teamId: string | undefined,
  currentUserId: string | undefined,
  setToasts: SetToasts
) {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !teamId || !currentUserId) return;

    const addToast = (toast: TeamToast, durationMs: number) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, durationMs);
    };

    const channel = supabase
      .channel(`team:${teamId}`)
      .on('broadcast', { event: 'clock_in' }, ({ payload }) => {
        if (!payload || payload.userId === currentUserId) return;
        addToast({
          id: `clockin-${payload.userId}-${Date.now()}`,
          type: 'clock_in',
          userName: payload.userName || 'Teammate',
          profilePhotoUrl: payload.profilePhotoUrl,
        }, 5000);
      })
      .on('broadcast', { event: 'clock_out' }, ({ payload }) => {
        if (!payload || payload.userId === currentUserId) return;
        addToast({
          id: `clockout-${payload.userId}-${Date.now()}`,
          type: 'clock_out',
          userName: payload.userName || 'Teammate',
          profilePhotoUrl: payload.profilePhotoUrl,
        }, 5000);
      })
      .on('broadcast', { event: 'sale_made' }, ({ payload }) => {
        if (!payload || payload.userId === currentUserId) return;
        addToast({
          id: `sale-${payload.userId}-${Date.now()}`,
          type: 'sale',
          userName: payload.userName || 'Teammate',
          profilePhotoUrl: payload.profilePhotoUrl,
          address: payload.address || undefined,
        }, 6000);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [teamId, currentUserId]);
}
