"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export interface MapShop {
  id: string;
  slug: string;
  name: string;
  category: string;
  localMarket: string;
  latitude: number;
  longitude: number;
}

// Shown instead of the map whenever no token is configured, so a dev
// checkout without NEXT_PUBLIC_MAPBOX_TOKEN set (see .env.example) doesn't
// just render a blank/broken box - the list view on /shops still works
// fine without this.
function MapUnavailable() {
  return (
    <div
      style={{
        height: 420,
        borderRadius: 16,
        border: "1px dashed #e2e8f0",
        background: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#94a3b8",
        fontSize: 13,
        textAlign: "center",
        padding: 20,
      }}
    >
      Map view needs a Mapbox token (NEXT_PUBLIC_MAPBOX_TOKEN) to be configured.
    </div>
  );
}

export function StoreMap({
  shops,
  userLocation,
  onSelect,
}: {
  shops: MapShop[];
  userLocation?: { lat: number; lng: number } | null;
  onSelect?: (shop: MapShop) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!TOKEN || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [userLocation?.lng ?? 77.209, userLocation?.lat ?? 28.6139],
      zoom: 11,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => setReady(true));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pins + a fitBounds covering every shop (plus the shopper's own
  // location, when known) re-run whenever the filtered shop list changes -
  // keeps the map framed on whatever's actually on screen instead of a
  // fixed zoom that might crop half the pins or sit mostly empty.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = new mapboxgl.LngLatBounds();

    if (userLocation) {
      const el = document.createElement("div");
      el.style.width = "16px";
      el.style.height = "16px";
      el.style.borderRadius = "50%";
      el.style.background = "#1e3a8a";
      el.style.border = "3px solid #fff";
      el.style.boxShadow = "0 0 0 2px #1e3a8a";
      new mapboxgl.Marker({ element: el }).setLngLat([userLocation.lng, userLocation.lat]).addTo(map);
      bounds.extend([userLocation.lng, userLocation.lat]);
    }

    shops.forEach((shop) => {
      const el = document.createElement("div");
      el.textContent = "📍";
      el.style.fontSize = "26px";
      el.style.cursor = "pointer";
      el.style.lineHeight = "1";
      el.title = shop.name;

      const popup = new mapboxgl.Popup({ offset: 20, closeButton: false }).setHTML(
        `<div style="font-family:inherit;font-size:13px;min-width:140px">
           <strong>${escapeHtml(shop.name)}</strong><br/>
           <span style="color:#64748b">${escapeHtml(shop.localMarket)}</span>
         </div>`
      );

      const marker = new mapboxgl.Marker({ element: el }).setLngLat([shop.longitude, shop.latitude]).setPopup(popup).addTo(map);
      el.addEventListener("click", () => onSelect?.(shop));
      markersRef.current.push(marker);
      bounds.extend([shop.longitude, shop.latitude]);
    });

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 500 });
    }
  }, [shops, userLocation, ready, onSelect]);

  if (!TOKEN) return <MapUnavailable />;

  return <div ref={containerRef} style={{ height: 420, borderRadius: 16, overflow: "hidden", border: "1px solid #f1f5f9" }} />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
