import { cachedFetch } from './geocodeCache';

// "Adresses Québec" — service gouvernemental (MRNF), gratuit, sans clé API.
// Contrairement à OpenStreetMap/Nominatim/Overpass (crowdsourcé, souvent
// incomplet ou mal placé hors des centres-villes), c'est la base d'adresses
// officielle du Québec, tenue à jour en continu avec les municipalités —
// elle couvre aussi les zones où OSM a des trous (ex: Vaudreuil-Soulanges).
// Ne couvre que le Québec: en dehors, les deux fonctions retournent
// respectivement un tableau vide / null, et l'appelant retombe sur
// OSM (Overpass / Nominatim).
const AQ_HOST = 'https://servicescarto.mern.gouv.qc.ca/pes/rest/services/Territoire';
const AQ_QUERY_URL = `${AQ_HOST}/AQ_ADRESSES_WMS/MapServer/0/query`;
const AQ_REVERSE_URL = `${AQ_HOST}/Adresse_Geocodage/GeocodeServer/reverseGeocode`;

export interface CivicNumber {
  lat: number;
  lon: number;
  civic: string;
}

// Numéros civiques dans la zone visible — remplace la couche Overpass.
export async function fetchCivicNumbersQC(
  south: number,
  west: number,
  north: number,
  east: number,
  signal?: AbortSignal
): Promise<CivicNumber[]> {
  const bbox = `${west.toFixed(4)},${south.toFixed(4)},${east.toFixed(4)},${north.toFixed(4)}`;
  return cachedFetch(`aq-civic:${bbox}`, async () => {
    const params = new URLSearchParams({
      where: '1=1',
      geometry: bbox,
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'NoCivq',
      f: 'geojson',
      resultRecordCount: '2000',
    });
    const res = await fetch(`${AQ_QUERY_URL}?${params}`, { signal });
    if (!res.ok) throw new Error('adresses-quebec query failed');
    const data = await res.json();
    if (!data.features) return [];
    return (data.features as any[])
      .map((f) => {
        const civic = f.properties?.NoCivq;
        const coords = f.geometry?.coordinates;
        if (civic == null || !coords) return null;
        return { lat: coords[1], lon: coords[0], civic: String(civic) };
      })
      .filter(Boolean) as CivicNumber[];
  });
}

// Adresse formatée pour un point donné (dépose d'un pin) — même rôle que
// reverseGeocode() dans geocode.ts, mais avec les données officielles.
export async function reverseGeocodeQC(lat: number, lng: number): Promise<string | null> {
  const key = `aq-rg:${lat.toFixed(5)},${lng.toFixed(5)}`;
  return cachedFetch(key, async () => {
    const params = new URLSearchParams({
      location: JSON.stringify({ x: lng, y: lat }),
      f: 'json',
      langCode: 'fr',
    });
    const res = await fetch(`${AQ_REVERSE_URL}?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const a = data.address;
    if (!a || !a.Num) return null;
    const parts = [a.Num, a.Odonyme, a.City].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : null;
  });
}
