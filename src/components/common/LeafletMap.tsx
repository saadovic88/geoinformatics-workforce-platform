import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { GeofenceZone } from '../../types';

interface LeafletMapProps {
  zones: GeofenceZone[];
  userLat?: number;
  userLon?: number;
  interactive?: boolean;
  onLocationSelect?: (lat: number, lon: number) => void;
  height?: string;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  zones,
  userLat,
  userLon,
  interactive = false,
  onLocationSelect,
  height = '360px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  // Leaflet calculates tiles before flex/grid cards finish their layout.  A
  // resize observer keeps the map responsive without repeatedly rebuilding it.
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => mapInstanceRef.current?.invalidateSize({ animate: false }));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Primary center: primary zone or first zone or Cairo
    const primaryZone = zones.find((z) => z.isPrimary) || zones[0];
    const initialLat = userLat ?? (primaryZone ? primaryZone.latitude : 30.0444);
    const initialLon = userLon ?? (primaryZone ? primaryZone.longitude : 31.2357);

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView([initialLat, initialLon], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersGroupRef.current = markersGroup;
      mapInstanceRef.current = map;

      if (interactive && onLocationSelect) {
        map.on('click', (e: L.LeafletMouseEvent) => {
          onLocationSelect(e.latlng.lat, e.latlng.lng);
        });
      }
    }

    const map = mapInstanceRef.current;
    const group = markersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // Custom icons
    const officeIcon = L.divIcon({
      className: 'custom-office-pin',
      html: `<div style="background-color: #1e3a8a; color: white; border: 2px solid white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);">🏢</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const userIcon = L.divIcon({
      className: 'custom-user-pin',
      html: `<div style="background-color: #16a34a; color: white; border: 2px solid white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);">📍</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    // Render active geofence zones
    zones.forEach((zone) => {
      // Circle for 500m geofence radius
      L.circle([zone.latitude, zone.longitude], {
        radius: zone.radiusMeters,
        color: zone.isActive ? '#10b981' : '#94a3b8',
        fillColor: zone.isActive ? '#10b981' : '#94a3b8',
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(group);

      // Office Center Marker
      L.marker([zone.latitude, zone.longitude], { icon: officeIcon })
        .bindPopup(`<b>${zone.nameEn}</b><br/>${zone.nameAr}<br/>Radius: ${zone.radiusMeters}m`)
        .addTo(group);
    });

    // Render user location if provided
    if (userLat !== undefined && userLon !== undefined) {
      L.marker([userLat, userLon], { icon: userIcon })
        .bindPopup(`<b>Current Location</b><br/>Lat: ${userLat.toFixed(5)}, Lon: ${userLon.toFixed(5)}`)
        .addTo(group);

      // Draw dashed line to primary zone
      if (primaryZone) {
        L.polyline(
          [
            [userLat, userLon],
            [primaryZone.latitude, primaryZone.longitude],
          ],
          {
            color: '#3b82f6',
            dashArray: '5, 8',
            weight: 2,
          }
        ).addTo(group);
      }
    }

    requestAnimationFrame(() => map.invalidateSize({ animate: false }));

    return undefined;
  }, [zones, userLat, userLon, interactive, onLocationSelect]);

  return (
    <div
      ref={mapContainerRef}
      style={{ height, width: '100%' }}
      className="rounded-xl overflow-hidden border border-slate-200 shadow-inner"
    />
  );
};
