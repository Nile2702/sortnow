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

  if (!ready) return <main style={{ maxWidth: 480, margin: "60px auto", padding: 16 }} />;

  if (session) {
    return (
      <main style={{ maxWidth: 480, margin: "60px auto", padding: 16, textAlign: "center" }} className="sio-fade-in">
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
        <h1 style={{ fontSize: 22, marginBottom: 4, fontWeight: 600 }}>Hi, {session.name}</h1>
        <p style={{ color: "var(--sio-muted)", marginBottom: 28, fontSize: 14 }}>+91 {session.phone}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
          <AccountLink href="/orders" label="Order History" desc="Track and review your past orders." />
          <AccountLink href="/wishlist" label="Wishlist" desc="Items you've saved for later." />
          <AccountLink href="/sorts" label="My Sorts" desc="Saved filters across nearby stores." />
        </div>

        <button
          onClick={handleSignOut}
          className="sio-btn-primary"
          style={{
            marginTop: 24,
            width: "100%",
            padding: "12px",
            border: "1px solid var(--sio-line)",
            background: "var(--sio-paper)",
            color: "var(--sio-ink)",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Sign Out
        </button>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 420, margin: "60px auto", padding: 16 }} className="sio-fade-in">
      <h1 style={{ fontSize: 24, marginBottom: 8, textAlign: "center" }}>Sign in to SORT IT OUT</h1>
      <p style={{ color: "var(--sio-muted)", marginBottom: 28, fontSize: 13, textAlign: "center" }}>
        Mocked OTP login for this demo — no SMS is actually sent (see <code>database/schema.sql</code> · <code>shoppers</code> table
        for the real auth model). My Sorts, Wishlist, and Cart already work locally without an account.
      </p>

      {step === "phone" ? (
        <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
          {error && <p style={{ color: "#b91c1c", fontSize: 13 }}>{error}</p>}
          <button type="submit" className="sio-btn-primary" style={buttonStyle}>
            Send OTP
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 13, color: "var(--sio-muted)" }}>
            OTP sent to +91 {phone}. <strong>Demo OTP: {DEMO_OTP}</strong>
          </p>
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="4-digit OTP"
            style={{ ...inputStyle, letterSpacing: "0.3em", fontSize: 18, textAlign: "center" }}
            autoFocus
          />
          {error && <p style={{ color: "#b91c1c", fontSize: 13 }}>{error}</p>}
          <button type="submit" className="sio-btn-primary" style={buttonStyle}>
            Verify &amp; Sign In
          </button>
          <button
            type="button"
            onClick={() => setStep("phone")}
            style={{ background: "none", border: "none", color: "var(--sio-muted)", fontSize: 13, cursor: "pointer" }}
          >
            ← Change number
          </button>
        </form>
      )}
    </main>
  );
}

function AccountLink({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <Link
      href={href}
      className="sio-card"
      style={{
        display: "block",
        padding: "14px 16px",
        border: "1px solid var(--sio-line)",
        background: "var(--sio-paper)",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: "var(--sio-muted)" }}>{desc}</div>
    </Link>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, marginBottom: 6, display: "block" };

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid var(--sio-line)",
  fontSize: 14,
  outline: "none",
};

const buttonStyle: React.CSSProperties = {
  padding: "12px",
  border: "none",
  background: "var(--sio-ink)",
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  cursor: "pointer",
};
