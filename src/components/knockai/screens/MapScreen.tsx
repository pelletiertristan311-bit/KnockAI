'use client';
import { useEffect, useRef, useState, useMemo } from 'react';
import { useKnockAIStore, Pin, PinType, type TeamDrawing } from '@/lib/knockai/store';
import { type RealtimeStatus } from '@/hooks/knockai/useTeamPins';

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
const DRAW_COLORS = ['#EF4444', '#1F2937', '#3B82F6'];

// Teammates' drawings are shown in bright red to distinguish from own
const TEAMMATE_DRAWING_COLOR = '#FF3B30';

function addMapLayers(map: any) {
  map.addSource('routes-data', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'routes-fill', type: 'fill', source: 'routes-data', paint: { 'fill-color': '#8B5CF6', 'fill-opacity': 0.18 } });
  map.addLayer({ id: 'routes-outline', type: 'line', source: 'routes-data', paint: { 'line-color': '#8B5CF6', 'line-width': 2.5, 'line-opacity': 0.9 } });
  map.addSource('draw-preview', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'draw-fill', type: 'fill', source: 'draw-preview', paint: { 'fill-color': '#8B5CF6', 'fill-opacity': 0.12 } });
  map.addLayer({ id: 'draw-outline', type: 'line', source: 'draw-preview', paint: { 'line-color': '#8B5CF6', 'line-width': 2, 'line-dasharray': [3, 2] } });
  map.addSource('street-drawings', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'street-drawings-line', type: 'line', source: 'street-drawings', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['case', ['==', ['get', 'isOwn'], true], ['get', 'color'], TEAMMATE_DRAWING_COLOR], 'line-width': 4, 'line-opacity': 0.9 } });
  map.addSource('street-drawing-active', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'street-drawing-active-line', type: 'line', source: 'street-drawing-active', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 4, 'line-opacity': 0.85, 'line-dasharray': [3, 2] } });
  map.addSource('street-drawing-dots', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'street-drawing-dots-layer', type: 'circle', source: 'street-drawing-dots', paint: { 'circle-radius': 5, 'circle-color': ['get', 'color'], 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } });
}

