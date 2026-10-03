"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export interface SellerStore {
  id: string;
  slug: string;
  name: string;
  status: string;
  city: string;
  pincode: string;
  localMarket: string;
  phone?: string;
}

/** Resolves the signed-in seller's store from their session cookie, redirecting to login if absent. */
export function useSellerStore() {
  const router = useRouter();
  const [store, setStore] = useState<SellerStore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/v1/seller/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => {
        if (!active) return undefined;
        if (!me) {
          router.push("/seller/login");
          return undefined;
        }
        return fetch(`/api/v1/stores/${me.slug}`)
          .then((r) => r.json())
          .then((s) => {
            if (active) setStore(s);
          });
      })
      // A dropped/failed request here (network hiccup, a flaky tunnel) used
      // to be an unhandled rejection - with nothing after it to run
      // setLoading(false), every page gated on this hook's `loading` was
      // stuck showing "Loading…" forever, with no error and no way out.
      // Treated the same as "not signed in" - send them to login rather
      // than leave them stranded.
      .catch(() => {
        if (active) router.push("/seller/login");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  return { store, loading };
}
