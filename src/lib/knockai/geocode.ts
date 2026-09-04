import { cachedFetch } from './geocodeCache';
import { reverseGeocodeQC } from './adressesQuebec';

// Shared implementation — was previously copy-pasted identically in
// MapScreen.tsx and AddPinModal.tsx.
//
// Tries "Adresses Québec" (base officielle gouvernementale) first — plus
// précise et plus à jour que Nominatim/OSM dans les zones que ce dernier
// couvre mal (ex: Vaudreuil-Soulanges). Ça ne couvre que le Québec, donc on
// retombe sur Nominatim si ça échoue ou si le point est hors Québec.
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const qc = await reverseGeocodeQC(lat, lng);
    if (qc) return qc;
  } catch { /* hors Québec ou service indisponible — repli sur Nominatim */ }

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
