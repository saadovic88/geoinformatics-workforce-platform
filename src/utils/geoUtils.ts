import { GeofenceZone } from '../types';

/**
 * Calculates great-circle distance between two coordinates in meters using the Haversine formula
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export interface GeofenceCheckResult {
  isInside: boolean;
  distanceMeters: number;
  nearestZone: GeofenceZone;
}

/**
 * Checks if coordinates fall within any active geofence zone
 */
export function evaluateGeofence(
  lat: number,
  lon: number,
  zones: GeofenceZone[]
): GeofenceCheckResult {
  const activeZones = zones.filter((z) => z.isActive);
  if (activeZones.length === 0) {
    return {
      // A missing/disabled policy must fail closed. Treating it as inside the
      // office would silently turn off attendance verification.
      isInside: false,
      distanceMeters: Number.POSITIVE_INFINITY,
      nearestZone: zones[0] || {
        id: 'default',
        nameEn: 'Office',
        nameAr: 'المكتب',
        latitude: lat,
        longitude: lon,
        radiusMeters: 500,
        isActive: true,
        isPrimary: true,
      },
    };
  }

  let minDistance = Infinity;
  let nearest = activeZones[0];
  let isInside = false;

  for (const zone of activeZones) {
    const dist = calculateHaversineDistanceMeters(lat, lon, zone.latitude, zone.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = zone;
    }
    if (dist <= zone.radiusMeters) {
      isInside = true;
    }
  }

  return {
    isInside,
    distanceMeters: minDistance,
    nearestZone: nearest,
  };
}

/**
 * Retrieves user geolocation safely with support for simulated positions in dev/iframe
 */
export async function getCurrentCoordinates(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this device.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        reject(new Error(`Geolocation unavailable (${err.code}).`));
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  });
}
