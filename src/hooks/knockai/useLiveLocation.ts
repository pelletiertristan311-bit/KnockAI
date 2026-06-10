'use client';
import { useEffect, useRef } from 'react';
import { useKnockAIStore } from '@/lib/knockai/store';

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
      // Skip if < MIN_MOVE_METERS AND too soon since last update
      if (dist < MIN_MOVE_METERS && now - last.ts < UPDATE_INTERVAL_MS) return;
    }
    lastSentRef.current = { lat, lng, ts: now };

    const { user, team } = useKnockAIStore.getState();
    if (!user?.id || !team?.id) return;

    fetch('/api/knockai/live-location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, teamId: team.id, lat, lng, heading: heading ?? null }),
    }).catch(() => {});
  };

  useEffect(() => {
    if (!isClockedIn) {
      // Deactivate when clocked out
      const { user, team } = useKnockAIStore.getState();
      if (user?.id && team?.id) {
        fetch('/api/knockai/live-location', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, teamId: team.id }),
        }).catch(() => {});
      }
      return;
    }

    if (!navigator.geolocation) return;

    // Immediate first fix
    navigator.geolocation.getCurrentPosition(
      (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.heading ?? undefined),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // watchPosition for ongoing foreground updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.heading ?? undefined),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    // Fallback interval: ensures updates even if watchPosition stalls (e.g. iOS PWA background)
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
