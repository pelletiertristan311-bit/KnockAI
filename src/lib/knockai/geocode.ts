import { cachedFetch } from './geocodeCache';

// Shared implementation — was previously copy-pasted identically in
// MapScreen.tsx and AddPinModal.tsx.
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = `rg:${lat.toFixed(5)},${lng.toFixed(5)}`;
  try {
    return await cachedFetch(key, async () => {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, { headers: { 'Accept-Language': 'fr', 'User-Agent': 'KnockAI/1.0' } });
      const data = await res.json();
      const a = data.address || {};
      const parts = [a.house_number, a.road || a.street, a.city || a.town || a.village || a.municipality].filter(Boolean);
      return parts.length > 0 ? parts.join(' ') : (data.display_name?.split(',')[0] || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    });
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}
