'use client';
import { useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/lib/knockai/supabase';

export type ClockInToast = {
  id: string;
  userName: string;
  profilePhotoUrl?: string;
};

type SetToasts = React.Dispatch<React.SetStateAction<ClockInToast[]>>;

export function useClockInNotifications(
  teamId: string | undefined,
  currentUserId: string | undefined,
  setToasts: SetToasts
) {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !teamId || !currentUserId) return;

    const channel = supabase
      .channel(`team-clockin-${teamId}`)
      .on('broadcast', { event: 'clock_in' }, ({ payload }) => {
        // Never show a toast for your own clock-in
        if (!payload || payload.userId === currentUserId) return;

        const toast: ClockInToast = {
          id: `${payload.userId}-${Date.now()}`,
          userName: payload.userName || 'Teammate',
          profilePhotoUrl: payload.profilePhotoUrl,
        };

        setToasts((prev) => [...prev, toast]);

        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toast.id));
        }, 5000);
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
