"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { StoreRatingBadge } from "../../components/StoreRatingBadge";
import { ListIcon, MapIcon, LightningIcon } from "../../components/icons";
import { getLocationPref } from "../../lib/location";
import { haversineKm } from "../../lib/geo";

// mapbox-gl alone is ~500KB - split out of the initial /shops bundle so
// shoppers who never touch "Map" view (the default is List) don't pay for
// it, same reasoning as any other heavy, optional-view dependency.
const StoreMap = dynamic(() => import("../../components/StoreMap").then((m) => m.StoreMap), {
  ssr: false,
  loading: () => <div className="sio-skeleton" style={{ height: 420, borderRadius: 16 }} />,
});

interface Shop {
  id: string;
  slug: string;
  name: string;
  category: string;
  city: string;
  pincode: string;
  localMarket: string;
  productCount: number;
  latitude: number;
  longitude: number;
  rating: { average: number; count: number };
  liveSale?: { headline: string; discountLabel: string; endsAt: string } | null;
  boostedUntil?: string | null;
}

function isSaleActive(sale?: Shop["liveSale"]) {
  return !!sale && new Date(sale.endsAt).getTime() > Date.now();
}

function isBoosted(boostedUntil?: string | null) {
  return !!boostedUntil && new Date(boostedUntil).getTime() > Date.now();
}

function SkeletonCard() {
  return <div className="sio-skeleton" style={{ borderRadius: 16, height: 110 }} />;
}

