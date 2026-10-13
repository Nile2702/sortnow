import { NextRequest, NextResponse } from "next/server";
import { lookupPincode } from "india-post-pincode";

// Resolves location text in three directions, all free and keyless:
//
// - PIN code -> label: via the india-post-pincode dataset already used for
//   distance (district/state only - that package has no neighbourhood-level
//   data, so "Bandra" specifically only shows up when the PIN matches one of
//   the hand-curated QUICK_MARKETS entries, handled client-side before this
//   route is even called).
// - Coordinates -> label: that dataset is PIN-to-coordinates only, not
//   searchable by coordinates, so this calls OpenStreetMap's free Nominatim
//   reverse-geocoding API instead.
// - Area/locality name -> coordinates: the /shops search box needs this so
//   typing a real neighbourhood (e.g. "Andheri") that isn't literally stored
//   in any store's city/localMarket text can still surface nearby stores -
//   this calls Nominatim's forward /search endpoint, and the caller does its
//   own radius check against store coordinates with the result.
//
// Nominatim is rate- and usage-policy-limited
// (nominatim.org/release-docs/latest/api/Usage-Policy), which is fine at
// this app's traffic level. A real production deployment at real scale
// would use a paid geocoding provider instead.
const NOMINATIM_USER_AGENT = "SortNow/1.0 (hyperlocal fashion marketplace, sortnow.vercel.app)";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pincode = searchParams.get("pincode");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const area = searchParams.get("area");

  if (pincode) {
    const hit = lookupPincode(pincode);
    if (!hit) return NextResponse.json({ label: null });
    return NextResponse.json({ label: `${hit.district}, ${hit.state}` });
  }

  if (lat && lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=14`,
        { headers: { "User-Agent": NOMINATIM_USER_AGENT } }
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

  // Forward lookup: a free-text area/locality name (e.g. "Andheri") -> coordinates,
  // so a shopper searching a neighbourhood that isn't literally a store's stored
  // city/localMarket text can still match stores nearby, by resolving the area to
  // a point and letting the caller do a radius check against store coordinates.
  // Same free Nominatim service as the reverse lookup above, just its /search
  // endpoint instead of /reverse.
  if (area && area.trim().length >= 3) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(area.trim())}`,
        { headers: { "User-Agent": NOMINATIM_USER_AGENT } }
      );
      if (!res.ok) return NextResponse.json({ result: null });
      const results = await res.json();
      const hit = Array.isArray(results) ? results[0] : null;
      if (!hit) return NextResponse.json({ result: null });
      return NextResponse.json({ result: { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon), label: hit.display_name as string } });
    } catch {
      return NextResponse.json({ result: null });
    }
  }

  return NextResponse.json({ error: "invalid_request", message: "pincode, lat/lng, or area is required." }, { status: 400 });
}
