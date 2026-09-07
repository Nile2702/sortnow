"use client";

import { useEffect, useState } from "react";
import { getSellerStoreSlug } from "./seller-session";

export interface SellerStore {
  id: string;
  slug: string;
  name: string;
  status: string;
  city: string;
  pincode: string;
  localMarket: string;
}

/** Resolves the seller's currently-selected store, re-fetching when they switch it. */
export function useSellerStore() {
  const [store, setStore] = useState<SellerStore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function load() {
      setLoading(true);
      fetch(`/api/v1/stores/${getSellerStoreSlug()}`)
        .then((r) => r.json())
        .then(setStore)
        .finally(() => setLoading(false));
    }
    load();
    window.addEventListener("sio:seller-store-changed", load);
    return () => window.removeEventListener("sio:seller-store-changed", load);
  }, []);

  return { store, loading };
}
