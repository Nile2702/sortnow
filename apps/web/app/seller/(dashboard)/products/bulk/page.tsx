"use client";

import { useState } from "react";
import Link from "next/link";
import { useSellerStore } from "../../../../../lib/use-seller-store";
import { parseCsv, SAMPLE_CSV } from "../../../../../lib/csv";

interface ImportResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: { row: number; message: string }[];
}

export default function BulkImportPage() {
  const { store, loading: storeLoading } = useSellerStore();
  const [csvText, setCsvText] = useState("");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setCsvText(text);
      setRows(parseCsv(text));
      setResult(null);
    };
    reader.readAsText(file);
  }

  function handlePasteChange(text: string) {
    setCsvText(text);
    setRows(text.trim() ? parseCsv(text) : []);
    setResult(null);
  }

  async function handleImport() {
    if (!store || rows.length === 0) return;
    setImporting(true);
    const res = await fetch(`/api/v1/seller/stores/${store.id}/products/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    setResult(await res.json());
    setImporting(false);
  }

  if (storeLoading || !store) {
    return <main style={{ maxWidth: 800, margin: "0 auto", padding: 40 }}>Loading…</main>;
  }

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px 60px" }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/seller/products" style={{ fontSize: 13, color: "#64748b" }}>
          ← Back to Products
        </Link>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Bulk Upload</h1>
      <p style={{ color: "#64748b", marginBottom: 24 }}>
        Import many SKUs at once for {store.name} via CSV — columns: <code>title, gender, subCategory, basePrice, compareAtPrice, fabric,
        sizes, stockRemaining, description</code>. <code>basePrice</code> is your selling price; <code>compareAtPrice</code> is the MRP —
        set it higher than <code>basePrice</code> to show a discount to shoppers, or leave it blank for no discount. Use <code>;</code> to
        separate multiple sizes.
      </p>

      <div className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Upload a CSV file</label>
          <button
            type="button"
            onClick={() => handlePasteChange(SAMPLE_CSV)}
            style={{ fontSize: 12, color: "#2563eb", background: "none", border: "none", cursor: "pointer" }}
          >
            Load sample data
          </button>
        </div>
        <input type="file" accept=".csv,text/csv" onChange={handleFile} style={{ fontSize: 13, marginBottom: 16 }} />

        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>...or paste CSV text</label>
        <textarea
          value={csvText}
          onChange={(e) => handlePasteChange(e.target.value)}
          rows={6}
          placeholder="title,gender,subCategory,basePrice,..."
          style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "monospace", resize: "vertical" }}
        />
      </div>

      {rows.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Preview — {rows.length} row(s)</h2>
          <div style={{ overflowX: "auto", background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {Object.keys(rows[0]).map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", borderBottom: "1px solid #f1f5f9", color: "#64748b", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((v, j) => (
                      <td key={j} style={{ padding: "8px 12px", borderBottom: "1px solid #f8fafc", whiteSpace: "nowrap" }}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 10 && <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>+ {rows.length - 10} more row(s)</p>}

          <button
            onClick={handleImport}
            disabled={importing}
            style={{
              marginTop: 16,
              padding: "12px 28px",
              borderRadius: 999,
              border: "none",
              background: importing ? "#94a3b8" : "#0f172a",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              cursor: importing ? "default" : "pointer",
            }}
          >
            {importing ? "Importing…" : `Import ${rows.length} product(s)`}
          </button>
        </div>
      )}

      {result && (
        <div
          className="sio-fade-in"
          style={{
            background: result.errorCount > 0 ? "#fff7ed" : "#f0fdf4",
            border: `1px solid ${result.errorCount > 0 ? "#fed7aa" : "#bbf7d0"}`,
            borderRadius: 12,
            padding: 18,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            Imported {result.successCount} of {result.totalRows} rows
          </div>
          {result.errors.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#9a3412" }}>
              {result.errors.map((e) => (
                <li key={e.row}>
                  Row {e.row}: {e.message}
                </li>
              ))}
            </ul>
          )}
          {result.successCount > 0 && (
            <Link href="/seller/products" style={{ display: "inline-block", marginTop: 10, fontSize: 13, color: "#2563eb" }}>
              View products →
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
