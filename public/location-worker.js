// KnockAI Service Worker — background location sync
// Receives location updates from the main app thread via postMessage and forwards
// them to the API. When the network is unavailable, queues with Background Sync
// so the update is retried automatically when connectivity returns.
//
// NOTE: Service workers do NOT have access to navigator.geolocation.
// The actual GPS polling lives in useLiveLocation.ts (watchPosition + setInterval).
// This worker acts as a resilient network relay for those location updates.

const SW_VERSION = 'knockai-location-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

let pendingPayload = null;

// Main thread sends: { type: 'LOCATION_UPDATE', payload: { userId, teamId, lat, lng, heading } }
self.addEventListener('message', (event) => {
  if (event.data?.type === 'LOCATION_UPDATE') {
    pendingPayload = event.data.payload;
    postToAPI(pendingPayload);
  }
});

// Background Sync fires when network recovers after an offline failure
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-location' && pendingPayload) {
    event.waitUntil(postToAPI(pendingPayload));
  }
});

async function postToAPI(payload) {
  if (!payload) return;
  try {
    const res = await fetch('/api/knockai/live-location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) pendingPayload = null;
  } catch {
    // Network unavailable — register background sync so this retries automatically
    try {
      await self.registration.sync.register('sync-location');
    } catch {
      // Background Sync API not supported; update will be lost if offline
    }
  }
}
