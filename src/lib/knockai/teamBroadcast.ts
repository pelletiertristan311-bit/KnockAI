// Singleton channel reference for instant team broadcast.
// The channel is set by useTeamPins when Supabase subscription is active.
let _channel: any = null;
let _ready = false;

export function setTeamBroadcastChannel(ch: any) { _channel = ch; }
export function setTeamBroadcastReady(ready: boolean) { _ready = ready; }
export function clearTeamBroadcastChannel() { _channel = null; _ready = false; }

/** Fire-and-forget broadcast to all connected team members. */
export function broadcastPinEvent(event: 'pin_upsert' | 'pin_delete', payload: Record<string, any>) {
  if (_channel && _ready) {
    _channel.send({ type: 'broadcast', event, payload }).catch(() => {});
  }
}
