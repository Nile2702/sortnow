"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "../../../lib/toast";

interface StoreOption {
  id: string;
  slug: string;
  name: string;
}

export default function SellerLoginPage() {
  const router = useRouter();
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeSlug, setStoreSlug] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/seller/stores")
      .then((r) => r.json())
      .then((list: StoreOption[]) => {
        setStores(list);
        if (list.length > 0) setStoreSlug(list[0].slug);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/v1/seller/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeSlug, password }),
    });

    if (!res.ok) {
      setSubmitting(false);
      setError("Incorrect store or password. Try again.");
      return;
    }

    showToast("Signed in");
    router.push("/seller");
    router.refresh();
  }

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: "60px 20px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Seller Portal</h1>
      <p style={{ color: "#64748b", fontSize: 14, marginBottom: 28 }}>Sign in to manage your store.</p>

      <form onSubmit={handleSubmit} className="sio-card" style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: 24 }}>
        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Store</label>
        <select
          value={storeSlug}
          onChange={(e) => setStoreSlug(e.target.value)}
          required
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, marginBottom: 16 }}
        >
          {stores.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>

        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, marginBottom: 16 }}
        />

        {error && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 16 }}>{error}</p>}

        <button
          type="submit"
          disabled={submitting || !storeSlug}
          style={{ width: "100%", padding: "11px 18px", borderRadius: 8, border: "none", background: "#0f172a", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 16, textAlign: "center" }}>
          Demo password for every seed store: <code>sortitout123</code>
        </p>
      </form>
    </main>
  );
}
