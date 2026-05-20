/**
 * utils/geo-utils.mjs
 * Geographic utility functions.
 */
export function getDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = value => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

export function calculateTravelMinutes(distanceKm) {
  return Math.max(5, Math.round(distanceKm / 18 * 60));
}
