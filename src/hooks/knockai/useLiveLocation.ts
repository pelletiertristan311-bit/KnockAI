'use client';
import { useEffect, useRef } from 'react';
import { useKnockAIStore } from '@/lib/knockai/store';
import { getSupabaseClient } from '@/lib/knockai/supabase';

const UPDATE_INTERVAL_MS = 20_000;
const MIN_MOVE_METERS = 20;

function haversineDist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const a =
    Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Posts location to the API, routing through the SW when available so
// Background Sync can retry failed updates on network recovery.
function dispatchLocation(payload: { userId: string; teamId: string; lat: number; lng: number; heading: number | null }) {
  // Try direct fetch first; on failure, hand off to service worker for retry
  fetch('/api/knockai/live-location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {
    if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'LOCATION_UPDATE', payload });
    }
  });
}

function broadcastTeamEvent(teamId: string, event: string, payload: object) {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const ch = supabase.channel(`team:${teamId}`);
  ch.subscribe((status) => {
    if (status !== 'SUBSCRIBED') return;
    ch.send({ type: 'broadcast', event, payload }).catch(() => {});
    setTimeout(() => supabase.removeChannel(ch), 2000);
  });
}

export function useLiveLocation() {
  const isClockedIn = useKnockAIStore((s) => s.isClockedIn);
  const lastSentRef = useRef<{ lat: number; lng: number; ts: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendLocation = (lat: number, lng: number, heading?: number) => {
    const now = Date.now();
    const last = lastSentRef.current;
    if (last) {
      const dist = haversineDist(last.lat, last.lng, lat, lng);
      if (dist < MIN_MOVE_METERS && now - last.ts < UPDATE_INTERVAL_MS) return;
    }
    lastSentRef.current = { lat, lng, ts: now };

    const { user, team } = useKnockAIStore.getState();
    if (!user?.id || !team?.id) return;

    dispatchLocation({ userId: user.id, teamId: team.id, lat, lng, heading: heading ?? null });
  };

  useEffect(() => {
    if (!isClockedIn) {
      // Deactivate on clock-out + broadcast to teammates
      const { user, team } = useKnockAIStore.getState();
      if (user?.id && team?.id) {
        fetch('/api/knockai/live-location', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, teamId: team.id }),
        }).catch(() => {});
        broadcastTeamEvent(team.id, 'clock_out', { userId: user.id, userName: user.fullName || user.email || '', profilePhotoUrl: user.profilePhotoUrl });
      }
      return;
    }

    if (!navigator.geolocation) return;

    // Broadcast clock-in to all teammates
    const { user, team } = useKnockAIStore.getState();
    if (user?.id && team?.id) {
      broadcastTeamEvent(team.id, 'clock_in', { userId: user.id, userName: user.fullName || user.email || '', profilePhotoUrl: user.profilePhotoUrl });
    }

    // Immediate first fix
    navigator.geolocation.getCurrentPosition(
      (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.heading ?? undefined),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // Continuous foreground tracking
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.heading ?? undefined),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    // 20-second fallback interval — keeps updates flowing when watchPosition
    // stalls (common in iOS PWA when screen dims or app is backgrounded)
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.heading ?? undefined),
        () => {},
        { enableHighAccuracy: false, maximumAge: UPDATE_INTERVAL_MS }
      );
    }, UPDATE_INTERVAL_MS);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      lastSentRef.current = null;
    };
  }, [isClockedIn]);
}
