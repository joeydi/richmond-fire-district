const EARTH_RADIUS_M = 6371000;
const COMPASS_POINTS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

const toRadians = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in meters */
export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Initial bearing from point 1 to point 2 as a 16-point compass direction */
export function compassBearing(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const dLon = toRadians(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dLon);
  const degrees = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return COMPASS_POINTS[Math.round(degrees / 22.5) % 16];
}
