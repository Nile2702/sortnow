"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SmartSort, listSmartSorts, deleteSmartSort, filtersToQuery } from "../../lib/smart-sorts";

export default function MySortsPage() {
  const [sorts, setSorts] = useState<SmartSort[]>([]);
  const router = useRouter();

  useEffect(() => {
    setSorts(listSmartSorts());
  }, []);

  function apply(sort: SmartSort) {
    router.push(`/?${filtersToQuery(sort.filters)}`);
  }

  function remove(id: string) {
    deleteSmartSort(id);
    setSorts(listSmartSorts());
  }

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "8px 16px 40px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>My Sorts</h1>
      <p style={{ color: "#64748b", marginBottom: 24 }}>
        Saved filters — apply one any time to shop the exact same sort again, wherever you are.
      </p>

      {sorts.length === 0 ? (
        <p style={{ color: "#64748b" }}>
          No saved sorts yet. Go to the homepage, set up a filter under "Shop in Sort", and save it.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sorts.map((s) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#fff",
                padding: 16,
                borderRadius: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{s.name}</div>
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  {s.filters.gender !== "all" ? s.filters.gender : "All"}
                  {s.filters.subCategory ? ` · ${s.filters.subCategory}` : ""} · PIN {s.filters.pincode} · {s.filters.radiusKm} km
                  {s.filters.minPrice != null || s.filters.maxPrice != null
                    ? ` · ₹${s.filters.minPrice ?? 0}–${s.filters.maxPrice ?? "∞"}`
                    : ""}
                  {s.filters.size ? ` · Size ${s.filters.size}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => apply(s)}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#0f172a", color: "#fff", cursor: "pointer" }}
                >
                  Shop this sort
                </button>
                <button
                  onClick={() => remove(s.id)}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