export default function MapScreen({ realtimeStatus = 'disabled' }: { realtimeStatus?: RealtimeStatus }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const maplibreRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const routeMarkersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const teammateMarkersRef = useRef<any[]>([]);
  const isStreetDrawingRef = useRef(false);
  const streetDrawingPointsRef = useRef<[number, number][]>([]);
  const drawingColorRef = useRef('#EF4444');
  const finishStreetDrawingRef = useRef<() => void>(() => {});
  const isDrawingRef = useRef(false);
  const drawingPointsRef = useRef<[number, number][]>([]);
  const drawDotMarkersRef = useRef<any[]>([]);
  const isDrawingErasingRef = useRef(false);
  const drawingsRef = useRef<TeamDrawing[]>([]);

  const [followMode, setFollowMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState('');
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [routeType, setRouteType] = useState<'individual' | 'team'>('individual');
  const [routeLockedMsg, setRouteLockedMsg] = useState('');
  const [quickPinCoords, setQuickPinCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [mapStyleVersion, setMapStyleVersion] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isDrawingErasing, setIsDrawingErasing] = useState(false);

  const [showRoutesList, setShowRoutesList] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<string | null>(null);
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isStreetDrawing, setIsStreetDrawing] = useState(false);
  const [streetDrawingPoints, setStreetDrawingPoints] = useState<[number, number][]>([]);
  const [drawingColor, setDrawingColor] = useState('#EF4444');

  drawingColorRef.current = drawingColor;
  isDrawingErasingRef.current = isDrawingErasing;

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  const { pins, routes, userLocation, pinFilter, aiEnabled, teamMembers, user, team,
    setUserLocation, setPinFilter, toggleAI, openAddPinModal, openEditPinModal, addPin,
    addRoute, deleteRoute, mapTheme, teamDrawings, addTeamDrawing, removeTeamDrawing } = useKnockAIStore();

  drawingsRef.current = teamDrawings;

  const filteredPins = useMemo(() => pinFilter === 'all' ? pins : pins.filter((p) => p.type === pinFilter), [pins, pinFilter]);
  const searchResults = useMemo(() => searchQuery ? pins.filter((p) => p.leadName?.toLowerCase().includes(searchQuery.toLowerCase()) || p.address.toLowerCase().includes(searchQuery.toLowerCase())) : [], [pins, searchQuery]);
  const isManagerOrOwner = user?.role === 'manager' || user?.role === 'owner';

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, { headers: { 'Accept-Language': 'fr', 'User-Agent': 'KnockAI/1.0' } });
      const data = await res.json();
      const a = data.address || {};
      const parts = [a.house_number, a.road || a.street, a.city || a.town || a.village || a.municipality].filter(Boolean);
      return parts.length > 0 ? parts.join(' ') : data.display_name?.split(',')[0] || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch { return `${lat.toFixed(4)}, ${lng.toFixed(4)}`; }
  };

  // Map init
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
      const styleUrl = initTheme === 'dark' ? 'https://api.maptiler.com/maps/streets-v2-dark/style.json?key=l7T65duPkEOuA9Ji3cmf' : 'https://api.maptiler.com/maps/streets-v2/style.json?key=l7T65duPkEOuA9Ji3cmf';
      try {
        const map = new ml.Map({ container: mapRef.current!, style: styleUrl, center: initCenter, zoom: 15, attributionControl: false });
        let loaded = false;
        map.on('load', () => {
          loaded = true;
          try { map.setPaintProperty('water', 'fill-color', '#C5E8FF'); } catch (_) {}
          try { map.setPaintProperty('waterway', 'line-color', '#C5E8FF'); } catch (_) {}
          ['park', 'landuse_park', 'landcover_grass', 'grass', 'landuse_grass', 'landuse-park'].forEach((layer) => { try { map.setPaintProperty(layer, 'fill-color', '#adc4ad'); } catch (_) {} });
          addMapLayers(map);
          setMapLoaded(true);
          setMapStyleVersion((v) => v + 1);
          map.on('click', (e: any) => {
            if (isStreetDrawingRef.current) {
              if ((e.originalEvent as MouseEvent).detail > 1) return;
              const pt: [number, number] = [e.lngLat.lng, e.lngLat.lat];
              const next = [...streetDrawingPointsRef.current, pt];
              streetDrawingPointsRef.current = next;
              setStreetDrawingPoints([...next]);
              return;
            }
            if (isDrawingRef.current) {
              const pt: [number, number] = [e.lngLat.lng, e.lngLat.lat];
              const next = [...drawingPointsRef.current, pt];
              drawingPointsRef.current = next;
              setDrawingPoints([...next]);
            } else {
              setQuickPinCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
            }
          });
          map.on('dblclick', (e: any) => {
            if (isStreetDrawingRef.current) { e.preventDefault(); finishStreetDrawingRef.current(); }
          });
          map.on('dragstart', () => setFollowMode(false));
        });
        map.on('error', () => { if (!loaded) setMapError('Map style failed to load'); });
        mapInstance.current = map;
      } catch { setMapError('Map initialization failed'); }
    }).catch(() => setMapError('MapLibre GL could not be loaded'));
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, []);

  // Map theme change
  useEffect(() => {
    if (!mapInstance.current || !mapLoaded) return;
    const map = mapInstance.current;
    const styleUrl = mapTheme === 'dark' ? 'https://api.maptiler.com/maps/streets-v2-dark/style.json?key=l7T65duPkEOuA9Ji3cmf' : 'https://api.maptiler.com/maps/streets-v2/style.json?key=l7T65duPkEOuA9Ji3cmf';
    map.setStyle(styleUrl);
    map.once('style.load', () => {
      if (mapTheme === 'light') {
        try { map.setPaintProperty('water', 'fill-color', '#C5E8FF'); } catch (_) {}
        ['park', 'landuse_park', 'landcover_grass', 'grass'].forEach((l) => { try { map.setPaintProperty(l, 'fill-color', '#adc4ad'); } catch (_) {} });
      }
      addMapLayers(map);
      setMapStyleVersion((v) => v + 1);
    });
  }, [mapTheme, mapLoaded]);

  // Pin markers
  useEffect(() => {
    if (!mapInstance.current || !mapLoaded || !maplibreRef.current) return;
    const ml = maplibreRef.current;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    const myId = user?.id;
    filteredPins.forEach((pin) => {
      const isOwn = pin.userId === myId;
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:relative;width:40px;height:40px;cursor:pointer;overflow:visible;';
      const inner = document.createElement('div');
      inner.style.cssText = `width:40px;height:40px;border-radius:50%;background:${PIN_COLORS[pin.type]};border:3px solid ${isOwn ? 'white' : '#C4B5FD'};display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:${pin.type === 'ai_knocked' ? '10px' : '16px'};box-shadow:0 2px 8px ${PIN_COLORS[pin.type]}66;font-family:Inter,sans-serif;transition:transform 0.15s;`;
      inner.textContent = PIN_ICONS[pin.type];
      wrapper.appendChild(inner);
      const civicNumber = pin.address?.match(/^\d+/)?.[0];
      if (civicNumber) {
        const lbl = document.createElement('div');
        lbl.style.cssText = 'position:absolute;top:43px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.62);color:#fff;font-size:10px;font-weight:700;font-family:Inter,sans-serif;padding:2px 5px;border-radius:4px;white-space:nowrap;pointer-events:none;border:1px solid rgba(255,255,255,0.18);line-height:1.3;';
        lbl.textContent = civicNumber;
        wrapper.appendChild(lbl);
      }
      if (!isOwn) {
        const badge = document.createElement('div');
        const initials = pin.placedByName.split(' ').map((w: string) => w[0] || '').join('').substring(0, 2).toUpperCase();
        badge.style.cssText = 'position:absolute;bottom:-2px;right:-2px;width:16px;height:16px;border-radius:50%;background:#8B5CF6;border:2px solid white;display:flex;align-items:center;justify-content:center;color:white;font-size:7px;font-weight:700;font-family:Inter,sans-serif;line-height:1;';
        badge.textContent = initials;
        wrapper.appendChild(badge);
      }
      wrapper.addEventListener('mouseenter', () => { inner.style.transform = 'scale(1.2)'; });
      wrapper.addEventListener('mouseleave', () => { inner.style.transform = 'scale(1)'; });
      wrapper.addEventListener('click', (e) => { e.stopPropagation(); openEditPinModal(pin); });
      const m = new ml.Marker({ element: wrapper }).setLngLat([pin.lng, pin.lat]).addTo(mapInstance.current!);
      markersRef.current.push(m);
    });
  }, [filteredPins, mapLoaded, user?.id]);

  // Route polygons
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
      const rm = new ml.Marker({ element: el }).setLngLat([lngs.reduce((a, b) => a + b, 0) / lngs.length, lats.reduce((a, b) => a + b, 0) / lats.length]).addTo(mapInstance.current!);
      routeMarkersRef.current.push(rm);
    });
  }, [routes, mapStyleVersion]);

  // Route drawing preview
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
      const dm = new ml.Marker({ element: el }).setLngLat(pt).addTo(mapInstance.current!);
      drawDotMarkersRef.current.push(dm);
    });
  }, [drawingPoints, mapStyleVersion]);

  // Team drawings — own = drawn color, teammates = rouge flash
  useEffect(() => {
    if (!mapInstance.current || mapStyleVersion === 0) return;
    const src = mapInstance.current.getSource('street-drawings');
    if (!src) return;
    const myId = user?.id;
    const features = teamDrawings.map((d) => ({
      type: 'Feature' as const,
      properties: { color: d.color, isOwn: d.userId === myId },
      geometry: { type: 'LineString' as const, coordinates: d.coordinates },
    }));
    src.setData({ type: 'FeatureCollection', features });
  }, [teamDrawings, mapStyleVersion, user?.id]);

  // Active street drawing preview
  useEffect(() => {
    if (!mapInstance.current || mapStyleVersion === 0) return;
    const activeSrc = mapInstance.current.getSource('street-drawing-active');
    const dotsSrc = mapInstance.current.getSource('street-drawing-dots');
    if (!activeSrc || !dotsSrc) return;
    if (streetDrawingPoints.length < 2) {
      activeSrc.setData({ type: 'FeatureCollection', features: [] });
      dotsSrc.setData({ type: 'FeatureCollection', features: [] });
      return;
    }
    activeSrc.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: { color: drawingColor }, geometry: { type: 'LineString', coordinates: streetDrawingPoints } }] });
    dotsSrc.setData({ type: 'FeatureCollection', features: streetDrawingPoints.map((pt) => ({ type: 'Feature', properties: { color: drawingColor }, geometry: { type: 'Point', coordinates: pt } })) });
  }, [streetDrawingPoints, drawingColor, mapStyleVersion]);

  // Teammate location markers
  useEffect(() => {
    if (!mapInstance.current || !mapLoaded || !maplibreRef.current) return;
    const ml = maplibreRef.current;
    teammateMarkersRef.current.forEach((m) => m.remove());
    teammateMarkersRef.current = [];
    teamMembers.filter((m) => m.lat && m.lng && m.isOnline).forEach((member) => {
      const el = document.createElement('div');
      el.style.cssText = 'width:36px;height:36px;border-radius:50%;background:#8B5CF6;border:3px solid #fff;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 0 12px rgba(139,92,246,0.6);';
      el.textContent = member.fullName.charAt(0);
      const tm = new ml.Marker({ element: el }).setLngLat([member.lng!, member.lat!]).addTo(mapInstance.current!);
      teammateMarkersRef.current.push(tm);
    });
  }, [teamMembers, mapLoaded]);

  // Geolocation watch
  useEffect(() => {
    if (!navigator.geolocation) { setUserLocation({ lat: 45.5017, lng: -73.5673 }); return; }
    const id = navigator.geolocation.watchPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserLocation({ lat: 45.5017, lng: -73.5673 }),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // User location marker
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

  // Disable map interaction when eraser is active
  useEffect(() => {
    if (!mapInstance.current || !mapLoaded) return;
    const map = mapInstance.current;
    if (isDrawingErasing) {
      map.dragPan.disable();
      map.scrollZoom.disable();
      map.touchZoomRotate.disable();
    } else {
      map.dragPan.enable();
      map.scrollZoom.enable();
      map.touchZoomRotate.enable();
    }
  }, [isDrawingErasing, mapLoaded]);

  // Eraser pointer handler — fires on any pointer move over the overlay
  const handleEraserPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingErasingRef.current || !mapInstance.current) return;
    if (e.pointerType === 'mouse' && e.buttons === 0) return;
    const rect = mapRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ll = mapInstance.current.unproject([x, y]);
    const RADIUS = 40; // metres
    const toRemove = drawingsRef.current.filter((d) =>
      d.coordinates.some(([lng, lat]) => haversineDist(lat, ll.lat, lng, ll.lng) < RADIUS)
    );
    toRemove.forEach((d) => {
      removeTeamDrawing(d.id);
      fetch('/api/knockai/drawings', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: d.id }) }).catch(() => {});
    });
  };

  const exitErasing = () => { setIsDrawingErasing(false); isDrawingErasingRef.current = false; };

  const switchToDrawing = (color: string) => {
    setDrawingColor(color);
    drawingColorRef.current = color;
    exitErasing();
    if (!isStreetDrawingRef.current) {
      isStreetDrawingRef.current = true;
      streetDrawingPointsRef.current = [];
      setStreetDrawingPoints([]);
      setIsStreetDrawing(true);
    }
  };

  const toggleDrawingEraser = () => {
    if (isDrawingErasing) { exitErasing(); return; }
    if (isStreetDrawing) cancelStreetDrawing();
    setIsDrawingErasing(true);
    isDrawingErasingRef.current = true;
  };

  const handleTracerToggle = () => {
    if (isStreetDrawing || isDrawingErasing) {
      if (isStreetDrawing) cancelStreetDrawing();
      exitErasing();
    } else {
      isStreetDrawingRef.current = true;
      streetDrawingPointsRef.current = [];
      setStreetDrawingPoints([]);
      setIsStreetDrawing(true);
    }
  };

  const finishStreetDrawing = () => {
    const pts = streetDrawingPointsRef.current;
    if (pts.length < 2 || !team?.id || !user?.id) { cancelStreetDrawing(); return; }
    const drawing: TeamDrawing = {
      id: `drw-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      teamId: team.id, userId: user.id, userName: user.fullName || '',
      coordinates: pts, color: drawingColorRef.current, createdAt: new Date().toISOString(),
    };
    addTeamDrawing(drawing);
    fetch('/api/knockai/drawings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ drawing }) }).catch(() => {});
    isStreetDrawingRef.current = false;
    streetDrawingPointsRef.current = [];
    setStreetDrawingPoints([]);
    setIsStreetDrawing(false);
  };
  finishStreetDrawingRef.current = finishStreetDrawing;

  const cancelStreetDrawing = () => {
    isStreetDrawingRef.current = false;
    streetDrawingPointsRef.current = [];
    setStreetDrawingPoints([]);
    setIsStreetDrawing(false);
    const activeSrc = mapInstance.current?.getSource('street-drawing-active');
    const dotsSrc = mapInstance.current?.getSource('street-drawing-dots');
    if (activeSrc) activeSrc.setData({ type: 'FeatureCollection', features: [] });
    if (dotsSrc) dotsSrc.setData({ type: 'FeatureCollection', features: [] });
  };

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

  const isTracerActive = isStreetDrawing || isDrawingErasing;

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      <div ref={mapRef} data-tour="map-area" style={{ width: '100%', height: '100%', cursor: 'default' }} />

      {/* Full-screen transparent overlay when erasing — captures pointer, blocks map pan */}
      {isDrawingErasing && (
        <div
          style={{ position: 'absolute', inset: 0, zIndex: 45, touchAction: 'none', cursor: 'crosshair' }}
          onPointerMove={handleEraserPointerMove}
        />
      )}

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
        <button onClick={() => setShowRoutesList(!showRoutesList)} style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${showRoutesList ? 'rgba(139,92,246,0.5)' : 'rgba(0,102,204,0.2)'}`, background: showRoutesList ? 'rgba(139,92,246,0.15)' : 'rgba(13,43,85,0.9)', color: showRoutesList ? '#8B5CF6' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', fontSize: 18 }}>📋</button>

        {/* Tracer button + panel (drawing + eraser) */}
        <div style={{ position: 'relative' }}>
          <button onClick={handleTracerToggle} style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${isTracerActive ? 'rgba(59,130,246,0.6)' : 'rgba(0,102,204,0.2)'}`, background: isTracerActive ? 'rgba(59,130,246,0.25)' : 'rgba(13,43,85,0.9)', color: isTracerActive ? '#3B82F6' : '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, backdropFilter: 'blur(8px)' }}>
            <span style={{ fontSize: 14 }}>{isDrawingErasing ? '🧹' : '✏️'}</span>
            <span style={{ fontSize: 7, fontWeight: 700 }}>Trace GPS</span>
          </button>

          {/* Tracer side panel — colors + eraser */}
          {isTracerActive && (
            <div style={{ position: 'absolute', right: 48, top: 0, display: 'flex', flexDirection: 'column', gap: 6, padding: '8px', borderRadius: 12, background: 'rgba(13,43,85,0.95)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
              {DRAW_COLORS.map((color) => (
                <button key={color} onClick={() => switchToDrawing(color)} style={{ width: 28, height: 28, borderRadius: '50%', background: color, border: isStreetDrawing && drawingColor === color ? '3px solid white' : '2px solid rgba(255,255,255,0.3)', cursor: 'pointer', flexShrink: 0, opacity: isDrawingErasing ? 0.5 : 1 }} />
              ))}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.12)', margin: '2px 0' }} />
              <button onClick={toggleDrawingEraser} title="Gomme" style={{ width: 28, height: 28, borderRadius: 8, border: isDrawingErasing ? '2px solid #F59E0B' : '1px solid rgba(255,255,255,0.25)', background: isDrawingErasing ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🧹</button>
            </div>
          )}
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

      {/* Street drawing active banner */}
      {isStreetDrawing && (
        <>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'rgba(37,99,235,0.95)', padding: '12px 16px', zIndex: 50, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>✏️ Trace GPS active</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 1 }}>{streetDrawingPoints.length < 2 ? `${streetDrawingPoints.length}/2 points min` : `${streetDrawingPoints.length} points · double-clic pour terminer`}</div>
            </div>
            <button onClick={cancelStreetDrawing} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
          </div>
          {streetDrawingPoints.length >= 2 && (
            <div style={{ position: 'absolute', bottom: isDesktop ? 24 : 90, left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}>
              <button onClick={() => finishStreetDrawingRef.current()} style={{ padding: '14px 32px', borderRadius: 30, border: 'none', cursor: 'pointer', background: 'linear-gradient(90deg, #3B82F6, #1D4ED8)', color: '#fff', fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(59,130,246,0.5)' }}>✓ Terminer le tracé</button>
            </div>
          )}
        </>
      )}

      {/* Eraser mode banner */}
      {isDrawingErasing && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'rgba(245,158,11,0.96)', padding: '12px 16px', zIndex: 50, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#000' }}>🧹 Mode gomme actif</div>
            <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.65)', marginTop: 1 }}>Glisse le doigt sur les tracés pour les effacer</div>
          </div>
          <button onClick={exitErasing} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'rgba(0,0,0,0.2)', color: '#000', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Terminer</button>
        </div>
      )}

      {/* Zone drawing overlay */}
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

      {/* Realtime status indicator */}
      {realtimeStatus !== 'disabled' && (
        <div style={{ position: 'absolute', bottom: 68, left: '50%', transform: 'translateX(-50%)', zIndex: 10, pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: realtimeStatus === 'live' ? 'rgba(16,185,129,0.15)' : realtimeStatus === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', border: `1px solid ${realtimeStatus === 'live' ? 'rgba(16,185,129,0.4)' : realtimeStatus === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)'}`, backdropFilter: 'blur(8px)' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: realtimeStatus === 'live' ? '#10B981' : realtimeStatus === 'error' ? '#EF4444' : '#F59E0B', animation: realtimeStatus === 'live' ? 'pulseLive 2s ease-in-out infinite' : 'none' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: realtimeStatus === 'live' ? '#10B981' : realtimeStatus === 'error' ? '#EF4444' : '#F59E0B' }}>
              {realtimeStatus === 'live' ? 'LIVE' : realtimeStatus === 'connecting' ? 'CONNECTING…' : 'RECONNECTING…'}
            </span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulseUser{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:0.6;}50%{transform:translate(-50%,-50%) scale(1.5);opacity:0.2;}}
        @keyframes pulseLive{0%,100%{opacity:1;}50%{opacity:0.3;}}
      `}</style>
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
