"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { showToast } from "../../../lib/toast";
import { LogoBadge } from "../../../components/LogoBadge";

interface StoreOption {
  id: string;
  slug: string;
  name: string;
  city?: string;
  localMarket?: string;
}

const FEATURES = [
  { icon: "📦", title: "Manage your catalog", desc: "List products, bulk-import a spreadsheet, and track live stock in one place." },
  { icon: "🕐", title: "Handle reservations", desc: "See who's coming to pick up what they've sorted, in real time." },
  { icon: "🔴", title: "Run flash sales", desc: "Flag a live sale and shoppers see it instantly on your storefront and nearby-store results." },
  { icon: "🎨", title: "Customize your storefront", desc: "Theme Studio lets you set brand colors, hero message, and QR standees." },
];

type LoginMode = "password" | "otp";
type OtpStep = "phone" | "code";

export default function SellerLoginPage() {
  const router = useRouter();
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeSlug, setStoreSlug] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStores, setLoadingStores] = useState(true);

  const [mode, setMode] = useState<LoginMode>("password");
  const [otpStep, setOtpStep] = useState<OtpStep>("phone");
  const [otpPhone, setOtpPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/seller/stores")
      .then((r) => r.json())
      .then((list: StoreOption[]) => {
        setStores(list);
        if (list.length > 0) setStoreSlug(list[0].slug);
      })
      .finally(() => setLoadingStores(false));
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
      if (res.status === 429) {
        setError("Too many attempts. Wait a few minutes before trying again.");
      } else {
        setError("Incorrect store or password. Try again.");
      }
      return;
    }

    showToast("Signed in — welcome back");
    router.push("/seller");
    router.refresh();
  }

  function fillDemoPassword() {
    setPassword("sortitout123");
    setShowPassword(true);
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setOtpError(null);
    if (!/^\d{10}$/.test(otpPhone)) {
      setOtpError("Enter a valid 10-digit mobile number.");
      return;
    }
    setOtpSubmitting(true);
    const res = await fetch("/api/v1/seller/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: otpPhone }),
    });
    const result = await res.json().catch(() => null);
    setOtpSubmitting(false);
    if (!res.ok) {
      setOtpError(result?.message ?? "Couldn't send an OTP. Try again.");
      return;
    }
    setDevOtp(result?.devOtp ?? "");
    setOtpStep("code");
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setOtpError(null);
    setOtpSubmitting(true);
    const res = await fetch("/api/v1/seller/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: otpPhone, code: otpCode }),
    });
    const result = await res.json().catch(() => null);
    setOtpSubmitting(false);
    if (!res.ok) {
      setOtpError(result?.message ?? "Incorrect or expired OTP.");
      return;
    }
    showToast(`Signed in — welcome back, ${result.name}`);
    router.push("/seller");
    router.refresh();
  }

  return (
    <main
      className="sio-fade-in seller-login-grid"
      style={{
        minHeight: "calc(100vh - 60px)",
        display: "grid",
        gridTemplateColumns: "1.1fr 1fr",
        background: "var(--sio-cream)",
      }}
    >
      <style>{`
        @media (max-width: 860px) {
          .seller-login-brand { display: none !important; }
          .seller-login-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ display: "contents" }}>
        {/* Left: branding / value props */}
        <div
          className="seller-login-brand"
          style={{
            background: "var(--sio-ink)",
            color: "#fff",
            padding: "56px 48px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -80,
              right: -80,
              width: 280,
              height: 280,
              borderRadius: "50%",
              background: "radial-gradient(circle, var(--sio-glow), transparent 70%)",
              opacity: 0.18,
            }}
          />

          <div style={{ position: "relative" }}>
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 8 }}>
              <LogoBadge size={30} />
              <div
                style={{
                  fontFamily: "var(--site-font-heading)",
                  fontWeight: 700,
                  fontSize: 26,
                  letterSpacing: "0.03em",
                  color: "#fff",
                }}
              >
                SORT NOW
              </div>
            </Link>
            <div style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8a8478", marginBottom: 40 }}>
              Seller Portal
            </div>

            <h1 style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.25, marginBottom: 14, maxWidth: 380 }}>
              Everything your store needs, in one dashboard.
            </h1>
            <p style={{ fontSize: 14, color: "#b8b2a4", lineHeight: 1.6, marginBottom: 40, maxWidth: 380 }}>
              Sign in to list products, manage reservations, and put your store in front of shoppers nearby.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {FEATURES.map((f) => (
                <div key={f.title} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    {f.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{f.title}</div>
                    <div style={{ fontSize: 13, color: "#8a8478", lineHeight: 1.5 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: sign-in form */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
          <div style={{ width: "100%", maxWidth: 380 }}>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6, color: "var(--sio-ink)" }}>Sign in to your store</h2>
              <p style={{ color: "var(--sio-muted)", fontSize: 13.5 }}>Manage your storefront, catalog, and reservations.</p>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setMode("password")}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 999,
                  border: mode === "password" ? "none" : "1px solid var(--sio-line)",
                  background: mode === "password" ? "var(--sio-ink)" : "transparent",
                  color: mode === "password" ? "#fff" : "var(--sio-muted)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => setMode("otp")}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 999,
                  border: mode === "otp" ? "none" : "1px solid var(--sio-line)",
                  background: mode === "otp" ? "var(--sio-ink)" : "transparent",
                  color: mode === "otp" ? "#fff" : "var(--sio-muted)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                OTP
              </button>
            </div>

            {mode === "otp" ? (
              <form
                onSubmit={otpStep === "phone" ? handleSendOtp : handleVerifyOtp}
                style={{
                  background: "var(--sio-paper)",
                  border: "1px solid var(--sio-line)",
                  borderRadius: 16,
                  padding: 28,
                  boxShadow: "0 20px 40px rgba(22, 20, 15, 0.05)",
                }}
              >
                {otpStep === "phone" ? (
                  <>
                    <label style={labelStyle}>Registered mobile number</label>
                    <input
                      value={otpPhone}
                      onChange={(e) => setOtpPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="10-digit mobile number"
                      style={{ ...inputStyle, marginBottom: 6 }}
                    />
                    <p style={{ fontSize: 11.5, color: "var(--sio-muted)", marginBottom: 4 }}>
                      Only works if a phone number is on file for your store (set at signup, or ask support to add one). Demo: Urban Vogue's
                      is 9876543210.
                    </p>
                  </>
                ) : (
                  <>
                    <label style={labelStyle}>Enter the code</label>
                    <input
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="6-digit OTP"
                      style={{ ...inputStyle, letterSpacing: "0.3em", textAlign: "center", fontSize: 18, marginBottom: 6 }}
                      autoFocus
                    />
                    {devOtp && (
                      <p style={{ fontSize: 11.5, color: "var(--sio-muted)", marginBottom: 4 }}>
                        Dev mode — code: <strong style={{ color: "var(--sio-ink)" }}>{devOtp}</strong> (no SMS gateway connected yet)
                      </p>
                    )}
                  </>
                )}

                {otpError && (
                  <div
                    style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 8, padding: "10px 12px", fontSize: 13, marginTop: 8, marginBottom: 6 }}
                  >
                    {otpError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={otpSubmitting}
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
                    cursor: otpSubmitting ? "default" : "pointer",
                    opacity: otpSubmitting ? 0.7 : 1,
                    marginTop: 14,
                  }}
                >
                  {otpSubmitting ? (otpStep === "phone" ? "Sending…" : "Verifying…") : otpStep === "phone" ? "Send OTP" : "Verify & sign in"}
                </button>

                {otpStep === "code" && (
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep("phone");
                      setOtpCode("");
                      setDevOtp("");
                      setOtpError(null);
                    }}
                    style={{ background: "none", border: "none", color: "var(--sio-muted)", fontSize: 12.5, cursor: "pointer", padding: "10px 0 0", width: "100%" }}
                  >
                    ← Change number
                  </button>
                )}
              </form>
            ) : (
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
              <label style={labelStyle}>Store</label>
              <select
                value={storeSlug}
                onChange={(e) => setStoreSlug(e.target.value)}
                required
                disabled={loadingStores}
                style={{ ...inputStyle, marginBottom: 18, cursor: "pointer" }}
              >
                {loadingStores && <option>Loading stores…</option>}
                {stores.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>

              <label style={labelStyle}>Password</label>
              <div style={{ position: "relative", marginBottom: 8 }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  style={{ ...inputStyle, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    right: 4,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 16,
                    padding: 8,
                    color: "var(--sio-muted)",
                  }}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>

              {error && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#b91c1c",
                    borderRadius: 8,
                    padding: "10px 12px",
                    fontSize: 13,
                    marginTop: 10,
                    marginBottom: 6,
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !storeSlug}
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
                  cursor: submitting || !storeSlug ? "default" : "pointer",
                  opacity: submitting || !storeSlug ? 0.7 : 1,
                  marginTop: 18,
                }}
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>

              <div
                style={{
                  marginTop: 20,
                  paddingTop: 16,
                  borderTop: "1px dashed var(--sio-line)",
                  fontSize: 12.5,
                  color: "var(--sio-muted)",
                  textAlign: "center",
                  lineHeight: 1.6,
                }}
              >
                This is a demo — every seed store shares the same password.
                <br />
                <button
                  type="button"
                  onClick={fillDemoPassword}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--sio-bronze)",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "4px 0",
                    fontSize: 12.5,
                  }}
                >
                  Autofill demo password →
                </button>
              </div>
            </form>
            )}

            <div style={{ marginTop: 16, textAlign: "center", fontSize: 12.5, color: "var(--sio-muted)" }}>
              New here?{" "}
              <Link href="/seller/signup" style={{ color: "var(--sio-bronze)", fontWeight: 600, textDecoration: "none" }}>
                List your store
              </Link>
            </div>

            <Link
              href="/"
              style={{
                display: "block",
                textAlign: "center",
                marginTop: 20,
                fontSize: 13,
                color: "var(--sio-muted)",
                textDecoration: "none",
              }}
            >
              ← Back to SORT NOW
            </Link>
          </div>
        </div>
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
