// Shared shopper location preference - the app-style mobile header (and any
// future page) reads/writes this so a location picked on one page is
// reflected everywhere else, the same pattern cart.ts/wishlist.ts already
// use for other per-shopper state. The homepage's own pincode/radius search
// is the source of truth for actual filtering; this is just the last choice
// remembered for display and for jumping back into that search from
// elsewhere (e.g. the search results page has no location filter of its
// own).
export interface QuickMarket {
  label: string;
  pincode: string;
}

export const QUICK_MARKETS: QuickMarket[] = [
  { label: "Bandra, Mumbai", pincode: "400050" },
  { label: "Commercial Street, Bengaluru", pincode: "560001" },
  { label: "T. Nagar, Chennai", pincode: "600017" },
  { label: "Chandni Chowk, Delhi", pincode: "110006" },
  { label: "Charminar, Hyderabad", pincode: "500002" },
  { label: "FC Road, Pune", pincode: "411005" },
  { label: "Gariahat, Kolkata", pincode: "700019" },
];

// A location can come from a typed/quick-picked PIN code (resolved
// server-side via the india-post-pincode dataset) or directly from the
// browser's Geolocation API. Raw lat/lng is carried all the way through to
// discoverStores()/searchProducts() (see lib/seed-data.ts) rather than
// converted to a PIN code, since that dataset has no reverse (coordinates
// -> PIN) lookup - only /api/v1/location/label calls a real reverse-
// geocoding service (OpenStreetMap Nominatim), and only to get a friendly
// area name to display, not to drive the actual distance filtering.
export type LocationPref = { label: string; pincode: string } | { label: string; lat: number; lng: number };

// Looks up a real, friendly area name for a resolved location - "PIN
// 400050" or a generic "Your Location" isn't something a shopper
// recognizes. Best-effort: falls back to the given default label (e.g. the
// raw PIN code, or "Your Location") if the lookup fails or comes back
// empty, so a slow/blocked network request never blocks completing sign-up.
export async function resolveAreaLabel(origin: { pincode: string } | { lat: number; lng: number }, fallback: string): Promise<string> {
  try {
    const params = "pincode" in origin ? `pincode=${origin.pincode}` : `lat=${origin.lat}&lng=${origin.lng}`;
    const res = await fetch(`/api/v1/location/label?${params}`);
    if (!res.ok) return fallback;
    const data = await res.json();
    return data.label || fallback;
  } catch {
    return fallback;
  }
}

const KEY = "sio_location_pref";
const PROMPT_SEEN_KEY = "sio_location_prompt_seen";
export const LOCATION_CHANGED_EVENT = "sio:location-changed";

export function getLocationPref(): LocationPref {
  if (typeof window === "undefined") return QUICK_MARKETS[0];
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Corrupt or inaccessible storage (private mode, quota) - fall through
    // to the default market rather than breaking the header.
  }
  return QUICK_MARKETS[0];
}

export function setLocationPref(pref: LocationPref) {
  try {
    localStorage.setItem(KEY, JSON.stringify(pref));
    window.dispatchEvent(new CustomEvent(LOCATION_CHANGED_EVENT, { detail: pref }));
  } catch {
    // Best-effort - a shopper in private/blocked-storage mode just doesn't
    // get their location remembered across pages, nothing else breaks.
  }
}

// Whether the "allow location access" prompt has already been shown once on
// this device - it should ask on a shopper's very first visit, not on
// every single page load or return trip.
export function hasSeenLocationPrompt(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(PROMPT_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

export function markLocationPromptSeen() {
  try {
    localStorage.setItem(PROMPT_SEEN_KEY, "1");
  } catch {
    // Best-effort - worst case the prompt reappears next visit.
  }
}
