"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSellerStore } from "../../../../lib/use-seller-store";
import { showToast } from "../../../../lib/toast";

interface Product {
  id: string;
  title: string;
  basePrice: number;
  stockRemaining?: number;
  sizes: string[];
}

interface BillingSettings {
  mode: "gst" | "normal";
  gstin?: string;
  taxRatePercent: number;
  nextInvoiceNumber: number;
}

interface Bill {
  id: string;
  invoiceNumber: string;
  mode: "gst" | "normal";
  items: { productId: string; title: string; size?: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  cgst: number;
  sgst: number;
  grandTotal: number;
  paymentMode: string;
  customerName?: string;
  status: "issued" | "void";
  createdAt: string;
}

interface CartLine {
  productId: string;
  title: string;
  size?: string;
  unitPrice: number;
  available: number;
  quantity: number;
}

const PAYMENT_MODES: { value: string; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

function inputStyle(): React.CSSProperties {
  return { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 };
}

export default function SellerSalesPage() {
  const router = useRouter();
  const { store, loading: storeLoading } = useSellerStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<BillingSettings | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);

  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cartError, setCartError] = useState("");

  const [settingsMode, setSettingsMode] = useState<"gst" | "normal">("normal");
  const [gstin, setGstin] = useState("");
  const [taxRatePercent, setTaxRatePercent] = useState(5);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState("");

  function loadProducts() {
    if (!store) return;
    fetch(`/api/v1/seller/stores/${store.id}/products`)
      .then((r) => r.json())
      .then(setProducts);
  }

  function loadSettings() {
    if (!store) return;
    fetch(`/api/v1/seller/stores/${store.id}/bill-settings`)
      .then((r) => r.json())
      .then((s: BillingSettings) => {
        setSettings(s);
        setSettingsMode(s.mode);
        setGstin(s.gstin ?? "");
        setTaxRatePercent(s.taxRatePercent);
      });
  }

  function loadBills() {
    if (!store) return;
    fetch(`/api/v1/seller/stores/${store.id}/bills`)
      .then((r) => r.json())
      .then(setBills);
  }

