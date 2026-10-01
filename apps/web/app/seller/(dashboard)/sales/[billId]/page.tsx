"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSellerStore } from "../../../../../lib/use-seller-store";

interface Bill {
  id: string;
  invoiceNumber: string;
  storeName: string;
  storeAddress?: string;
  invoiceNote?: string;
  mode: "gst" | "normal";
  gstin?: string;
  taxRatePercent: number;
  items: { productId: string; title: string; size?: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  discountPercent?: number;
  discountAmount?: number;
  cgst: number;
  sgst: number;
  grandTotal: number;
  totalQuantity: number;
  paymentMode: string;
  customerName?: string;
  customerPhone?: string;
  status: "issued" | "void";
  voidReason?: string;
  createdAt: string;
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function threeDigitsToWords(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
  return ONES[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + threeDigitsToWords(n % 100) : "");
}

// Indian numbering (lakh/crore, not thousand/million) - the grouping a
// shop's own customer expects to read on a receipt printed in India.
function numberToIndianWords(n: number): string {
  if (n === 0) return "Zero";
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (crore) parts.push(threeDigitsToWords(crore) + " Crore");
  if (lakh) parts.push(threeDigitsToWords(lakh) + " Lakh");
  if (thousand) parts.push(threeDigitsToWords(thousand) + " Thousand");
  if (rest) parts.push(threeDigitsToWords(rest));
  return parts.join(" ");
}

function amountInWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let words = `Rupees ${numberToIndianWords(rupees)} Only`;
  if (paise > 0) words = `Rupees ${numberToIndianWords(rupees)} and ${numberToIndianWords(paise)} Paise Only`;
  return words;
}

export default function SellerBillDetailPage() {
  const { billId } = useParams<{ billId: string }>();
  const { store, loading: storeLoading } = useSellerStore();
  const [bill, setBill] = useState<Bill | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!store) return;
    fetch(`/api/v1/seller/stores/${store.id}/bills/${billId}`).then((r) => {
      if (!r.ok) {
        setNotFound(true);
        return;
      }
      r.json().then(setBill);
    });
  }, [store, billId]);

  if (storeLoading || !store || (!bill && !notFound)) {
    return <main style={{ maxWidth: 700, margin: "0 auto", padding: 40 }}>Loading…</main>;
  }
  if (notFound || !bill) {
    return (
      <main style={{ maxWidth: 700, margin: "0 auto", padding: 40 }}>
        <p>Bill not found.</p>
        <Link href="/seller/sales">← Back to Sales</Link>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "28px 20px 60px" }}>
      <div className="sio-print-hide" style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/seller/sales" style={{ fontSize: 13, color: "#64748b", textDecoration: "none" }}>
          ← Back to Sales
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          style={{ padding: "9px 18px", borderRadius: 999, border: "none", background: "#0f172a", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          Print
        </button>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 32 }}>
        {bill.status === "void" && (
          <div style={{ background: "#fee2e2", color: "#991b1b", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>
            VOID{bill.voidReason ? ` — ${bill.voidReason}` : ""}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, borderBottom: "2px solid #0f172a", paddingBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{bill.storeName}</h1>
            {bill.storeAddress && <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0" }}>{bill.storeAddress}</p>}
            {bill.mode === "gst" && bill.gstin && <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>GSTIN: {bill.gstin}</p>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{bill.mode === "gst" ? "Tax Invoice" : "Receipt"}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Invoice No.</div>
            <div style={{ fontWeight: 700 }}>{bill.invoiceNumber}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{new Date(bill.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: "#334155" }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Billed to</div>
            {bill.customerName || bill.customerPhone ? (
              <>
                {bill.customerName && <div>{bill.customerName}</div>}
                {bill.customerPhone && <div>{bill.customerPhone}</div>}
              </>
            ) : (
              <div style={{ color: "#94a3b8" }}>Walk-in customer</div>
            )}
          </div>
          {bill.mode === "gst" && (
            <div style={{ fontSize: 13, color: "#334155", textAlign: "right" }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Place of Supply</div>
              <div>{bill.storeAddress?.split(",").pop()?.replace(/\s*-\s*\d{6}$/, "").trim() || "—"}</div>
            </div>
          )}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 20 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #0f172a" }}>
              <th style={{ textAlign: "left", padding: "6px 4px" }}>Item</th>
              <th style={{ textAlign: "right", padding: "6px 4px" }}>Qty</th>
              <th style={{ textAlign: "right", padding: "6px 4px" }}>Rate</th>
              <th style={{ textAlign: "right", padding: "6px 4px" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((item, i) => (
              <tr key={`${item.productId}-${item.size ?? ""}-${i}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "6px 4px" }}>
                  {item.title}
                  {item.size ? ` (${item.size})` : ""}
                </td>
                <td style={{ textAlign: "right", padding: "6px 4px" }}>{item.quantity}</td>
                <td style={{ textAlign: "right", padding: "6px 4px" }}>₹{item.unitPrice.toFixed(2)}</td>
                <td style={{ textAlign: "right", padding: "6px 4px" }}>₹{item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ padding: "6px 4px", fontSize: 12, color: "#64748b" }}>
                {bill.items.length} line{bill.items.length > 1 ? "s" : ""} · {bill.totalQuantity} item{bill.totalQuantity > 1 ? "s" : ""} total
              </td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>

        <div style={{ marginLeft: "auto", width: 220, fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
            <span>Subtotal</span>
            <span>₹{bill.subtotal.toFixed(2)}</span>
          </div>
          {!!bill.discountAmount && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#16a34a" }}>
              <span>Discount ({bill.discountPercent}%)</span>
              <span>-₹{bill.discountAmount.toFixed(2)}</span>
            </div>
          )}
          {bill.mode === "gst" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#64748b" }}>
                <span>CGST ({(bill.taxRatePercent / 2).toFixed(1)}%)</span>
                <span>₹{bill.cgst.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#64748b" }}>
                <span>SGST ({(bill.taxRatePercent / 2).toFixed(1)}%)</span>
                <span>₹{bill.sgst.toFixed(2)}</span>
              </div>
            </>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0", fontWeight: 700, fontSize: 16, borderTop: "1px solid #e2e8f0", marginTop: 4 }}>
            <span>Total</span>
            <span>₹{bill.grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <p style={{ fontSize: 12, color: "#334155", marginTop: 16, fontStyle: "italic" }}>
          <strong>In words:</strong> {amountInWords(bill.grandTotal)}
        </p>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 32 }}>
          <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>
            E. &amp; O.E. · This is a computer-generated {bill.mode === "gst" ? "tax invoice" : "receipt"}.
          </p>
          {bill.mode === "gst" && (
            <div style={{ textAlign: "center", fontSize: 12 }}>
              <div style={{ marginBottom: 36 }}>For {bill.storeName}</div>
              <div style={{ borderTop: "1px solid #94a3b8", paddingTop: 4, color: "#64748b" }}>Authorized Signatory</div>
            </div>
          )}
        </div>

        {bill.invoiceNote && (
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 16, borderTop: "1px dashed #e2e8f0", paddingTop: 12 }}>{bill.invoiceNote}</p>
        )}

        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 16, textAlign: "center" }}>
          Paid via {bill.paymentMode.toUpperCase()} · Thank you for shopping with {bill.storeName}
        </p>
      </div>
    </main>
  );
}
