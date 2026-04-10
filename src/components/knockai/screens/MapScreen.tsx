'use client';
import { useEffect, useRef, useState, useMemo } from 'react';
import { useKnockAIStore, Pin, PinType } from '@/lib/knockai/store';

function haversineDist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (v: number) => v * Math.PI / 180;
  const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const QUICK_PIN_TYPES: { type: PinType; label: string; icon: string; color: string }[] = [
  { type: 'sale', label: 'Vente', icon: '✓', color: '#34D399' },
  { type: 'not_interested', label: 'Non', icon: '✕', color: '#EF4444' },
  { type: 'call_back', label: 'Rappel', icon: '?', color: '#F59E0B' },
  { type: 'ai_knocked', label: 'IA', icon: 'AI', color: '#3B82F6' },
];

const PIN_COLORS: Record<PinType, string> = { sale: '#34D399', not_interested: '#EF4444', call_back: '#F59E0B', ai_knocked: '#3B82F6' };
const PIN_ICONS: Record<PinType, string> = { sale: '✓', not_interested: '✕', call_back: '?', ai_knocked: 'AI' };

export default function MapScreen() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const maplibreRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const routeMarkersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const teammateMarkersRef = useRef<any[]>([]);
  const [followMode, setFollowMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState('');
  const [heading, setHeading] = useState<number | null>(null);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [routeType, setRouteType] = useState<'individual' | 'team'>('individual');
  const [routeLockedMsg, setRouteLockedMsg] = useState('');
  const [quickPinCoords, setQuickPinCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [mapStyleVersion, setMapStyleVersion] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showTrailPanel, setShowTrailPanel] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const isErasingRef = useRef(false);
  const lastTrailRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const [showAIRoute, setShowAIRoute] = useState(false);
  const [showRoutesList, setShowRoutesList] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<string | null>(null);
  const saleFlashMarkersRef = useRef<any[]>([]);
  const prevSaleNotifCountRef = useRef(0);
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false);
  const drawingPointsRef = useRef<[number, number][]>([]);
  const drawDotMarkersRef = useRef<any[]>([]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  const { pins, routes, userLocation, pinFilter, aiEnabled, teamMembers, user, team, setUserLocation, setPinFilter, toggleAI, openAddPinModal, openEditPinModal, addPin, isClockedIn, addRoute, deleteRoute, mapTheme, trailPoints, trailView, addTrailPoint, removeTrailPointsNear, clearMyTrail, setTrailView, saleNotifications } = useKnockAIStore();

  const filteredPins = useMemo(() => pinFilter === 'all' ? pins : pins.filter((p) => p.type === pinFilter), [pins, pinFilter]);
  const searchResults = useMemo(() => searchQuery ? pins.filter((p) => p.leadName?.toLowerCase().includes(searchQuery.toLowerCase()) || p.address.toLowerCase().includes(searchQuery.toLowerCase())) : [], [pins, searchQuery]);
  const isManagerOrOwner = user?.role === 'manager' || user?.role === 'owner';

  const aiSuggestion = useMemo(() => {
    if (pins.length < 3) return null;
    const recent = pins.filter((p) => { const d = new Date(p.placedAt); const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7); return d >= cutoff; });
    if (recent.length < 3) return null;
    const CELL = 0.001;
    const grid: Record<string, { lat: number; lng: number; doors: number; sales: number }> = {};
    recent.forEach((p) => {
      const key = `${Math.round(p.lat / CELL)},${Math.round(p.lng / CELL)}`;
      if (!grid[key]) grid[key] = { lat: p.lat, lng: p.lng, doors: 0, sales: 0 };
      grid[key].doors++;
      if (p.type === 'sale') grid[key].sales++;
    });
    const cells = Object.values(grid);
    if (!cells.length) return null;
    const best = cells.reduce((a, b) => (b.sales * 3 + b.doors) > (a.sales * 3 + a.doors) ? b : a);
    return { lat: best.lat, lng: best.lng, doors: best.doors, sales: best.sales, convRate: best.doors > 0 ? Math.round((best.sales / best.doors) * 100) : 0 };
  }, [pins]);

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, { headers: { 'Accept-Language': 'fr', 'User-Agent': 'KnockAI/1.0' } });
      const data = await res.json();
      const a = data.address || {};
      const parts = [a.house_number, a.road || a.street, a.city || a.town || a.village || a.municipality].filter(Boolean);
      return parts.length > 0 ? parts.join(' ') : data.display_name?.split(',')[0] || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch { return `${lat.toFixed(4)}, ${lng.toFixed(4)}`; }
  };

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    import('maplibre-gl').then((ml) => {
      maplibreRef.current = ml;
      if (!document.getElementById('maplibre-css')) {
        const link = document.createElement('link');
        link.id = 'maplibre-css'; link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css';
        document.head.appendChild(link);
      }
      const { userLocation: initLoc, mapTheme: initTheme } = useKnockAIStore.getState();
      const initCenter: [number, number] = initLoc ? [initLoc.lng, initLoc.lat] : [-73.5673, 45.5017];
      const styleUrl = initTheme === 'dark' ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
      try {
        const map = new ml.Map({ container: mapRef.current!, style: styleUrl, center: initCenter, zoom: 15, attributionControl: false });
        let loaded = false;
        map.on('load', () => {
          loaded = true;
          try { map.setPaintProperty('water', 'fill-color', '#C5E8FF'); } catch (_) {}
          try { map.setPaintProperty('waterway', 'line-color', '#C5E8FF'); } catch (_) {}
          ['park', 'landuse_park', 'landcover_grass', 'grass', 'landuse_grass', 'landuse-park'].forEach((layer) => { try { map.setPaintProperty(layer, 'fill-color', '#adc4ad'); } catch (_) {} });
          map.addSource('routes-data', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
          map.addLayer({ id: 'routes-fill', type: 'fill', source: 'routes-data', paint: { 'fill-color': '#8B5CF6', 'fill-opacity': 0.18 } });
          map.addLayer({ id: 'routes-outline', type: 'line', source: 'routes-data', paint: { 'line-color': '#8B5CF6', 'line-width': 2.5, 'line-opacity': 0.9 } });
          map.addSource('draw-preview', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
          map.addLayer({ id: 'draw-fill', type: 'fill', source: 'draw-preview', paint: { 'fill-color': '#8B5CF6', 'fill-opacity': 0.12 } });
          map.addLayer({ id: 'draw-outline', type: 'line', source: 'draw-preview', paint: { 'line-color': '#8B5CF6', 'line-width': 2, 'line-dasharray': [3, 2] } });
          map.addSource('trail-data', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
          map.addLayer({ id: 'trail-line', type: 'line', source: 'trail-data', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['case', ['==', ['get', 'isOwn'], true], '#EF4444', '#8B5CF6'], 'line-width': 3, 'line-opacity': 0.8 } });
          setMapLoaded(true);
          setMapStyleVersion((v) => v + 1);
          map.on('click', (e: any) => {
            if (isErasingRef.current) { useKnockAIStore.getState().removeTrailPointsNear(e.lngLat.lat, e.lngLat.lng, 60); return; }
            if (isDrawingRef.current) {
              const pt: [number, number] = [e.lngLat.lng, e.lngLat.lat];
              const next = [...drawingPointsRef.current, pt];
              drawingPointsRef.current = next;
              setDrawingPoints([...next]);
            } else {
              setQuickPinCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
            }
          });
          map.on('dragstart', () => setFollowMode(false));
        });
        map.on('error', () => { if (!loaded) setMapError('Map style failed to load'); });
        mapInstance.current = map;
      } catch { setMapError('Map initialization failed'); }
    }).catch(() => setMapError('MapLibre GL could not be loaded'));
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !mapLoaded) return;
    const map = mapInstance.current;
    const styleUrl = mapTheme === 'dark' ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
    map.setStyle(styleUrl);
    map.once('style.load', () => {
      if (mapTheme === 'light') {
        try { map.setPaintProperty('water', 'fill-color', '#C5E8FF'); } catch (_) {}
        ['park', 'landuse_park', 'landcover_grass', 'grass'].forEach((l) => { try { map.setPaintProperty(l, 'fill-color', '#adc4ad'); } catch (_) {} });
      }
      map.addSource('routes-data', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'routes-fill', type: 'fill', source: 'routes-data', paint: { 'fill-color': '#8B5CF6', 'fill-opacity': 0.18 } });
      map.addLayer({ id: 'routes-outline', type: 'line', source: 'routes-data', paint: { 'line-color': '#8B5CF6', 'line-width': 2.5, 'line-opacity': 0.9 } });
      map.addSource('draw-preview', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'draw-fill', type: 'fill', source: 'draw-preview', paint: { 'fill-color': '#8B5CF6', 'fill-opacity': 0.12 } });
      map.addLayer({ id: 'draw-outline', type: 'line', source: 'draw-preview', paint: { 'line-color': '#8B5CF6', 'line-width': 2, 'line-dasharray': [3, 2] } });
      map.addSource('trail-data', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'trail-line', type: 'line', source: 'trail-data', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['case', ['==', ['get', 'isOwn'], true], '#EF4444', '#8B5CF6'], 'line-width': 3, 'line-opacity': 0.8 } });
      setMapStyleVersion((v) => v + 1);
    });
  }, [mapTheme, mapLoaded]);

  useEffect(() => {
    if (!mapInstance.current || !mapLoaded || !maplibreRef.current) return;
    const ml = maplibreRef.current;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    filteredPins.forEach((pin) => {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'width:40px;height:40px;cursor:pointer;';
      const inner = document.createElement('div');
      inner.style.cssText = `width:40px;height:40px;border-radius:50%;background:${PIN_COLORS[pin.type]};border:3px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:${pin.type === 'ai_knocked' ? '10px' : '16px'};box-shadow:0 2px 8px ${PIN_COLORS[pin.type]}66;font-family:Inter,sans-serif;transition:transform 0.15s;`;
      inner.textContent = PIN_ICONS[pin.type];
      wrapper.appendChild(inner);
      wrapper.addEventListener('mouseenter', () => { inner.style.transform = 'scale(1.2)'; });
      wrapper.addEventListener('mouseleave', () => { inner.style.transform = 'scale(1)'; });
      wrapper.addEventListener('click', (e) => { e.stopPropagation(); openEditPinModal(pin); });
      markersRef.current.push(new ml.Marker({ element: wrapper }).setLngLat([pin.lng, pin.lat]).addTo(mapInstance.current!));
    });
  }, [filteredPins, mapLoaded]);

  useEffect(() => {
    if (!mapInstance.current || mapStyleVersion === 0) return;
    const src = mapInstance.current.getSource('routes-data');
    if (!src) return;
    const features = routes.filter((r) => r.polygon && r.polygon.length >= 3).map((r) => ({ type: 'Feature' as const, properties: { name: r.name }, geometry: { type: 'Polygon' as const, coordinates: [[...r.polygon!, r.polygon![0]]] } }));
    src.setData({ type: 'FeatureCollection', features });
    routeMarkersRef.current.forEach((m) => m.remove());
    routeMarkersRef.current = [];
    if (!maplibreRef.current) return;
    const ml = maplibreRef.current;
    routes.filter((r) => r.polygon && r.polygon.length >= 3).forEach((route) => {
      const lngs = route.polygon!.map((p) => p[0]);
      const lats = route.polygon!.map((p) => p[1]);
      const el = document.createElement('div');
      el.style.cssText = 'padding:6px 14px;border-radius:20px;background:rgba(139,92,246,0.92);color:white;font-size:13px;font-weight:800;white-space:nowrap;border:2px solid rgba(255,255,255,0.35);';
      el.textContent = route.name;
      routeMarkersRef.current.push(new ml.Marker({ element: el }).setLngLat([lngs.reduce((a, b) => a + b, 0) / lngs.length, lats.reduce((a, b) => a + b, 0) / lats.length]).addTo(mapInstance.current!));
    });
  }, [routes, mapStyleVersion]);

  useEffect(() => {
    if (!mapInstance.current || mapStyleVersion === 0) return;
    const src = mapInstance.current.getSource('draw-preview');
    if (!src) return;
    const pts = drawingPoints;
    if (pts.length < 2) { src.setData({ type: 'FeatureCollection', features: [] }); return; }
    const geom = pts.length >= 3 ? { type: 'Polygon' as const, coordinates: [[...pts, pts[0]]] } : { type: 'LineString' as const, coordinates: pts };
    src.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: geom }] });
    drawDotMarkersRef.current.forEach((m) => m.remove());
    drawDotMarkersRef.current = [];
    if (!maplibreRef.current) return;
    const ml = maplibreRef.current;
    pts.forEach((pt, i) => {
      const el = document.createElement('div');
      el.style.cssText = `width:${i === 0 ? 14 : 10}px;height:${i === 0 ? 14 : 10}px;border-radius:50%;background:${i === 0 ? '#fff' : '#8B5CF6'};border:2px solid #8B5CF6;`;
      drawDotMarkersRef.current.push(new ml.Marker({ element: el }).setLngLat(pt).addTo(mapInstance.current!));
    });
  }, [drawingPoints, mapStyleVersion]);

  useEffect(() => {
    if (!mapInstance.current || mapStyleVersion === 0) return;
    const src = mapInstance.current.getSource('trail-data');
    if (!src) return;
    if (trailView === 'off') { src.setData({ type: 'FeatureCollection', features: [] }); return; }
    const myId = user?.id;
    const byUser: Record<string, { lat: number; lng: number; timestamp: string }[]> = {};
    trailPoints.forEach((p) => { if (trailView === 'mine' && p.userId !== myId) return; if (!byUser[p.userId]) byUser[p.userId] = []; byUser[p.userId].push(p); });
    const features = Object.entries(byUser).filter(([, pts]) => pts.length >= 2).map(([uid, pts]) => {
      const sorted = [...pts].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      return { type: 'Feature' as const, properties: { isOwn: uid === myId }, geometry: { type: 'LineString' as const, coordinates: sorted.map((p) => [p.lng, p.lat]) } };
    });
    src.setData({ type: 'FeatureCollection', features });
  }, [trailPoints, trailView, mapStyleVersion, user?.id]);

  useEffect(() => {
    if (!mapInstance.current || !mapLoaded || !maplibreRef.current) return;
    const ml = maplibreRef.current;
    teammateMarkersRef.current.forEach((m) => m.remove());
    teammateMarkersRef.current = [];
    teamMembers.filter((m) => m.lat && m.lng && m.isOnline).forEach((member) => {
      const el = document.createElement('div');
      el.style.cssText = 'width:36px;height:36px;border-radius:50%;background:#8B5CF6;border:3px solid #fff;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 0 12px rgba(139,92,246,0.6);';
      el.textContent = member.fullName.charAt(0);
      teammateMarkersRef.current.push(new ml.Marker({ element: el }).setLngLat([member.lng!, member.lat!]).addTo(mapInstance.current!));
    });
  }, [teamMembers, mapLoaded]);

  useEffect(() => {
    if (!navigator.geolocation) { setUserLocation({ lat: 45.5017, lng: -73.5673 }); return; }
    const id = navigator.geolocation.watchPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserLocation({ lat: 45.5017, lng: -73.5673 }),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !mapLoaded || !userLocation || !maplibreRef.current) return;
    const ml = maplibreRef.current;
    if (userMarkerRef.current) userMarkerRef.current.remove();
    const el = document.createElement('div');
    el.style.cssText = 'position:relative;width:36px;height:36px;';
    el.innerHTML = `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:36px;height:36px;border-radius:50%;background:rgba(0,102,204,0.2);animation:pulseUser 2s ease-in-out infinite;"></div><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:16px;height:16px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 2px 8px rgba(0,102,204,0.5);"></div>`;
    userMarkerRef.current = new ml.Marker({ element: el }).setLngLat([userLocation.lng, userLocation.lat]).addTo(mapInstance.current!);
    if (followMode) mapInstance.current!.flyTo({ center: [userLocation.lng, userLocation.lat], duration: 800 });
  }, [userLocation, mapLoaded, followMode]);

  useEffect(() => {
    if (!isClockedIn) { lastTrailRef.current = null; return; }
    const id = setInterval(() => {
      const { userLocation: loc, user: u } = useKnockAIStore.getState();
      if (!loc || !u) return;
      const last = lastTrailRef.current;
      const now = Date.now();
      if (!last || now - last.time > 25000 || haversineDist(last.lat, last.lng, loc.lat, loc.lng) > 10) {
        useKnockAIStore.getState().addTrailPoint({ lat: loc.lat, lng: loc.lng });
        lastTrailRef.current = { lat: loc.lat, lng: loc.lng, time: now };
      }
    }, 5000);
    return () => clearInterval(id);
  }, [isClockedIn]);

  const flyToPin = (pin: Pin) => { mapInstance.current?.flyTo({ center: [pin.lng, pin.lat], zoom: 17, duration: 800 }); setShowSearch(false); setSearchQuery(''); };

  const startDrawing = () => {
    if (!routeName.trim()) return;
    setShowRouteModal(false);
    isDrawingRef.current = true;
    drawingPointsRef.current = [];
    setDrawingPoints([]);
    setIsDrawing(true);
  };

  const finishDrawing = () => {
    const pts = drawingPointsRef.current;
    if (pts.length < 3) return;
    const lngs = pts.map((p) => p[0]);
    const lats = pts.map((p) => p[1]);
    addRoute({ name: routeName.trim(), type: routeType, lat: lats.reduce((a, b) => a + b, 0) / lats.length, lng: lngs.reduce((a, b) => a + b, 0) / lngs.length, polygon: pts, teamId: routeType === 'team' ? team?.id : undefined });
    cancelDrawing();
  };

  const cancelDrawing = () => {
    isDrawingRef.current = false; drawingPointsRef.current = []; setDrawingPoints([]); setIsDrawing(false); setRouteName('');
    const src = mapInstance.current?.getSource('draw-preview');
    if (src) src.setData({ type: 'FeatureCollection', features: [] });
    drawDotMarkersRef.current.forEach((m) => m.remove());
    drawDotMarkersRef.current = [];
  };

  const undoLastPoint = () => {
    const next = drawingPointsRef.current.slice(0, -1);
    drawingPointsRef.current = next;
    setDrawingPoints([...next]);
  };

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      <div ref={mapRef} data-tour="map-area" style={{ width: '100%', height: '100%', cursor: isErasing ? 'crosshair' : 'default' }} />

      {mapError && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0D2B55 0%, #1E1E2E 100%)', padding: 24, gap: 16 }}>
          <div style={{ fontSize: 48 }}>🗺️</div>
          <p style={{ color: '#9CA3AF', textAlign: 'center' }}>Map unavailable. Showing pin list.</p>
          <div style={{ width: '100%', maxHeight: 300, overflowY: 'auto' }}>
            {pins.map((pin) => (
              <button key={pin.id} onClick={() => openEditPinModal(pin)} style={{ width: '100%', padding: '10px 14px', margin: '4px 0', borderRadius: 10, border: 'none', background: `${PIN_COLORS[pin.type]}22`, color: '#fff', cursor: 'pointer', textAlign: 'left', fontSize: 13 }}>
                <span style={{ color: PIN_COLORS[pin.type] }}>● </span>{pin.leadName || pin.address}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div data-tour="map-filter" style={{ position: 'absolute', top: 16, left: 12, right: 12, display: 'flex', gap: 6, zIndex: 10 }}>
        <button onClick={() => setPinFilter('all')} style={{ flex: 1, padding: '7px 4px', borderRadius: 10, border: 'none', cursor: 'pointer', background: pinFilter === 'all' ? '#1A6FD6' : 'rgba(13,43,85,0.9)', backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{ display: 'flex', gap: 2 }}><div style={{ width: 7, height: 7, borderRadius: '50%', background: '#34D399' }} /><div style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444' }} /><div style={{ width: 7, height: 7, borderRadius: '50%', background: '#F59E0B' }} /></div>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>All</span>
        </button>
        {QUICK_PIN_TYPES.map(({ type, label, icon, color }) => (
          <button key={type} onClick={() => setPinFilter(type)} style={{ flex: 1, padding: '7px 4px', borderRadius: 10, border: `2px solid ${pinFilter === type ? color : 'transparent'}`, cursor: 'pointer', background: pinFilter === type ? `${color}33` : 'rgba(13,43,85,0.9)', backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: type === 'ai_knocked' ? 9 : 13 }}>{icon}</div>
            <span style={{ fontSize: 9, fontWeight: 700, color }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      {showSearch && (
        <div style={{ position: 'absolute', top: 60, left: 12, right: 12, zIndex: 20 }}>
          <input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name or address..." style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: 'none', background: '#0D2B55', color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }} />
          {searchResults.length > 0 && (
            <div style={{ background: '#0D2B55', borderRadius: 12, marginTop: 4, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
              {searchResults.map((pin) => (
                <button key={pin.id} onClick={() => flyToPin(pin)} style={{ width: '100%', padding: '12px 16px', border: 'none', background: 'none', color: '#fff', textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 14 }}>
                  <span style={{ color: PIN_COLORS[pin.type] }}>● </span>{pin.leadName || pin.address}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Right controls */}
      <div style={{ position: 'absolute', top: 88, right: 12, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }}>
        <MapBtn onClick={() => setShowSearch(!showSearch)}>🔍</MapBtn>
        <MapBtn onClick={() => mapInstance.current?.zoomIn()}>+</MapBtn>
        <MapBtn onClick={() => mapInstance.current?.zoomOut()}>−</MapBtn>
        <MapBtn onClick={() => { setRouteLockedMsg(''); setShowRouteModal(true); }}>🗺</MapBtn>
        <button onClick={() => setShowAIRoute(!showAIRoute)} style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${aiSuggestion ? 'rgba(16,185,129,0.5)' : 'rgba(0,102,204,0.2)'}`, background: aiSuggestion ? 'rgba(16,185,129,0.15)' : 'rgba(13,43,85,0.9)', color: aiSuggestion ? '#10B981' : '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', fontSize: 18 }}>✨</button>
        <button onClick={() => setShowRoutesList(!showRoutesList)} style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${showRoutesList ? 'rgba(139,92,246,0.5)' : 'rgba(0,102,204,0.2)'}`, background: showRoutesList ? 'rgba(139,92,246,0.15)' : 'rgba(13,43,85,0.9)', color: showRoutesList ? '#8B5CF6' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', fontSize: 18 }}>📋</button>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowTrailPanel(!showTrailPanel)} style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${trailView !== 'off' ? 'rgba(239,68,68,0.5)' : 'rgba(0,102,204,0.2)'}`, background: trailView !== 'off' ? 'rgba(239,68,68,0.15)' : 'rgba(13,43,85,0.9)', color: trailView !== 'off' ? '#EF4444' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>🦶</button>
          {isClockedIn && trailView !== 'off' && <div style={{ position: 'absolute', top: -3, right: -3, width: 9, height: 9, borderRadius: '50%', background: '#10B981', border: '2px solid rgba(13,43,85,0.95)' }} />}
        </div>
      </div>

      {/* AI toggle */}
      <div data-tour="map-ai" style={{ position: 'absolute', bottom: 24, right: 12, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <button onClick={toggleAI} style={{ width: 56, height: 56, borderRadius: 28, border: 'none', cursor: 'pointer', background: aiEnabled ? '#3B82F6' : '#374151', color: '#fff', boxShadow: aiEnabled ? '0 4px 16px rgba(0,102,204,0.5)' : 'none', transition: 'all 0.3s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <span style={{ fontSize: 16 }}>🤖</span>
          <span style={{ fontSize: 9, fontWeight: 800 }}>{aiEnabled ? 'AI ON' : 'AI OFF'}</span>
        </button>
      </div>

      {/* Re-center */}
      <div style={{ position: 'absolute', bottom: 24, left: 12, zIndex: 10 }}>
        <button onClick={() => { if (userLocation && mapInstance.current) { mapInstance.current.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 17, duration: 800 }); setFollowMode(true); } }} style={{ width: 44, height: 44, borderRadius: 22, border: '1px solid rgba(0,102,204,0.3)', background: 'rgba(13,43,85,0.9)', color: '#3B82F6', fontSize: 18, cursor: 'pointer' }}>◎</button>
      </div>

      {isClockedIn && (
        <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
          <div style={{ padding: '6px 14px', borderRadius: 20, background: '#10B981', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} /> TRACKING ACTIVE
          </div>
        </div>
      )}

      {/* Route modal */}
      {showRouteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(4px)', padding: '24px 16px' }} onClick={() => setShowRouteModal(false)}>
          <div style={{ width: '100%', maxWidth: 380, background: '#0D2B55', borderRadius: 20, padding: '24px 20px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>Create Route</h2>
              <button onClick={() => setShowRouteModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: '#9CA3AF', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Route Name</label>
              <input value={routeName} onChange={(e) => setRouteName(e.target.value)} placeholder="e.g. Morning Round" style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#9CA3AF', fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Route Type</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => { setRouteType('individual'); setRouteLockedMsg(''); }} style={{ padding: '14px 16px', borderRadius: 12, border: `2px solid ${routeType === 'individual' ? '#1A6FD6' : 'rgba(255,255,255,0.08)'}`, background: routeType === 'individual' ? 'rgba(26,111,214,0.2)' : 'rgba(255,255,255,0.03)', color: routeType === 'individual' ? '#1A6FD6' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>🧍 Individual Route</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Only visible to you</div>
                </button>
                <button onClick={() => { if (!isManagerOrOwner) { setRouteLockedMsg('Only owners and managers can create team routes.'); } else { setRouteType('team'); setRouteLockedMsg(''); } }} style={{ padding: '14px 16px', borderRadius: 12, border: `2px solid ${routeType === 'team' ? '#8B5CF6' : 'rgba(255,255,255,0.08)'}`, background: routeType === 'team' ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.03)', color: isManagerOrOwner ? (routeType === 'team' ? '#8B5CF6' : '#fff') : '#4B5563', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>👥 Team Route {!isManagerOrOwner && '🔒'}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Visible to all team members</div>
                </button>
                {routeLockedMsg && <p style={{ color: '#F59E0B', fontSize: 13, margin: 0 }}>{routeLockedMsg}</p>}
              </div>
            </div>
            <button onClick={startDrawing} disabled={!routeName.trim()} style={{ width: '100%', padding: '15px', borderRadius: 12, border: 'none', cursor: routeName.trim() ? 'pointer' : 'default', background: routeName.trim() ? 'linear-gradient(90deg, #8B5CF6, #6D28D9)' : '#374151', color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 10 }}>✏️ Draw on Map</button>
            <button onClick={() => setShowRouteModal(false)} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 15 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Drawing overlay */}
      {isDrawing && (
        <>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'rgba(139,92,246,0.95)', padding: '12px 16px', zIndex: 50, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>✏️ Tracer: {routeName}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 1 }}>{drawingPoints.length < 3 ? `${drawingPoints.length}/3 points min` : `${drawingPoints.length} points`}</div>
            </div>
            <button onClick={undoLastPoint} disabled={drawingPoints.length === 0} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>↩</button>
            <button onClick={cancelDrawing} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
          </div>
          <div style={{ position: 'absolute', bottom: isDesktop ? 24 : 90, left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}>
            <button onClick={finishDrawing} disabled={drawingPoints.length < 3} style={{ padding: '14px 32px', borderRadius: 30, border: 'none', cursor: drawingPoints.length >= 3 ? 'pointer' : 'default', background: drawingPoints.length >= 3 ? 'linear-gradient(90deg, #8B5CF6, #6D28D9)' : 'rgba(107,114,128,0.8)', color: '#fff', fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap' }}>
              {drawingPoints.length >= 3 ? '✓ Terminer la route' : `${drawingPoints.length}/3 points minimum`}
            </button>
          </div>
        </>
      )}

      {/* Erase mode */}
      {isErasing && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'rgba(245,158,11,0.96)', padding: '10px 16px', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#000' }}>🧹 Mode gomme actif</div>
            <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.65)', marginTop: 1 }}>Touche la trace pour effacer des points</div>
          </div>
          <button onClick={() => { setIsErasing(false); isErasingRef.current = false; }} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'rgba(0,0,0,0.2)', color: '#000', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Terminer</button>
        </div>
      )}

      {/* Trail panel */}
      {showTrailPanel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 250, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowTrailPanel(false)}>
          <div style={{ width: '100%', maxWidth: isDesktop ? 640 : 430, background: '#0D2B55', borderRadius: '20px 20px 0 0', padding: '16px 20px 40px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Trace GPS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              {([{ key: 'mine', icon: '🦶', label: 'Ma trace' }, { key: 'team', icon: '👥', label: 'Équipe' }, { key: 'off', icon: '🚫', label: 'Masquer' }] as const).map(({ key, icon, label }) => (
                <button key={key} onClick={() => setTrailView(key)} style={{ padding: '12px 8px', borderRadius: 10, border: `2px solid ${trailView === key ? '#EF4444' : 'rgba(255,255,255,0.08)'}`, background: trailView === key ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)', color: trailView === key ? '#EF4444' : '#9CA3AF', cursor: 'pointer', fontWeight: 600, fontSize: 13, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div><div>{label}</div>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { const next = !isErasing; setIsErasing(next); isErasingRef.current = next; setShowTrailPanel(false); }} style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: isErasing ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)', color: isErasing ? '#F59E0B' : '#9CA3AF', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>🧹 Gomme</button>
              <button onClick={() => clearMyTrail()} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '2px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#EF4444', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>🗑 Effacer tout</button>
            </div>
          </div>
        </div>
      )}

      {/* AI Route panel */}
      {showAIRoute && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 250, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowAIRoute(false)}>
          <div style={{ width: '100%', maxWidth: isDesktop ? 640 : 430, background: '#0D2B55', borderRadius: '20px 20px 0 0', padding: '16px 20px 40px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>✨ Zone IA recommandée</div>
            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 16 }}>Basé sur tes 7 derniers jours</div>
            {aiSuggestion ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                  {[{ label: 'Portes', value: aiSuggestion.doors, color: '#8B5CF6' }, { label: 'Ventes', value: aiSuggestion.sales, color: '#10B981' }, { label: 'Conversion', value: `${aiSuggestion.convRate}%`, color: '#1A6FD6' }].map(({ label, value, color }) => (
                    <div key={label} style={{ padding: '10px 8px', borderRadius: 12, background: `${color}18`, border: `1px solid ${color}33`, textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
                      <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => { if (mapInstance.current) mapInstance.current.flyTo({ center: [aiSuggestion.lng, aiSuggestion.lat], zoom: 16, duration: 1200 }); setShowAIRoute(false); }} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(90deg,#10B981,#059669)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginBottom: 10 }}>🎯 Aller à cette zone</button>
              </>
            ) : (
              <p style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>Pas encore assez de données. Ajoute au moins 3 pins.</p>
            )}
            <button onClick={() => setShowAIRoute(false)} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.06)', color: '#9CA3AF', cursor: 'pointer', fontSize: 14 }}>Fermer</button>
          </div>
        </div>
      )}

      {/* Routes list */}
      {showRoutesList && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 250, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowRoutesList(false)}>
          <div style={{ width: '100%', maxWidth: isDesktop ? 640 : 430, background: '#0D2B55', borderRadius: '20px 20px 0 0', padding: '16px 20px 40px', maxHeight: '75vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>📋 Mes Routes ({routes.length})</div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {routes.length === 0 ? (
                <p style={{ color: '#4B5563', fontSize: 14, textAlign: 'center', padding: '32px 0' }}>Aucune route. Dessine avec 🗺</p>
              ) : routes.map((route) => {
                const canDelete = route.userId === user?.id || isManagerOrOwner;
                const isConfirming = routeToDelete === route.id;
                const pts = route.polygon || [];
                return (
                  <div key={route.id} style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>{route.type === 'team' ? '👥' : '🧍'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{route.name}</div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>{new Date(route.createdAt).toLocaleDateString()} · {pts.length} points</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { if (pts.length > 0 && mapInstance.current) { const [lng, lat] = pts[Math.floor(pts.length / 2)]; mapInstance.current.flyTo({ center: [lng, lat], zoom: 15, duration: 1000 }); } setShowRoutesList(false); }} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(26,111,214,0.2)', color: '#1A6FD6', cursor: 'pointer', fontSize: 14 }}>🎯</button>
                      {canDelete && (isConfirming ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => { deleteRoute(route.id); setRouteToDelete(null); }} style={{ padding: '4px 10px', borderRadius: 8, border: 'none', background: '#EF4444', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Oui</button>
                          <button onClick={() => setRouteToDelete(null)} style={{ padding: '4px 10px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#9CA3AF', cursor: 'pointer', fontSize: 12 }}>Non</button>
                        </div>
                      ) : (
                        <button onClick={() => setRouteToDelete(route.id)} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.15)', color: '#EF4444', cursor: 'pointer', fontSize: 14 }}>🗑</button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quick pin picker */}
      {quickPinCoords && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 250, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setQuickPinCoords(null)}>
          <div style={{ width: '100%', maxWidth: isDesktop ? 640 : 430, background: '#0D2B55', borderRadius: '20px 20px 0 0', padding: isDesktop ? '20px 28px 32px' : '16px 20px 36px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 16px' }} />
            <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, marginBottom: 16 }}>Quel type de pin ?</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
              {QUICK_PIN_TYPES.map(({ type, label, icon, color }) => (
                <button key={type} disabled={geocoding} onClick={async () => {
                  const coords = quickPinCoords;
                  setQuickPinCoords(null);
                  setGeocoding(true);
                  const address = await reverseGeocode(coords.lat, coords.lng);
                  setGeocoding(false);
                  addPin({ lat: coords.lat, lng: coords.lng, address, type, placedByAi: false });
                }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 8px', borderRadius: 14, border: `2px solid ${color}44`, background: `${color}18`, cursor: geocoding ? 'default' : 'pointer', opacity: geocoding ? 0.6 : 1 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: type === 'ai_knocked' ? 9 : 16 }}>{icon}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color, textAlign: 'center' }}>{label}</span>
                </button>
              ))}
            </div>
            <button onClick={() => { openAddPinModal(quickPinCoords.lat, quickPinCoords.lng); setQuickPinCoords(null); }} style={{ width: '100%', marginTop: 14, padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#9CA3AF', cursor: 'pointer', fontSize: 13 }}>+ Ajouter nom / notes</button>
          </div>
        </div>
      )}

      <style>{`@keyframes pulseUser{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:0.6;}50%{transform:translate(-50%,-50%) scale(1.5);opacity:0.2;}}`}</style>
    </div>
  );
}

function MapBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid rgba(0,102,204,0.2)', background: 'rgba(13,43,85,0.9)', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
      {children}
    </button>
  );
}
