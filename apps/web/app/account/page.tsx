"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getShopperSession, setShopperSession, clearShopperSession, ShopperSession } from "../../lib/shopper-session";

type Step = "phone" | "otp";

const DEMO_OTP = "1234";

export default function AccountPage() {
  const router = useRouter();
  const [session, setSession] = useState<ShopperSession | null>(null);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>("phone");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setSession(getShopperSession());
    setReady(true);
  }, []);

  function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Enter your name.");
    if (!/^\d{10}$/.test(phone)) return setError("Enter a valid 10-digit mobile number.");
    setStep("otp");
  }

  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (otp !== DEMO_OTP) return setError(`Incorrect OTP. This demo's OTP is always ${DEMO_OTP}.`);
    setShopperSession({ name: name.trim(), phone });
    setSession({ name: name.trim(), phone });
  }

  function handleSignOut() {
    clearShopperSession();
    setSession(null);
    setStep("phone");
    setName("");
    setPhone("");
    setOtp("");
  }

  if (!ready) return <main style={{ maxWidth: 440, margin: "60px auto", padding: 16 }} />;

  if (session) {
    return (
      <main style={{ maxWidth: 440, margin: "56px auto", padding: 16 }} className="sio-fade-in">
        <div
          style={{
            background: "var(--sio-paper)",
            border: "1px solid var(--sio-line)",
            borderRadius: 20,
            padding: "32px 28px",
            boxShadow: "0 20px 40px rgba(22, 20, 15, 0.05)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "var(--sio-ink)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 700,
              margin: "0 auto 16px",
            }}
          >
            {session.name.trim().charAt(0).toUpperCase()}
          </div>
          <h1 style={{ fontSize: 22, marginBottom: 4, fontWeight: 700 }}>Hi, {session.name} 👋</h1>
          <p style={{ color: "var(--sio-muted)", marginBottom: 28, fontSize: 14 }}>+91 {session.phone}</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
            <AccountLink href="/reservations" icon="🕐" label="My Reservations" desc="Track pickup holds you've reserved at nearby stores." />
            <AccountLink href="/wishlist" icon="🤍" label="Wishlist" desc="Items you've saved for later." />
            <AccountLink href="/sorts" icon="🧭" label="My Sorts" desc="Saved filters across nearby stores." />
          </div>

          <button
            onClick={handleSignOut}
            className="sio-btn-primary sio-shine-btn"
            style={{
              marginTop: 24,
              width: "100%",
              padding: "13px",
              borderRadius: 999,
              border: "1px solid var(--sio-line)",
              background: "var(--sio-paper)",
              color: "var(--sio-ink)",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 420, margin: "56px auto", padding: 16 }} className="sio-fade-in">
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, marginBottom: 8, fontWeight: 700 }}>Welcome to SORT IT OUT</h1>
        <p style={{ color: "var(--sio-muted)", fontSize: 13.5, lineHeight: 1.6 }}>
          Sign in to track reservations and sync your wishlist across devices. My Sorts, Wishlist, and Cart already work locally without an account.
        </p>
      </div>

      <div
        style={{
          background: "var(--sio-paper)",
          border: "1px solid var(--sio-line)",
          borderRadius: 20,
          padding: 28,
          boxShadow: "0 20px 40px rgba(22, 20, 15, 0.05)",
        }}
      >
        {step === "phone" ? (
          <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>Full name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Sharma" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Mobile number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile number"
                style={inputStyle}
              />
            </div>
            {error && <ErrorBanner text={error} />}
            <button type="submit" className="sio-btn-primary sio-shine-btn" style={buttonStyle}>
              Send OTP
            </button>
            <p style={{ fontSize: 12, color: "var(--sio-muted)", textAlign: "center" }}>
              Demo login — no SMS is actually sent, OTP is always <strong>{DEMO_OTP}</strong>.
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 13.5, color: "var(--sio-muted)", textAlign: "center" }}>
              OTP sent to +91 {phone}. <strong style={{ color: "var(--sio-ink)" }}>Demo OTP: {DEMO_OTP}</strong>
            </p>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="4-digit OTP"
              style={{ ...inputStyle, letterSpacing: "0.3em", fontSize: 18, textAlign: "center" }}
              autoFocus
            />
            {error && <ErrorBanner text={error} />}
            <button type="submit" className="sio-btn-primary sio-shine-btn" style={buttonStyle}>
              Verify &amp; sign in
            </button>
            <button
              type="button"
              onClick={() => setStep("phone")}
              style={{ background: "none", border: "none", color: "var(--sio-muted)", fontSize: 13, cursor: "pointer", padding: 4 }}
            >
              ← Change number
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

function ErrorBanner({ text }: { text: string }) {
  return (
    <div
      style={{
        background: "#fef2f2",
        border: "1px solid #fecaca",
        color: "#b91c1c",
        borderRadius: 10,
        padding: "10px 12px",
        fontSize: 13,
      }}
    >
      {text}
    </div>
  );
}

function AccountLink({ href, icon, label, desc }: { href: string; icon: string; label: string; desc: string }) {
  return (
    <Link
      href={href}
      className="sio-card"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        border: "1px solid var(--sio-line)",
        borderRadius: 14,
        background: "var(--sio-cream)",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--sio-muted)" }}>{desc}</div>
      </div>
    </Link>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, marginBottom: 7, display: "block" };

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  border: "1px solid var(--sio-line)",
  borderRadius: 10,
  background: "var(--sio-cream)",
  fontSize: 14,
  color: "var(--sio-ink)",
  outline: "none",
};

const buttonStyle: React.CSSProperties = {
  padding: "13px",
  borderRadius: 999,
  border: "none",
  background: "var(--sio-ink)",
  color: "#fff",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};
