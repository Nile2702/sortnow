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
    fetch("/api/v1/seller/auth/me")
      .then((r) => {
        if (!r.ok) {
          router.push("/seller/login");
          setLoading(false);
          return null;
        }
        return r.json();
      })
      .then((me) => {
        if (!me) return;
        fetch(`/api/v1/stores/${me.slug}`)
          .then((r) => r.json())
          .then(setStore)
          .finally(() => setLoading(false));
      });
  }, [router]);

  return { store, loading };
}