  useEffect(loadProducts, [store]);
  useEffect(loadSettings, [store]);
  useEffect(loadBills, [store]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!store) return;
    setSavingSettings(true);
    setSettingsError("");
    const res = await fetch(`/api/v1/seller/stores/${store.id}/bill-settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: settingsMode, gstin: settingsMode === "gst" ? gstin : undefined, taxRatePercent }),
    });
    const result = await res.json().catch(() => null);
    setSavingSettings(false);
    if (!res.ok) {
      setSettingsError(result?.errors?.join(", ") ?? result?.message ?? "Couldn't save billing settings.");
      return;
    }
    setSettings(result);
    showToast("Billing settings saved", "success");
  }

  function addToCart() {
    setCartError("");
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;
    // Stock itself is tracked once per product, not per size (the catalog
    // has no per-size counts) - size here is only recorded on the bill so
    // the receipt reflects what actually left the shop.
    const size = product.sizes.length > 0 ? selectedSize || product.sizes[0] : undefined;
    const available = product.stockRemaining ?? 0;
    const existing = cart.find((l) => l.productId === product.id && l.size === size);
    const totalForThisProduct = cart.filter((l) => l.productId === product.id).reduce((sum, l) => sum + l.quantity, 0);
    if (totalForThisProduct + quantity > available) {
      setCartError(`Only ${available} of "${product.title}" in stock (${totalForThisProduct} already in this bill).`);
      return;
    }
    if (existing) {
      setCart((c) => c.map((l) => (l.productId === product.id && l.size === size ? { ...l, quantity: l.quantity + quantity } : l)));
    } else {
      setCart((c) => [...c, { productId: product.id, title: product.title, size, unitPrice: product.basePrice, available, quantity }]);
    }
    setQuantity(1);
  }

  function removeFromCart(productId: string, size: string | undefined) {
    setCart((c) => c.filter((l) => !(l.productId === productId && l.size === size)));
  }

  const subtotal = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const isGst = settings?.mode === "gst";
  const taxAmount = isGst ? Math.round(subtotal * (settings?.taxRatePercent ?? 0)) / 100 : 0;
  const grandTotal = subtotal + taxAmount;

  async function createBill() {
    if (!store || cart.length === 0) return;
    setSubmitting(true);
    setCartError("");
    const res = await fetch(`/api/v1/seller/stores/${store.id}/bills`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity, size: l.size })),
        paymentMode,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
      }),
    });
    const result = await res.json().catch(() => null);
    if (!res.ok) {
      setSubmitting(false);
      setCartError(result?.errors?.join(", ") ?? result?.message ?? "Couldn't create this bill.");
      return;
    }
    showToast(`Bill ${result.invoiceNumber} created`, "success");
    // Straight to the printable bill - a seller mid-sale wants the receipt
    // in front of them immediately, not a reset form they have to navigate
    // away from.
    router.push(`/seller/sales/${result.id}`);
  }

  async function handleVoid(billId: string) {
    const reason = window.prompt("Reason for voiding this bill? (stock will be restored)");
    if (!reason || !reason.trim() || !store) return;
    const res = await fetch(`/api/v1/seller/stores/${store.id}/bills/${billId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "void", reason: reason.trim() }),
    });
    if (!res.ok) {
      showToast("Couldn't void this bill.", "default");
      return;
    }
    loadProducts();
    loadBills();
    showToast("Bill voided — stock restored", "success");
  }

  if (storeLoading || !store || !settings) {
    return <main style={{ maxWidth: 1000, margin: "0 auto", padding: 40 }}>Loading…</main>;
  }

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Sales &amp; Billing</h1>
      <p style={{ color: "#64748b", marginBottom: 28 }}>
        Record a walk-in sale from {store.name}'s own shop. Payment is collected by you directly (cash/UPI/card) — nothing moves through
        this platform. Stock updates immediately, both here and on your online listings.
      </p>

      <div className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Invoice type</h2>
        <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>
          Normal issues a plain receipt. GST Invoice adds your GSTIN and a tax breakdown — only turn this on if your shop is GST-registered.
        </p>
        <form onSubmit={saveSettings}>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <label
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 10,
                border: settingsMode === "normal" ? "2px solid #0f172a" : "1px solid #e2e8f0",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <input type="radio" checked={settingsMode === "normal"} onChange={() => setSettingsMode("normal")} />
              Normal Receipt
            </label>
            <label
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 10,
                border: settingsMode === "gst" ? "2px solid #0f172a" : "1px solid #e2e8f0",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <input type="radio" checked={settingsMode === "gst"} onChange={() => setSettingsMode("gst")} />
              GST Invoice
            </label>
          </div>

          {settingsMode === "gst" && (
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>GSTIN</label>
                <input
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 27ABCDE1234F1Z5"
                  maxLength={15}
                  style={inputStyle()}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Tax rate (%)</label>
                <input
                  type="number"
                  min={0}
                  max={40}
                  step={0.5}
                  value={taxRatePercent}
                  onChange={(e) => setTaxRatePercent(Number(e.target.value))}
                  style={inputStyle()}
                />
              </div>
            </div>
          )}

          {settingsError && <p style={{ fontSize: 12, color: "#e11d48", marginBottom: 10 }}>{settingsError}</p>}

          <button
            type="submit"
            disabled={savingSettings}
            style={{
              padding: "9px 18px",
              borderRadius: 999,
              border: "none",
              background: savingSettings ? "#94a3b8" : "#0f172a",
              color: "#fff",
              fontWeight: 600,
              fontSize: 13,
              cursor: savingSettings ? "default" : "pointer",
            }}
          >
            {savingSettings ? "Saving…" : "Save Settings"}
          </button>
        </form>
      </div>

      <div className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>New Bill</h2>

        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <select
            value={selectedProductId}
            onChange={(e) => {
              setSelectedProductId(e.target.value);
              const product = products.find((p) => p.id === e.target.value);
              setSelectedSize(product?.sizes[0] ?? "");
            }}
            style={{ ...inputStyle(), flex: 2, minWidth: 200 }}
          >
            <option value="">Select a product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id} disabled={(p.stockRemaining ?? 0) <= 0}>
                {p.title} — ₹{p.basePrice} ({p.stockRemaining ?? 0} in stock)
              </option>
            ))}
          </select>
          {(() => {
            const selectedProduct = products.find((p) => p.id === selectedProductId);
            if (!selectedProduct || selectedProduct.sizes.length === 0) return null;
            return (
              <select value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)} style={{ ...inputStyle(), flex: "0 0 110px" }}>
                {selectedProduct.sizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            );
          })()}
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            style={{ ...inputStyle(), width: 80, flex: "0 0 80px" }}
          />
          <button
            type="button"
            onClick={addToCart}
            disabled={!selectedProductId}
            style={{
              padding: "0 18px",
              borderRadius: 8,
              border: "none",
              background: !selectedProductId ? "#94a3b8" : "#0f172a",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: !selectedProductId ? "default" : "pointer",
            }}
          >
            Add
          </button>
        </div>

        {cart.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {cart.map((line) => (
              <div
                key={`${line.productId}-${line.size ?? ""}`}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}
              >
                <span>
                  {line.title}
                  {line.size ? ` (${line.size})` : ""} × {line.quantity}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <strong>₹{line.unitPrice * line.quantity}</strong>
                  <button
                    type="button"
                    onClick={() => removeFromCart(line.productId, line.size)}
                    aria-label="Remove"
                    style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 12 }}
                  >
                    ✕
                  </button>
                </span>
              </div>
            ))}
            <div style={{ paddingTop: 10, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {isGst && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                  <span>Tax ({settings.taxRatePercent}%)</span>
                  <span>₹{taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15, marginTop: 4 }}>
                <span>Total</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
          <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} style={inputStyle()}>
            {PAYMENT_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name (optional)" style={inputStyle()} />
          <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Phone (optional)" style={inputStyle()} />
        </div>

        {cartError && <p style={{ fontSize: 12, color: "#e11d48", marginBottom: 12 }}>{cartError}</p>}

        <button
          type="button"
          onClick={createBill}
          disabled={cart.length === 0 || submitting}
          style={{
            padding: "11px 20px",
            borderRadius: 999,
            border: "none",
            background: cart.length === 0 || submitting ? "#94a3b8" : "#16a34a",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            cursor: cart.length === 0 || submitting ? "default" : "pointer",
          }}
        >
          {submitting ? "Creating…" : `Create Bill${cart.length > 0 ? ` (₹${grandTotal.toFixed(2)})` : ""}`}
        </button>
      </div>

      <div className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Sales History</h2>
        {bills.length === 0 ? (
          <p style={{ fontSize: 13, color: "#94a3b8" }}>No bills yet — create your first one above.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {bills.map((b) => (
              <div
                key={b.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #f1f5f9",
                  opacity: b.status === "void" ? 0.5 : 1,
                }}
              >
                <div style={{ fontSize: 13 }}>
                  <strong>{b.invoiceNumber}</strong> · {b.items.length} item{b.items.length > 1 ? "s" : ""} · ₹{b.grandTotal.toFixed(2)} ·{" "}
                  {b.paymentMode.toUpperCase()}
                  {b.status === "void" && <span style={{ color: "#e11d48", fontWeight: 700 }}> · VOID</span>}
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <Link href={`/seller/sales/${b.id}`} style={{ fontSize: 12, color: "#0f172a", fontWeight: 600, textDecoration: "none" }}>
                    View / Print
                  </Link>
                  {b.status === "issued" && (
                    <button
                      type="button"
                      onClick={() => handleVoid(b.id)}
                      style={{ background: "none", border: "none", color: "#e11d48", fontSize: 12, cursor: "pointer" }}
                    >
                      Void
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
