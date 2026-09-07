"use client";

export default function AccountPage() {
  return (
    <main style={{ maxWidth: 480, margin: "60px auto", padding: 16, textAlign: "center" }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Sign in to SORT IT OUT</h1>
      <p style={{ color: "#64748b", marginBottom: 24 }}>
        Shopper accounts, order history, and synced Smart Sorts require the auth service — not wired up in this demo yet
        (see <code>database/schema.sql</code> · <code>shoppers</code> table). My Sorts, Wishlist, and Cart already work
        locally in this browser without an account.
      </p>
      <form style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          placeholder="Mobile number"
          disabled
          style={{ padding: "12px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc" }}
        />
        <button
          type="button"
          disabled
          style={{ padding: "12px", borderRadius: 8, border: "none", background: "#cbd5e1", color: "#fff", cursor: "not-allowed" }}
        >
          Send OTP (coming soon)
        </button>
      </form>
    </main>
  );
}
