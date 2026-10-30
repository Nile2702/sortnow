"use client";

import { useState } from "react";
import Link from "next/link";
import { useSellerStore } from "../../../../../lib/use-seller-store";
import { parseCsv, SAMPLE_CSV } from "../../../../../lib/csv";
import { LoadingScreen } from "../../../../../components/LoadingSpinner";

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
  const [importError, setImportError] = useState("");

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
    setImportError("");
    try {
      const res = await fetch(`/api/v1/seller/stores/${store.id}/products/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setImportError(body?.message ?? "Couldn't import these rows. Try again.");
        return;
      }
      setResult(await res.json());
    } catch {
      setImportError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setImporting(false);
    }
  }

  if (storeLoading || !store) {
    return <LoadingScreen maxWidth={800} />;
  }

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px 60px" }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/seller/products" style={{ fontSize: 13, color: "var(--sio-muted)" }}>
          ← Back to Products
        </Link>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Bulk Upload</h1>
      <p style={{ color: "var(--sio-muted)", marginBottom: 24 }}>
        Import many SKUs at once for {store.name} via CSV — columns: <code>title, gender, subCategory, basePrice, compareAtPrice, costPrice,
        fabric, sizes, stockRemaining, description, productCode</code>. <code>basePrice</code> is your selling price; <code>compareAtPrice</code> is
        the MRP — set it higher than <code>basePrice</code> to show a discount to shoppers, or leave it blank for no discount.{" "}
        <code>costPrice</code> is optional — what you paid to source each item, never shown to shoppers, only used to calculate profit in
        Reports. Use <code>;</code> to separate multiple sizes. <code>productCode</code> is optional — your own lookup code, shown to shoppers
        so they can quote it at your shop.
      </p>

      <div className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--sio-cream)", padding: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Upload a CSV file</label>
          <button
            type="button"
            onClick={() => handlePasteChange(SAMPLE_CSV)}
            style={{ fontSize: 12, color: "var(--sio-ink)", background: "none", border: "none", cursor: "pointer" }}
          >
            Load sample data
          </button>
        </div>
        <input type="file" accept=".csv,text/csv" onChange={handleFile} style={{ fontSize: 13, marginBottom: 16, width: "100%", maxWidth: "100%" }} />

        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>...or paste CSV text</label>
        <textarea
          value={csvText}
          onChange={(e) => handlePasteChange(e.target.value)}
          rows={6}
          placeholder="title,gender,subCategory,basePrice,..."
          style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid var(--sio-line)", fontSize: 12, fontFamily: "monospace", resize: "vertical" }}
        />
      </div>

      {rows.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Preview — {rows.length} row(s)</h2>
          <div style={{ overflowX: "auto", background: "#fff", borderRadius: 12, border: "1px solid var(--sio-cream)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {Object.keys(rows[0]).map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", borderBottom: "1px solid var(--sio-cream)", color: "var(--sio-muted)", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((v, j) => (
                      <td key={j} style={{ padding: "8px 12px", borderBottom: "1px solid var(--sio-cream)", whiteSpace: "nowrap" }}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 10 && <p style={{ fontSize: 12, color: "var(--sio-muted)", marginTop: 6 }}>+ {rows.length - 10} more row(s)</p>}

          <button
            onClick={handleImport}
            disabled={importing}
            style={{
              marginTop: 16,
              padding: "12px 28px",
              borderRadius: 999,
              border: "none",
              background: importing ? "var(--sio-muted)" : "var(--sio-ink)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              cursor: importing ? "default" : "pointer",
            }}
          >
            {importing ? "Importing…" : `Import ${rows.length} product(s)`}
          </button>
          {importError && (
            <p style={{ marginTop: 12, fontSize: 13, color: "var(--sio-error)", background: "var(--sio-error-bg)", border: "1px solid var(--sio-error-border)", borderRadius: 10, padding: "10px 12px" }}>
              {importError}
            </p>
          )}
        </div>
      )}

      {result && (
        <div
          className="sio-fade-in"
          style={{
            background: result.errorCount > 0 ? "var(--sio-pending-bg)" : "var(--sio-success-bg)",
            border: `1px solid ${result.errorCount > 0 ? "var(--sio-pending-border)" : "var(--sio-success-border)"}`,
            borderRadius: 12,
            padding: 18,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            Imported {result.successCount} of {result.totalRows} rows
          </div>
          {result.errors.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--sio-pending)" }}>
              {result.errors.map((e) => (
                <li key={e.row}>
                  Row {e.row}: {e.message}
                </li>
              ))}
            </ul>
          )}
          {result.successCount > 0 && (
            <Link href="/seller/products" style={{ display: "inline-block", marginTop: 10, fontSize: 13, color: "var(--sio-ink)" }}>
              View products →
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
