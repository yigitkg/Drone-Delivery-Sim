import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default icon path issues in bundlers
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface MapDroneProps {
  start: [number, number];
  end: [number, number];
  position: [number, number];
  traveled?: [number, number][]; // optional trail
}

export function MapDrone({ start, end, position, traveled }: MapDroneProps) {
  const mapRef = useRef<L.Map | null>(null);
  const fittedRef = useRef(false);

  // Fit to start/end once
  useEffect(() => {
    if (!mapRef.current || fittedRef.current) return;
    fittedRef.current = true;
    const b = L.latLngBounds([start[0], start[1]] as any, [end[0], end[1]] as any);
    mapRef.current.fitBounds(b.pad(0.2));
  }, [start[0], start[1], end[0], end[1]]);

  const route: LatLngExpression[] = useMemo(() => [start as any, end as any], [start[0], start[1], end[0], end[1]]);
  const trail: LatLngExpression[] | null = useMemo(() => {
    if (!traveled || traveled.length < 2) return null;
    return traveled as any;
  }, [traveled]);

  const droneIcon = useMemo(() => {
    // Try custom icon; fallback to default if not present
    return L.icon({ iconUrl: '/droneIcon.png', iconSize: [28, 28], iconAnchor: [14, 14] });
  }, []);

  return (
    <div className="card p-3 w-full">
      <MapContainer
        ref={(m) => { mapRef.current = m; }}
        center={start as any}
        zoom={15}
        preferCanvas={true}
        updateWhenIdle={true}
        maxZoom={19}
        style={{ height: '70vh', minHeight: 560, maxHeight: 720, width: '100%' }}
      >
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} keepBuffer={1} />
        {/* Route */}
        <Polyline positions={route} pathOptions={{ color: '#94a3b8', weight: 3, opacity: 0.8 }} />
        {/* Traveled trail */}
        {trail && <Polyline positions={trail} pathOptions={{ color: '#10b981', weight: 4, opacity: 0.9 }} />}
        {/* Markers */}
        <Marker position={start as any} />
        <Marker position={end as any} />
        <Marker icon={droneIcon} position={position as any} />
      </MapContainer>
    </div>
  );
}

