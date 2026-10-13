import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Eraser, MapPin, Search, Undo2 } from 'lucide-react';
import { Button, Input, Notice } from '@/components/ui';
import { latLngToLocalMetres, polygonArea } from '@/engine/roof';
import { num } from '@/lib/format';

export interface LatLng {
  lat: number;
  lng: number;
}

const PRESETS: { label: string; lat: number; lng: number }[] = [
  { label: 'Bhosari MIDC, Pune', lat: 18.6298, lng: 73.8467 },
  { label: 'Chakan MIDC, Pune', lat: 18.7606, lng: 73.8636 },
  { label: 'Hadapsar Industrial Estate, Pune', lat: 18.5089, lng: 73.9259 },
  { label: 'Pimpri, Pune', lat: 18.6279, lng: 73.8009 },
];

/**
 * Lets a customer find their building on public map imagery (no API key) and
 * click the corners of their roof. The area is computed from the clicked points;
 * nothing is detected automatically.
 */
export function RoofMap({ points, onChange, center }: { points: LatLng[]; onChange: (pts: LatLng[], center: LatLng) => void; center?: LatLng }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const ptsRef = useRef(points);
  const [tileError, setTileError] = useState(false);
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);
  ptsRef.current = points;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { center: center ? [center.lat, center.lng] : [PRESETS[0].lat, PRESETS[0].lng], zoom: center ? 19 : 17, maxZoom: 20 });
    const tiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 20,
      maxNativeZoom: 19,
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics, GIS User Community',
    });
    let errors = 0;
    tiles.on('tileerror', () => {
      errors++;
      if (errors > 3) setTileError(true);
    });
    tiles.addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on('click', (e: L.LeafletMouseEvent) => {
      const c = m.getCenter();
      onChange([...ptsRef.current, { lat: e.latlng.lat, lng: e.latlng.lng }], { lat: c.lat, lng: c.lng });
    });
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    points.forEach((p) => L.circleMarker([p.lat, p.lng], { radius: 5, color: '#F1B650', weight: 2, fillOpacity: 1, fillColor: '#ffffff' }).addTo(g));
    if (points.length >= 2) L.polygon(points.map((p) => [p.lat, p.lng] as [number, number]), { color: '#12B8A6', weight: 2, fillOpacity: 0.25 }).addTo(g);
  }, [points]);

  const flyTo = (lat: number, lng: number) => {
    map.current?.setView([lat, lng], 18);
  };

  const search = async () => {
    if (!q.trim()) return;
    setSearching(true);
    setSearchMsg(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`, { headers: { Accept: 'application/json' } });
      const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
      if (data[0]) {
        flyTo(Number(data[0].lat), Number(data[0].lon));
        setSearchMsg(`Showing: ${data[0].display_name.split(',').slice(0, 3).join(',')}`);
      } else setSearchMsg('No match found. Try an area name, or use the quick locations below.');
    } catch {
      setSearchMsg('Search is unavailable right now (no internet?). Use the quick locations below or enter roof size manually.');
    } finally {
      setSearching(false);
    }
  };

  const area = polygonArea(latLngToLocalMetres(points));
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), search())} placeholder="Search area or address, e.g. Bhosari MIDC" aria-label="Search location" />
        <Button variant="outline" onClick={search} loading={searching} icon={<Search className="h-4 w-4" />}>
          Find
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p.label} onClick={() => flyTo(p.lat, p.lng)} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-navy hover:bg-slate-200">
            <MapPin className="h-3 w-3" /> {p.label}
          </button>
        ))}
      </div>
      {searchMsg && <p className="text-xs text-slate-500">{searchMsg}</p>}
      <div ref={el} className="h-72 w-full overflow-hidden rounded-xl ring-1 ring-slate-200 sm:h-96" role="application" aria-label="Map: click on each corner of your roof" />
      {tileError && <Notice tone="warn">Map imagery could not be loaded. You can enter your roof size manually instead.</Notice>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          {points.length < 3 ? (
            <>Click on each corner of your roof ({points.length} marked, at least 3 needed).</>
          ) : (
            <>
              Marked roof: <strong>about {num(area)} m²</strong> ({points.length} corners). This is approximate.
            </>
          )}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" disabled={!points.length} onClick={() => onChange(points.slice(0, -1), center ?? PRESETS[0])} icon={<Undo2 className="h-4 w-4" />}>
            Undo
          </Button>
          <Button size="sm" variant="ghost" disabled={!points.length} onClick={() => onChange([], center ?? PRESETS[0])} icon={<Eraser className="h-4 w-4" />}>
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
