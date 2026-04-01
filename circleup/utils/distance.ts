/**
 * Calculates the distance between two points in kilometers using the Haversine formula.
 */
export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Calculates the delivery fee based on distance:
 * - < 1km: ₹49 (if delivery is chosen)
 * - > 1km: ₹19 per km (mandatory)
 */
export function calculateDeliveryFee(distance: number): number {
  if (distance <= 1) {
    return 49;
  }
  return Math.ceil(distance) * 19;
}
