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

const KEY = "sio_location_pref";
export const LOCATION_CHANGED_EVENT = "sio:location-changed";

export function getLocationPref(): QuickMarket {
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

export function setLocationPref(pref: QuickMarket) {
  try {
    localStorage.setItem(KEY, JSON.stringify(pref));
    window.dispatchEvent(new CustomEvent(LOCATION_CHANGED_EVENT, { detail: pref }));
  } catch {
    // Best-effort - a shopper in private/blocked-storage mode just doesn't
    // get their location remembered across pages, nothing else breaks.
  }
}
