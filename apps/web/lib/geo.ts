// Pure coordinate math only - no server-only imports (pg, fs, etc.) - so this
// is safe to import from both server code (lib/seed-data.ts) and client
// components (e.g. app/shops/page.tsx's area-name search), unlike
// lib/seed-data.ts itself, which pulls in the Postgres client at module scope
// and would break if imported into client-side code.
const EARTH_RADIUS_KM = 6371;

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
