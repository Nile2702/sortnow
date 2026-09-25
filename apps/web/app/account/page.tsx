"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getShopperSession, setShopperSession, clearShopperSession, ShopperSession } from "../../lib/shopper-session";

type Step = "phone" | "otp" | "profile";
type Category = "men" | "women" | "kids";

const STEP_ORDER: Step[] = ["phone", "otp", "profile"];

export default function AccountPage() {
  const [session, setSession] = useState<ShopperSession | null>(null);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [justSignedUp, setJustSignedUp] = useState(false);
  // Shown only because no real SMS gateway is connected yet (see
  // lib/otp.ts) - the server has nowhere else to actually deliver the code
  // to in this environment, so it hands it back for the demo to display.
  const [devOtp, setDevOtp] = useState("");

  // Profile-step fields - only asked of a genuinely first-time customer
  // (see handleVerify: existingShopper comes back null).
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [pincode, setPincode] = useState("");
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    setSession(getShopperSession());
    setReady(true);
  }, []);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^\d{10}$/.test(phone)) return setError("Enter a valid 10-digit mobile number.");
    setSending(true);
    const res = await fetch("/api/v1/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const result = await res.json().catch(() => null);
    setSending(false);
    if (!res.ok) {
      setError(result?.message ?? "Couldn't send an OTP. Try again.");
      return;
    }
    setDevOtp(result.devOtp ?? "");
    setStep("otp");
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setVerifying(true);
    const res = await fetch("/api/v1/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code: otp }),
    });
    const result = await res.json().catch(() => null);
    setVerifying(false);
    if (!res.ok) {
      setError(result?.message ?? "Incorrect or expired OTP.");
      return;
    }

    const existing = result.existingShopper as ShopperSession & { id?: string; createdAt?: string } | null;
    if (existing) {
      // Returning customer, even on a fresh device/browser - their profile
      // lives server-side (lib/seed-data.ts Shopper), not just this
      // device's localStorage, so no need to ask them anything again.
      const restored: ShopperSession = {
        name: existing.name,
        phone,
        email: existing.email,
        preferredCategory: existing.preferredCategory,
        pincode: existing.pincode,
      };
      setShopperSession(restored);
      setSession(restored);
      return;
    }

    // First time this phone has ever signed in - collect a proper profile
    // before letting them in.
    setStep("profile");
  }

  async function handleCompleteProfile(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Enter your name.");
    if (!agreed) return setError("Please accept the Terms & Privacy Policy to continue.");
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email, or leave it blank.");
    if (pincode.trim() && !/^\d{6}$/.test(pincode.trim())) return setError("Pincode must be 6 digits, or leave it blank.");

    setSavingProfile(true);
    const res = await fetch("/api/v1/shopper/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone,
        email: email.trim() || undefined,
        preferredCategory: category || undefined,
        pincode: pincode.trim() || undefined,
      }),
    });
    const result = await res.json().catch(() => null);
    setSavingProfile(false);
    if (!res.ok) {
      setError(result?.message ?? "Couldn't save your profile. Try again.");
      return;
    }

    const newSession: ShopperSession = {
      name: result.shopper.name,
      phone,
      email: result.shopper.email,
      preferredCategory: result.shopper.preferredCategory,
      pincode: result.shopper.pincode,
    };
    setShopperSession(newSession);
    setJustSignedUp(true);
    setSession(newSession);
  }

  function handleSignOut() {
    clearShopperSession();
    setSession(null);
    setJustSignedUp(false);
    setStep("phone");
    setPhone("");
    setOtp("");
    setName("");
    setEmail("");
    setCategory("");
    setPincode("");
    setAgreed(false);
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
          <h1 style={{ fontSize: 22, marginBottom: 4, fontWeight: 700 }}>
            {justSignedUp ? "Welcome" : "Hi"}, {session.name} 👋
          </h1>
          <p style={{ color: "var(--sio-muted)", marginBottom: 6, fontSize: 14 }}>+91 {session.phone}</p>
          {justSignedUp && (
            <p style={{ color: "var(--sio-muted)", marginBottom: 22, fontSize: 12.5 }}>
              Your account is all set up{session.preferredCategory ? ` — we'll surface more ${session.preferredCategory}'s picks for you` : ""}.
            </p>
          )}
          {!justSignedUp && <div style={{ marginBottom: 22 }} />}

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
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, marginBottom: 8, fontWeight: 700 }}>Welcome to SORT IT OUT</h1>
        <p style={{ color: "var(--sio-muted)", fontSize: 13.5, lineHeight: 1.6 }}>
          Sign in to track reservations and sync your wishlist across devices. My Sorts, Wishlist, and Cart already work locally without an account.
        </p>
      </div>

      <StepIndicator step={step} />

      <div
        style={{
          background: "var(--sio-paper)",
          border: "1px solid var(--sio-line)",
          borderRadius: 20,
          padding: 28,
          boxShadow: "0 20px 40px rgba(22, 20, 15, 0.05)",
        }}
      >
        {step === "phone" && (
          <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>Mobile number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile number"
                style={inputStyle}
                autoFocus
              />
              <p style={{ fontSize: 11.5, color: "var(--sio-muted)", marginTop: 6 }}>
                New here? We'll set up your account right after you verify this number.
              </p>
            </div>
            {error && <ErrorBanner text={error} />}
            <button type="submit" disabled={sending} className="sio-btn-primary sio-shine-btn" style={{ ...buttonStyle, opacity: sending ? 0.7 : 1 }}>
              {sending ? "Sending…" : "Send OTP"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 13.5, color: "var(--sio-muted)", textAlign: "center" }}>
              OTP sent to +91 {phone}.
              {devOtp && (
                <>
                  {" "}
                  <strong style={{ color: "var(--sio-ink)" }}>Dev mode — code: {devOtp}</strong> (no SMS gateway connected yet, so it's shown
                  here instead)
                </>
              )}
            </p>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit OTP"
              style={{ ...inputStyle, letterSpacing: "0.3em", fontSize: 18, textAlign: "center" }}
              autoFocus
            />
            {error && <ErrorBanner text={error} />}
            <button type="submit" disabled={verifying} className="sio-btn-primary sio-shine-btn" style={{ ...buttonStyle, opacity: verifying ? 0.7 : 1 }}>
              {verifying ? "Verifying…" : "Verify"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setOtp("");
                setDevOtp("");
                setError("");
              }}
              style={{ background: "none", border: "none", color: "var(--sio-muted)", fontSize: 13, cursor: "pointer", padding: 4 }}
            >
              ← Change number
            </button>
          </form>
        )}

        {step === "profile" && (
          <form onSubmit={handleCompleteProfile} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 13, color: "var(--sio-muted)", textAlign: "center", marginTop: -4 }}>
              🎉 Number verified. Tell us a little about you to finish setting up your account.
            </p>
            <div>
              <label style={labelStyle}>Full name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Sharma" style={inputStyle} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Email (optional)</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>What do you shop for most? (optional)</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["women", "men", "kids"] as Category[]).map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setCategory(category === c ? "" : c)}
                    style={{
                      flex: 1,
                      padding: "9px 0",
                      borderRadius: 10,
                      border: category === c ? "1.5px solid var(--sio-ink)" : "1px solid var(--sio-line)",
                      background: category === c ? "var(--sio-ink)" : "var(--sio-cream)",
                      color: category === c ? "#fff" : "var(--sio-ink)",
                      fontSize: 13,
                      fontWeight: 600,
                      textTransform: "capitalize",
                      cursor: "pointer",
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Home area pincode (optional)</label>
              <input
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="e.g. 400050"
                style={inputStyle}
              />
              <p style={{ fontSize: 11.5, color: "var(--sio-muted)", marginTop: 6 }}>
                Helps us default "Stores near you" to your area.
              </p>
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "var(--sio-muted)", cursor: "pointer" }}>
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 2 }} />
              <span>I agree to SORT IT OUT's Terms of Service and Privacy Policy.</span>
            </label>
            {error && <ErrorBanner text={error} />}
            <button
              type="submit"
              disabled={savingProfile}
              className="sio-btn-primary sio-shine-btn"
              style={{ ...buttonStyle, opacity: savingProfile ? 0.7 : 1 }}
            >
              {savingProfile ? "Setting up…" : "Create my account"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const current = STEP_ORDER.indexOf(step);
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 18 }}>
      {STEP_ORDER.map((s, i) => (
        <div
          key={s}
          style={{
            width: i === current ? 22 : 8,
            height: 8,
            borderRadius: 999,
            background: i <= current ? "var(--sio-ink)" : "var(--sio-line)",
            transition: "width 0.2s",
          }}
        />
      ))}
    </div>
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
