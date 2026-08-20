/**
 * Geospatial utility functions for Tolee Radar.
 * High performance, scalable bounding box & Haversine distance calculations.
 */

export const EARTH_RADIUS_KM = 6371;

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula (in kilometers).
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((EARTH_RADIUS_KM * c).toFixed(2));
}

/**
 * Calculates latitude and longitude bounding box min/max for efficient
 * indexed database queries prior to exact Haversine filtering.
 * 
 * 1 degree latitude ~ 111.045 km
 * 1 degree longitude ~ 111.045 km * cos(latitude)
 */
export function getBoundingBox(
  latitude: number,
  longitude: number,
  radiusKm: number
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  // Add a 10% safety buffer to the bounding box
  const bufferedRadius = radiusKm * 1.1;

  const latDelta = bufferedRadius / 111.045;
  const minLat = latitude - latDelta;
  const maxLat = latitude + latDelta;

  const latRad = (latitude * Math.PI) / 180;
  const cosLat = Math.max(Math.cos(latRad), 0.0001);
  const lngDelta = bufferedRadius / (111.045 * cosLat);
  const minLng = longitude - lngDelta;
  const maxLng = longitude + lngDelta;

  return { minLat, maxLat, minLng, maxLng };
}

/**
 * Formats a distance in kilometers into user-friendly text (e.g. "0.8 km away" or "450 m away").
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 0.1) {
    return 'Just nearby';
  }
  if (distanceKm < 1.0) {
    return `${Math.round(distanceKm * 1000)} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}
