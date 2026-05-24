'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface GPSPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy: number;
  speed?: number | null;
}

function speedColor(kmh: number): string {
  if (kmh <= 8) return '#6f8a3a';   // green — walking
  if (kmh <= 30) return '#d4a017';  // yellow — cycling
  return '#b8412a';                  // red — vehicle
}

function FitBounds({ trail }: { trail: GPSPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (trail.length >= 2) {
      const bounds = trail.map(p => [p.lat, p.lng] as [number, number]);
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [trail, map]);
  return null;
}

export default function TrailMap({ trail, flags }: { trail: GPSPoint[]; flags: string[] }) {
  // Build colored segments
  const segments = useMemo(() => {
    const segs: { positions: [number, number][]; color: string }[] = [];
    for (let i = 1; i < trail.length; i++) {
      const dt = (trail[i].timestamp - trail[i - 1].timestamp) / 1000;
      const R = 6371000;
      const toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(trail[i].lat - trail[i - 1].lat);
      const dLng = toRad(trail[i].lng - trail[i - 1].lng);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(trail[i - 1].lat)) * Math.cos(toRad(trail[i].lat)) * Math.sin(dLng / 2) ** 2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const speed = dt > 0 ? (dist / 1000) / (dt / 3600) : 0;
      segs.push({
        positions: [[trail[i - 1].lat, trail[i - 1].lng], [trail[i].lat, trail[i].lng]],
        color: speedColor(speed),
      });
    }
    return segs;
  }, [trail]);

  // Flag indices
  const flagIndices = useMemo(() => {
    const indices = new Set<number>();
    for (const f of flags) {
      const m = f.match(/_at_(\d+)/);
      if (m) indices.add(parseInt(m[1]));
    }
    return indices;
  }, [flags]);

  if (trail.length < 2) return null;

  return (
    <MapContainer style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds trail={trail} />

      {/* Colored polyline segments */}
      {segments.map((seg, i) => (
        <Polyline key={i} positions={seg.positions} pathOptions={{ color: seg.color, weight: 4, opacity: 0.8 }} />
      ))}

      {/* Start marker */}
      <CircleMarker center={[trail[0].lat, trail[0].lng]} radius={8}
        pathOptions={{ color: '#fff', fillColor: '#6f8a3a', fillOpacity: 1, weight: 2 }}>
        <Tooltip permanent={false}>Start</Tooltip>
      </CircleMarker>

      {/* End marker */}
      <CircleMarker center={[trail[trail.length - 1].lat, trail[trail.length - 1].lng]} radius={8}
        pathOptions={{ color: '#fff', fillColor: '#b8412a', fillOpacity: 1, weight: 2 }}>
        <Tooltip permanent={false}>End</Tooltip>
      </CircleMarker>

      {/* Flag markers */}
      {Array.from(flagIndices).map(idx => (
        trail[idx] ? (
          <CircleMarker key={`flag-${idx}`} center={[trail[idx].lat, trail[idx].lng]} radius={6}
            pathOptions={{ color: '#fff', fillColor: '#c75a2a', fillOpacity: 1, weight: 2 }}>
            <Tooltip permanent={false}>
              {flags.filter(f => f.includes(`_at_${idx}`)).join(', ')}
            </Tooltip>
          </CircleMarker>
        ) : null
      ))}
    </MapContainer>
  );
}
