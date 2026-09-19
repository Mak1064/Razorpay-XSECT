import type { DistanceBand } from "@workspace/db";

export const DISTANCE_BAND_LABELS: Record<DistanceBand, string> = {
  lt_250m: "<250m",
  "250m_500m": "250–500m",
  "500m_1km": "500m–1km",
  "1km_2km": "1–2km",
  "2km_5km": "2–5km",
  "5km_plus": "5km+",
};

export const DISTANCE_BAND_ORDER: DistanceBand[] = ["lt_250m", "250m_500m", "500m_1km", "1km_2km", "2km_5km", "5km_plus"];

/** Haversine distance in kilometres. */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(s));
}

export function bandForKm(km: number): DistanceBand {
  if (km < 0.25) return "lt_250m";
  if (km < 0.5) return "250m_500m";
  if (km < 1) return "500m_1km";
  if (km < 2) return "1km_2km";
  if (km < 5) return "2km_5km";
  return "5km_plus";
}

/** Approximate midpoint distance in km for a band (used for scoring). */
export function bandMidpointKm(band: DistanceBand): number {
  switch (band) {
    case "lt_250m": return 0.15;
    case "250m_500m": return 0.4;
    case "500m_1km": return 0.75;
    case "1km_2km": return 1.5;
    case "2km_5km": return 3.5;
    default: return 8;
  }
}

/** Known demo areas with approximate centroids. Used for clusters and simulation. Never exposed as exact user coordinates. */
export const AREAS: Array<{ city: string; area: string; lat: number; lng: number }> = [
  { city: "Bengaluru", area: "Koramangala", lat: 12.9352, lng: 77.6245 },
  { city: "Bengaluru", area: "Indiranagar", lat: 12.9784, lng: 77.6408 },
  { city: "Bengaluru", area: "HSR Layout", lat: 12.9116, lng: 77.6389 },
  { city: "Bengaluru", area: "Whitefield", lat: 12.9698, lng: 77.7500 },
  { city: "Bengaluru", area: "Bellandur", lat: 12.9260, lng: 77.6762 },
  { city: "Bengaluru", area: "MG Road", lat: 12.9756, lng: 77.6066 },
  { city: "Bengaluru", area: "CBD", lat: 12.9719, lng: 77.5937 },
  { city: "Bengaluru", area: "Electronic City", lat: 12.8452, lng: 77.6602 },
  { city: "Mumbai", area: "Bandra Kurla Complex", lat: 19.0669, lng: 72.8697 },
  { city: "Mumbai", area: "Lower Parel", lat: 18.9982, lng: 72.8302 },
  { city: "Mumbai", area: "Powai", lat: 19.1176, lng: 72.9060 },
  { city: "Mumbai", area: "Andheri East", lat: 19.1136, lng: 72.8697 },
  { city: "Delhi", area: "Connaught Place", lat: 28.6315, lng: 77.2167 },
  { city: "Delhi", area: "Hauz Khas", lat: 28.5494, lng: 77.2001 },
  { city: "Gurgaon", area: "Cyber City", lat: 28.4950, lng: 77.0890 },
  { city: "Gurgaon", area: "Golf Course Road", lat: 28.4595, lng: 77.0966 },
  { city: "Hyderabad", area: "HITEC City", lat: 17.4435, lng: 78.3772 },
  { city: "Hyderabad", area: "Gachibowli", lat: 17.4401, lng: 78.3489 },
  { city: "Hyderabad", area: "Banjara Hills", lat: 17.4156, lng: 78.4347 },
  { city: "Pune", area: "Koregaon Park", lat: 18.5362, lng: 73.8939 },
  { city: "Pune", area: "Hinjewadi", lat: 18.5912, lng: 73.7389 },
  { city: "Pune", area: "Baner", lat: 18.5590, lng: 73.7868 },
];

export function findArea(city: string, area: string) {
  return AREAS.find((a) => a.city.toLowerCase() === city.toLowerCase() && a.area.toLowerCase() === area.toLowerCase()) ?? null;
}
