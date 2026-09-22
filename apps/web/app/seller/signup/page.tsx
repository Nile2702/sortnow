"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { showToast } from "../../../lib/toast";

const CATEGORIES = [
  { value: "apparel", label: "All Types of Apparel" },
  { value: "ethnic", label: "Ethnic Wear" },
  { value: "western", label: "Western Wear" },
  { value: "footwear", label: "Footwear" },
  { value: "kids", label: "Kids Wear" },
  { value: "accessories", label: "Accessories & Jewellery" },
];

export default function SellerSignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [pincode, setPincode] = useState("");
  const [localMarket, setLocalMarket] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/v1/seller/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category, pincode, localMarket, password }),
    });
    const result = await res.json().catch(() => null);
    setSubmitting(false);

    if (!res.ok) {
      if (res.status === 429) {
        setError("Too many attempts. Wait a while before trying again.");
      } else {
        setError(result?.message ?? "Couldn't create your store. Check the details and try again.");
      }
      return;
    }

    showToast(`Welcome, ${result.name} — let's finish setting up your store`, "success");
    router.push("/seller/onboarding");
    router.refresh();
  }

  return (
    <main className="sio-fade-in" style={{ minHeight: "calc(100vh - 60px)", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--sio-cream)", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6, color: "var(--sio-ink)" }}>List your store</h1>
          <p style={{ color: "var(--sio-muted)", fontSize: 13.5 }}>
            Create your storefront in a couple of minutes — you'll finish GSTIN/PAN/payout verification right after.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            background: "var(--sio-paper)",
            border: "1px solid var(--sio-line)",
            borderRadius: 16,
            padding: 28,
            boxShadow: "0 20px 40px rgba(22, 20, 15, 0.05)",
          }}
        >
          <label style={labelStyle}>Store name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Meera's Ethnic Corner"
            required
            maxLength={120}
            style={{ ...inputStyle, marginBottom: 16 }}
          />

          <label style={labelStyle}>What do you mainly sell?</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, marginBottom: 16, cursor: "pointer" }}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Store PIN code</label>
              <input
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="e.g. 400050"
                maxLength={6}
                required
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Local market / area</label>
              <input
                value={localMarket}
                onChange={(e) => setLocalMarket(e.target.value)}
                placeholder="e.g. Bandra"
                required
                maxLength={80}
                style={inputStyle}
              />
            </div>
          </div>

          <label style={labelStyle}>Password</label>
          <div style={{ position: "relative", marginBottom: 16 }}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
              autoComplete="new-password"
              style={{ ...inputStyle, paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 8, color: "var(--sio-muted)" }}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          <label style={labelStyle}>Confirm password</label>
          <input
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            required
            autoComplete="new-password"
            style={inputStyle}
          />

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 8, padding: "10px 12px", fontSize: 13, marginTop: 14 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="sio-btn-primary sio-shine-btn"
            style={{
              width: "100%",
              padding: "13px 18px",
              borderRadius: 10,
              border: "none",
              background: "var(--sio-ink)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.02em",
              cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.7 : 1,
              marginTop: 20,
            }}
          >
            {submitting ? "Creating your store…" : "Create my store"}
          </button>

          <div style={{ marginTop: 16, textAlign: "center", fontSize: 12.5, color: "var(--sio-muted)" }}>
            Already have a store?{" "}
            <Link href="/seller/login" style={{ color: "var(--sio-bronze)", fontWeight: 600, textDecoration: "none" }}>
              Sign in
            </Link>
          </div>
        </form>

        <Link href="/" style={{ display: "block", textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--sio-muted)", textDecoration: "none" }}>
          ← Back to SORT IT OUT
        </Link>
      </div>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 600,
  display: "block",
  marginBottom: 7,
  color: "var(--sio-ink)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 10,
  border: "1px solid var(--sio-line)",
  fontSize: 14,
  color: "var(--sio-ink)",
  background: "var(--sio-cream)",
  outline: "none",
};