export default function ShopsPage() {
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [view, setView] = useState<"list" | "map">("list");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [storeFilter, setStoreFilter] = useState<string[] | null>(null);
  // Populated when the typed search doesn't match any store's own text (name/
  // city/pincode/localMarket) - see the debounced effect below. Undefined
  // means "no area lookup has run for this query", distinct from an empty Set
  // (looked it up, found nothing nearby), so the direct-text match above
  // isn't masked by a stale/irrelevant area result.
  const [areaMatchSlugs, setAreaMatchSlugs] = useState<Set<string> | undefined>(undefined);

  useEffect(() => {
    fetch("/api/v1/shops")
      .then((r) => r.json())
      .then(setShops)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Lets a persistent "Stores near me" map icon elsewhere in the app (the
  // mobile app header, the desktop header) deep-link straight into Map view
  // via /shops?view=map, instead of landing on List and needing a second tap.
  // A search/category page's own "Explore on Map" button adds `stores=` (a
  // comma-separated list of store slugs from whatever products matched that
  // search) so the map opens scoped to just those stores instead of every
  // store on the platform.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "map") setView("map");
    const stores = params.get("stores");
    if (stores) setStoreFilter(stores.split(",").filter(Boolean));
  }, []);

  // Only usable for centering the map (lat/lng) - a plain PIN code has no
  // coordinates on the client, and re-resolving it would need a server
  // round-trip this page doesn't otherwise need.
  useEffect(() => {
    const pref = getLocationPref();
    if ("lat" in pref && "lng" in pref) setUserLocation({ lat: pref.lat, lng: pref.lng });
  }, []);

  // Lets searching a real neighbourhood name (e.g. "Andheri") surface stores
  // near it even when no store's own name/city/pincode/localMarket text
  // contains that word - debounced so it only fires once typing pauses, and
  // skipped entirely when the typed text already matches a store directly
  // (the common case), since that's free and this costs a network round-trip
  // to a rate-limited third-party service.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setAreaMatchSlugs(undefined);
      return;
    }
    const lower = q.toLowerCase();
    const hasDirectMatch = shops.some(
      (s) => s.name.toLowerCase().includes(lower) || s.city.toLowerCase().includes(lower) || s.pincode.includes(lower) || s.localMarket.toLowerCase().includes(lower)
    );
    if (hasDirectMatch) {
      setAreaMatchSlugs(undefined);
      return;
    }

    let cancelled = false;
    const AREA_RADIUS_KM = 8;
    const timer = setTimeout(() => {
      fetch(`/api/v1/location/label?area=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return;
          const result = data?.result as { lat: number; lng: number } | null;
          if (!result) {
            setAreaMatchSlugs(new Set());
            return;
          }
          const nearby = shops.filter((s) => haversineKm(result.lat, result.lng, s.latitude, s.longitude) <= AREA_RADIUS_KM);
          setAreaMatchSlugs(new Set(nearby.map((s) => s.slug)));
        })
        .catch(() => {
          if (!cancelled) setAreaMatchSlugs(new Set());
        });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, shops]);

  const cities = useMemo(() => Array.from(new Set(shops.map((s) => s.city))).sort(), [shops]);
  const categories = useMemo(() => Array.from(new Set(shops.map((s) => s.category))).sort(), [shops]);

  const filtered = shops.filter((s) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.pincode.includes(q) ||
      s.localMarket.toLowerCase().includes(q) ||
      areaMatchSlugs?.has(s.slug);
    const matchesCategory = category === "all" || s.category === category;
    const matchesStoreFilter = !storeFilter || storeFilter.includes(s.slug);
    return matchesQuery && matchesCategory && matchesStoreFilter;
  });

  return (
    <main style={{ maxWidth: 1440, margin: "0 auto", padding: "24px 16px 48px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Explore All Shops</h1>
      <p style={{ color: "var(--sio-muted)", marginBottom: storeFilter ? 12 : 24 }}>
        Every boutique and store listed on SORT NOW — {shops.length > 0 ? `${shops.length} and counting` : "browse and pick one to shop"}.
      </p>

      {storeFilter && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--sio-ink)",
            border: "1px solid var(--sio-ink)",
            color: "#fff",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 13,
            marginBottom: 24,
          }}
        >
          <span>Showing only stores that had a match in your search.</span>
          <button
            type="button"
            onClick={() => {
              setStoreFilter(null);
              router.replace("/shops?view=map");
            }}
            style={{ marginLeft: "auto", background: "none", border: "none", color: "#fff", fontWeight: 700, textDecoration: "underline", cursor: "pointer", fontSize: 13 }}
          >
            Show all stores
          </button>
        </div>
      )}

      <section
        className="sio-card"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          background: "#fff",
          padding: 16,
          borderRadius: 16,
          border: "1px solid var(--sio-cream)",
          boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
          marginBottom: 28,
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search shops, cities, or pincodes…"
          style={{ flex: "1 1 220px", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--sio-line)", fontSize: 14 }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={() => setCategory("all")} style={pillStyle(category === "all")}>
            All
          </button>
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c)} style={{ ...pillStyle(category === c), textTransform: "capitalize" }}>
              {c}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4, marginLeft: "auto", background: "var(--sio-cream)", borderRadius: 999, padding: 3 }}>
          <button onClick={() => setView("list")} style={{ ...toggleStyle(view === "list"), display: "flex", alignItems: "center", gap: 5 }}>
            <ListIcon size={13} /> List
          </button>
          <button onClick={() => setView("map")} style={{ ...toggleStyle(view === "map"), display: "flex", alignItems: "center", gap: 5 }}>
            <MapIcon size={13} /> Map
          </button>
        </div>
      </section>

      {view === "map" && !loading && (
        <div style={{ marginBottom: 28 }}>
          <StoreMap
            shops={filtered}
            userLocation={userLocation}
            onSelect={(shop) => router.push(`/store/${shop.slug}`)}
          />
          <p style={{ fontSize: 12, color: "var(--sio-muted)", marginTop: 8 }}>Tap a pin to open that store.</p>
        </div>
      )}

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p style={{ color: "var(--sio-muted)" }}>No shops match your search.</p>
      ) : view === "map" ? null : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {filtered.map((s, i) => (
            <Link
              key={s.id}
              href={`/store/${s.slug}`}
              className="sio-card sio-fade-in"
              style={{
                display: "flex",
                gap: 14,
                alignItems: "center",
                background: "#fff",
                borderRadius: 16,
                padding: 16,
                textDecoration: "none",
                color: "inherit",
                border: "1px solid var(--sio-cream)",
                boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
                animationDelay: `${i * 40}ms`,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  background: `hsl(${(s.name.charCodeAt(0) * 37) % 360}, 60%, 92%)`,
                  color: `hsl(${(s.name.charCodeAt(0) * 37) % 360}, 45%, 35%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                {s.name.charAt(0)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{s.name}</h3>
                  {isBoosted(s.boostedUntil) && (
                    <span
                      style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.03em", color: "var(--sio-pending)", border: "1px solid var(--sio-pending)", borderRadius: 999, padding: "1px 7px", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 3 }}
                    >
                      <LightningIcon size={9} /> Featured
                    </span>
                  )}
                  {isSaleActive(s.liveSale) && (
                    <span
                      className="sio-breathe"
                      style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.03em", color: "var(--sio-error)", border: "1px solid var(--sio-error)", borderRadius: 999, padding: "1px 7px", textTransform: "uppercase" }}
                    >
                      ● Live
                    </span>
                  )}
                </div>
                <div style={{ color: "var(--sio-muted)", fontSize: 13, marginTop: 2 }}>
                  {s.localMarket}, {s.city}
                </div>
                <div style={{ fontSize: 12, color: "var(--sio-muted)", marginTop: 4, textTransform: "capitalize" }}>
                  {s.category} · {s.productCount} products
                </div>
                <div style={{ marginTop: 6 }}>
                  <StoreRatingBadge average={s.rating.average} count={s.rating.count} />
                </div>
                {isSaleActive(s.liveSale) && (
                  <div style={{ fontSize: 12, color: "var(--sio-error)", marginTop: 4, fontWeight: 600 }}>{s.liveSale!.discountLabel}</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

function toggleStyle(active: boolean): React.CSSProperties {
  return {
    padding: "7px 14px",
    borderRadius: 999,
    border: "none",
    background: active ? "#fff" : "transparent",
    color: active ? "var(--sio-ink)" : "var(--sio-muted)",
    boxShadow: active ? "0 1px 2px rgba(15,23,42,0.1)" : "none",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  };
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    padding: "8px 16px",
    borderRadius: 999,
    border: active ? "1px solid var(--sio-ink)" : "1px solid var(--sio-line)",
    background: active ? "var(--sio-ink)" : "#fff",
    color: active ? "#fff" : "var(--sio-ink)",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
  };
}
