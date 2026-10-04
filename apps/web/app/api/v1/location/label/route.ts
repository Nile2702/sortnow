import { NextRequest, NextResponse } from "next/server";
import { lookupPincode } from "india-post-pincode";

// Resolves a genuine area name for the location picker/prompt to show,
// instead of a raw "PIN 400050" or a generic "Your Location" - a shopper
// wants to see where they actually are, not a code. Two paths:
//
// - A PIN code resolves via the same india-post-pincode dataset already
//   used for distance (district/state only - that package has no
//   neighbourhood-level data, so "Bandra" specifically only shows up when
//   the PIN matches one of the hand-curated QUICK_MARKETS entries, handled
//   client-side before this route is even called).
// - Raw GPS coordinates (from the browser's Geolocation API) have no
//   equivalent reverse lookup in that dataset (it's PIN-to-coordinates
//   only, not searchable by coordinates), so this calls OpenStreetMap's
//   free Nominatim reverse-geocoding API instead - keyless, but rate- and
//   usage-policy-limited (nominatim.org/release-docs/latest/api/Usage-Policy),
//   which is fine at this app's traffic level. A real production
//   deployment would use a paid geocoding provider instead.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pincode = searchParams.get("pincode");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (pincode) {
    const hit = lookupPincode(pincode);
    if (!hit) return NextResponse.json({ label: null });
    return NextResponse.json({ label: `${hit.district}, ${hit.state}` });
  }

  if (lat && lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=14`,
        { headers: { "User-Agent": "SortNow-Demo/1.0 (hyperlocal fashion marketplace demo)" } }
      );
      if (!res.ok) return NextResponse.json({ label: null });
      const data = await res.json();
      const a = data.address ?? {};
      const area = a.suburb || a.neighbourhood || a.city_district || a.town || a.village;
      const city = a.city || a.state_district || a.state;
      const label = [area, city].filter(Boolean).join(", ") || null;
      return NextResponse.json({ label });
    } catch {
      return NextResponse.json({ label: null });
    }
  }

  return NextResponse.json({ error: "invalid_request", message: "pincode or lat/lng is required." }, { status: 400 });
}
