// Small in-memory cache + in-flight request coalescing for OSM/Nominatim
// and Overpass calls. Nominatim/Overpass' usage policies expect light,
// well-behaved traffic (~1 req/sec) from a given client — this avoids
// re-fetching the same coordinates repeatedly (e.g. re-visiting a street,
// or two components requesting the same point at once) rather than trying
// to rate-limit calls that are already gated behind discrete user actions
// or a debounced map event.

const TTL_MS = 5 * 60 * 1000; // addresses/house numbers don't change within a session
const MAX_ENTRIES = 200;

const cache = new Map<string, { value: unknown; ts: number }>();
const inflight = new Map<string, Promise<unknown>>();

export async function cachedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.value as T;

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const promise = fetcher()
    .then((value) => {
      if (cache.size >= MAX_ENTRIES) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey !== undefined) cache.delete(oldestKey);
      }
      cache.set(key, { value, ts: Date.now() });
      return value;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}
