export function getDistanceFromLatLonInNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Radius of the Earth in nautical miles
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

export function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
