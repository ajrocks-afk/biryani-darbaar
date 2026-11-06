export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const R = 6371;
	const rad = (d: number) => (d * Math.PI) / 180;
	const dLat = rad(lat2 - lat1);
	const dLng = rad(lng2 - lng1);
	const a =
	  Math.sin(dLat / 2) ** 2 +
	  Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(a));
  }
  
  type Geo = { lat: number; lng: number; delivery_radius_km: number };
  
  /** Outlets that deliver to the point come first, nearest first. */
  export function rankOutlets<T extends Geo>(outlets: T[], p: { lat: number; lng: number }) {
	return outlets
	  .map((o) => {
		const distanceKm = haversineKm(p.lat, p.lng, Number(o.lat), Number(o.lng));
		return { ...o, distanceKm, inRange: distanceKm <= Number(o.delivery_radius_km) };
	  })
	  .sort((a, b) => Number(b.inRange) - Number(a.inRange) || a.distanceKm - b.distanceKm);
  }