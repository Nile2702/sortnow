"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { getShopperSession, setShopperSession, clearShopperSession, ShopperSession } from "../../lib/shopper-session";
import { validatePassword } from "../../lib/validate-password";
import { ErrorBanner } from "../../components/ErrorBanner";
import { ClockIcon, HeartIcon, CompassIcon, CheckIcon, GiftIcon } from "../../components/icons";

type Step = "email" | "otp" | "profile" | "google-phone";
type Category = "men" | "women" | "kids";
type Mode = "login" | "signup";

const STEP_ORDER: Step[] = ["email", "otp", "profile"];

// Every handler below POSTs JSON and reads a JSON response - this just
// shares the one bit each used to skip: a genuine network failure (offline,
// DNS, a dropped mobile connection) throwing out of a bare `await fetch(...)`
// instead of being caught, which left whatever button triggered it stuck in
// its "...ing" state forever with no error shown. Returns null on any
// network-level failure instead of throwing; a non-2xx HTTP response is NOT
// treated as a failure here, it's returned normally so each caller can still
// read its own {error, message} shape exactly as before.
async function postJson(url: string, body: unknown): Promise<{ res: Response; data: any } | null> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => null);
    return { res, data };
  } catch {
    return null;
  }
}

const NETWORK_ERROR_MESSAGE = "Couldn't reach the server. Check your connection and try again.";

export default function AccountPage() {
  const [session, setSession] = useState<ShopperSession | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>("email");
  const [noAccountFound, setNoAccountFound] = useState(false);
  const [alreadyHadAccount, setAlreadyHadAccount] = useState(false);
  // The account identifier throughout this page - entered first, verified by
  // OTP, and used to look up (or create) the shopper record. Phone is only
  // ever collected afterwards (profile step, or google-phone), since
  // reservations/notifications/pickup still need one on file even though
  // it's no longer what a shopper logs in with.
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  // Alternative to the OTP step for a returning shopper who set a password
  // during an earlier signup - OTP always still works regardless (see the
  // "Use OTP instead" link below), this is purely a skip-the-wait
  // convenience, never the only way in.
  const [usePasswordLogin, setUsePasswordLogin] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [passwordLoggingIn, setPasswordLoggingIn] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [justSignedUp, setJustSignedUp] = useState(false);
  // Shown only because no real email provider is connected yet (see
  // lib/email.ts) - the server has nowhere else to actually deliver the code
  // to in this environment, so it hands it back for the demo to display.
  const [devOtp, setDevOtp] = useState("");

  // "Continue with Google" - a verified email proves identity instantly, but
  // every shopper record here is keyed by phone (reservations, notifications
  // all look up by it), so a brand-new Google sign-in still needs one more
  // step to collect that before an account can exist. See
  // /api/v1/auth/google.
  const [googleReady, setGoogleReady] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState("");
  const [pendingGoogleName, setPendingGoogleName] = useState("");
  const [pendingGoogleEmail, setPendingGoogleEmail] = useState("");
  const [googleAgreed, setGoogleAgreed] = useState(false);

  // Profile-step fields - only asked of a genuinely first-time customer
  // (see handleVerify: existingShopper comes back null).
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [referredByCode, setReferredByCode] = useState("");
  const [referrals, setReferrals] = useState<{ referralCode: string; count: number } | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  useEffect(() => {
    setSession(getShopperSession());
    setReady(true);
    // ?ref=CODE on the invite link a shopper shared - only ever consulted
    // for a brand-new signup (see handleCompleteProfile), never on login.
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) setReferredByCode(ref);
  }, []);

  useEffect(() => {
    if (!session) return;
    fetch(`/api/v1/shopper/referrals?phone=${session.phone}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setReferrals);
  }, [session]);

  // Renders Google's own button into the placeholder div below once both the
  // Identity Services script (loaded via next/script) and a client ID are
  // ready. No client ID (NEXT_PUBLIC_GOOGLE_CLIENT_ID unset, e.g. this
  // deployment hasn't been through Google Cloud Console setup yet) means the
  // whole section simply never renders - same graceful-degradation shape as
  // RESEND_API_KEY elsewhere in this app.
  useEffect(() => {
    if (!googleReady || session || (step !== "email" && step !== "google-phone")) return;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const google = (window as any).google;
    if (!clientId || !google?.accounts?.id) return;
    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: { credential: string }) => handleGoogleCredential(response.credential),
    });
    const target = document.getElementById("google-signin-button");
    if (target) {
      target.innerHTML = "";
      google.accounts.id.renderButton(target, { theme: "outline", size: "large", width: 360, text: mode === "signup" ? "signup_with" : "signin_with" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleReady, session, step, mode]);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email address.");
    setSending(true);
    const outcome = await postJson("/api/v1/auth/otp/request", { email: email.trim() });
    setSending(false);
    if (!outcome) return setError(NETWORK_ERROR_MESSAGE);
    const { res, data } = outcome;
    if (!res.ok) {
      setError(data?.message ?? "Couldn't send an OTP. Try again.");
      return;
    }
    setDevOtp(data.devOtp ?? "");
    setStep("otp");
  }

  // Called by Google's own button once the person picks an account there -
  // credential is a signed ID token, re-verified server-side (see
  // /api/v1/auth/google) rather than trusted as-is.
  async function handleGoogleCredential(credential: string) {
    setError("");
    setGoogleBusy(true);
    const outcome = await postJson("/api/v1/auth/google", { credential });
    setGoogleBusy(false);
    if (!outcome) return setError(NETWORK_ERROR_MESSAGE);
    const { res, data } = outcome;
    if (!res.ok) {
      setError(data?.message ?? "Couldn't sign in with Google. Try again.");
      return;
    }
    if (data.shopper) {
      setAlreadyHadAccount(mode === "signup");
      const restored: ShopperSession = {
        name: data.shopper.name,
        phone: data.shopper.phone,
        email: data.shopper.email,
        preferredCategory: data.shopper.preferredCategory,
        pincode: data.shopper.pincode,
        city: data.shopper.city,
        dateOfBirth: data.shopper.dateOfBirth,
      };
      setShopperSession(restored);
      setSession(restored);
      return;
    }
    // Verified identity, but no account yet - one more step to get a phone
    // number before there's anywhere to put a session.
    setPendingGoogleCredential(credential);
    setPendingGoogleName(data.googleName ?? "");
    setPendingGoogleEmail(data.googleEmail ?? "");
    setStep("google-phone");
  }

  async function handleFinishGoogleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^\d{10}$/.test(phone)) return setError("Enter a valid 10-digit mobile number.");
    if (!googleAgreed) return setError("Please accept the Terms & Privacy Policy to continue.");
    setGoogleBusy(true);
    const outcome = await postJson("/api/v1/auth/google", { credential: pendingGoogleCredential, phone, agreed: true });
    setGoogleBusy(false);
    if (!outcome) return setError(NETWORK_ERROR_MESSAGE);
    const { res, data } = outcome;
    if (!res.ok) {
      setError(data?.message ?? "Couldn't finish setting up your account. Try again.");
      return;
    }
    const newSession: ShopperSession = {
      name: data.shopper.name,
      phone,
      email: data.shopper.email,
      preferredCategory: data.shopper.preferredCategory,
      pincode: data.shopper.pincode,
      city: data.shopper.city,
      dateOfBirth: data.shopper.dateOfBirth,
    };
    setShopperSession(newSession);
    setJustSignedUp(true);
    setSession(newSession);
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (!loginPassword) return setError("Enter your password.");
    setPasswordLoggingIn(true);
    const outcome = await postJson("/api/v1/shopper/auth/password-login", { email: email.trim(), password: loginPassword });
    setPasswordLoggingIn(false);
    if (!outcome) return setError(NETWORK_ERROR_MESSAGE);
    const { res, data } = outcome;
    if (!res.ok) {
      setError(data?.message ?? "Incorrect email or password.");
      return;
    }
    const restored: ShopperSession = {
      name: data.shopper.name,
      phone: data.shopper.phone,
      email: data.shopper.email,
      preferredCategory: data.shopper.preferredCategory,
      pincode: data.shopper.pincode,
      city: data.shopper.city,
      dateOfBirth: data.shopper.dateOfBirth,
    };
    setShopperSession(restored);
    setSession(restored);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setVerifying(true);
    const outcome = await postJson("/api/v1/auth/otp/verify", { email: email.trim(), code: otp });
    setVerifying(false);
    if (!outcome) return setError(NETWORK_ERROR_MESSAGE);
    const { res, data } = outcome;
    if (!res.ok) {
      setError(data?.message ?? "Incorrect or expired OTP.");
      return;
    }

    const existing = data.existingShopper as (ShopperSession & { id?: string; createdAt?: string }) | null;
    if (existing) {
      // Returning customer, even on a fresh device/browser - their profile
      // lives server-side (lib/seed-data.ts Shopper), not just this
      // device's localStorage, so no need to ask them anything again -
      // their phone comes back from the server too, never re-typed here.
      // If they came in through "Sign up" for an email that already has an
      // account, log them straight in rather than erroring - just flag it
      // so the welcome screen can say so.
      setAlreadyHadAccount(mode === "signup");
      const restored: ShopperSession = {
        name: existing.name,
        phone: existing.phone,
        email: existing.email,
        preferredCategory: existing.preferredCategory,
        pincode: existing.pincode,
        city: existing.city,
        dateOfBirth: existing.dateOfBirth,
      };
      setShopperSession(restored);
      setSession(restored);
      return;
    }

    // No account exists for this email yet - collect a proper profile
    // (including a phone number, never asked for until now) before letting
    // them in, whether they arrived via "Log in" or "Sign up".
    setNoAccountFound(mode === "login");
    setStep("profile");
  }

  async function handleCompleteProfile(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Enter your name.");
    if (!/^\d{10}$/.test(phone)) return setError("Enter a valid 10-digit mobile number.");
    if (!agreed) return setError("Please accept the Terms & Privacy Policy to continue.");
    if (pincode.trim() && !/^\d{6}$/.test(pincode.trim())) return setError("Pincode must be 6 digits, or leave it blank.");
    if (dateOfBirth && new Date(dateOfBirth) > new Date()) return setError("Date of birth can't be in the future.");
    if (password) {
      const { errors } = validatePassword(password);
      if (errors.length > 0) return setError(`${errors[0]} Or leave the password field blank.`);
    }

    setSavingProfile(true);
    const outcome = await postJson("/api/v1/shopper/profile", {
      name,
      phone,
      email: email.trim(),
      preferredCategory: category || undefined,
      pincode: pincode.trim() || undefined,
      city: city.trim() || undefined,
      dateOfBirth: dateOfBirth || undefined,
      marketingOptIn,
      password: password || undefined,
      referredByCode: referredByCode || undefined,
    });
    setSavingProfile(false);
    if (!outcome) return setError(NETWORK_ERROR_MESSAGE);
    const { res, data } = outcome;
    if (!res.ok) {
      setError(data?.message ?? "Couldn't save your profile. Try again.");
      return;
    }

    const newSession: ShopperSession = {
      name: data.shopper.name,
      phone,
      email: data.shopper.email,
      preferredCategory: data.shopper.preferredCategory,
      pincode: data.shopper.pincode,
      city: data.shopper.city,
      dateOfBirth: data.shopper.dateOfBirth,
    };
    setShopperSession(newSession);
    setJustSignedUp(true);
    setSession(newSession);
  }

  function handleSignOut() {
    clearShopperSession();
    setSession(null);
    setJustSignedUp(false);
    setMode("login");
    setStep("email");
    setNoAccountFound(false);
    setAlreadyHadAccount(false);
    setPhone("");
    setOtp("");
    setName("");
    setEmail("");
    setCategory("");
    setPincode("");
    setCity("");
    setDateOfBirth("");
    setPassword("");
    setAgreed(false);
    setMarketingOptIn(false);
    setUsePasswordLogin(false);
    setLoginPassword("");
    setPendingGoogleCredential("");
    setPendingGoogleName("");
    setPendingGoogleEmail("");
    setGoogleAgreed(false);
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
          {!justSignedUp && alreadyHadAccount && (
            <p style={{ color: "var(--sio-muted)", marginBottom: 22, fontSize: 12.5 }}>
              Looks like you already had an account with this number — logged you straight in.
            </p>
          )}
          {!justSignedUp && !alreadyHadAccount && <div style={{ marginBottom: 22 }} />}

          <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
            <AccountLink href="/reservations" icon={<ClockIcon size={20} strokeWidth={1.8} />} label="My Reservations" desc="Track pickup holds you've reserved at nearby stores." />
            <AccountLink href="/wishlist" icon={<HeartIcon size={20} strokeWidth={1.8} />} label="Wishlist" desc="Items you've saved for later." />
            <AccountLink href="/sorts" icon={<CompassIcon size={20} strokeWidth={1.8} />} label="My Sorts" desc="Saved filters across nearby stores." />
          </div>

          {referrals && (
            <div
              style={{
                marginTop: 18,
                textAlign: "left",
                border: "1px solid var(--sio-line)",
                borderRadius: 14,
                padding: "14px 16px",
                background: "var(--sio-cream)",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
                <GiftIcon size={16} strokeWidth={1.8} /> Invite friends
              </div>
              <div style={{ fontSize: 12, color: "var(--sio-muted)", marginBottom: 10 }}>
                {referrals.count === 0
                  ? "Share your link — friends who sign up help you both discover more nearby stores."
                  : `You've referred ${referrals.count} friend${referrals.count === 1 ? "" : "s"} so far.`}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  readOnly
                  value={typeof window !== "undefined" ? `${window.location.origin}/?ref=${referrals.referralCode}` : ""}
                  style={{ ...inputStyle, flex: 1, fontSize: 12, background: "#fff" }}
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(`${window.location.origin}/?ref=${referrals.referralCode}`);
                    setInviteCopied(true);
                    setTimeout(() => setInviteCopied(false), 2000);
                  }}
                  style={{ padding: "0 16px", borderRadius: 10, border: "none", background: "var(--sio-ink)", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  {inviteCopied ? (
                    <>
                      Copied <CheckIcon size={12} />
                    </>
                  ) : (
                    "Copy"
                  )}
                </button>
              </div>
            </div>
          )}

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
        <h1 style={{ fontSize: 24, marginBottom: 8, fontWeight: 700 }}>{mode === "login" ? "Log in" : "Create your account"}</h1>
        <p style={{ color: "var(--sio-muted)", fontSize: 13.5, lineHeight: 1.6 }}>
          Sign in to track reservations and sync your wishlist across devices. My Sorts, Wishlist, and Cart already work locally without an account.
        </p>
      </div>

      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={() => setGoogleReady(true)} />

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
        {step === "email" && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
          <div style={{ marginBottom: 18 }}>
            <div id="google-signin-button" style={{ display: "flex", justifyContent: "center" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
              <div style={{ flex: 1, height: 1, background: "var(--sio-line)" }} />
              <span style={{ fontSize: 12, color: "var(--sio-muted)" }}>or use your email</span>
              <div style={{ flex: 1, height: 1, background: "var(--sio-line)" }} />
            </div>
          </div>
        )}
        {step === "google-phone" && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
          <div id="google-signin-button" style={{ display: "flex", justifyContent: "center" }} />
        )}

        {step === "email" && mode === "login" && usePasswordLogin && (
          <form onSubmit={handlePasswordLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label htmlFor="account-login-email" style={labelStyle}>Email address</label>
              <input
                id="account-login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                style={inputStyle}
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="account-login-password" style={labelStyle}>Password</label>
              <input
                id="account-login-password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Your password"
                style={inputStyle}
              />
            </div>
            {error && <ErrorBanner text={error} />}
            <button
              type="submit"
              disabled={passwordLoggingIn}
              className="sio-btn-primary sio-shine-btn"
              style={{ ...buttonStyle, opacity: passwordLoggingIn ? 0.7 : 1 }}
            >
              {passwordLoggingIn ? "Logging in…" : "Log in"}
            </button>
            <p style={{ textAlign: "center", fontSize: 13, color: "var(--sio-muted)", margin: 0 }}>
              Didn't set a password, or forgot it?{" "}
              <button
                type="button"
                onClick={() => {
                  setUsePasswordLogin(false);
                  setError("");
                  setLoginPassword("");
                }}
                style={linkButtonStyle}
              >
                Use OTP instead
              </button>
            </p>
          </form>
        )}

        {step === "email" && !(mode === "login" && usePasswordLogin) && (
          <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label htmlFor="account-email" style={labelStyle}>Email address</label>
              <input
                id="account-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                style={inputStyle}
                autoFocus
              />
              {mode === "signup" && (
                <p style={{ fontSize: 11.5, color: "var(--sio-muted)", marginTop: 6 }}>
                  We'll set up your account right after you verify this email - we'll ask for your mobile number next.
                </p>
              )}
            </div>
            {error && <ErrorBanner text={error} />}
            <button type="submit" disabled={sending} className="sio-btn-primary sio-shine-btn" style={{ ...buttonStyle, opacity: sending ? 0.7 : 1 }}>
              {sending ? "Sending…" : "Send OTP"}
            </button>
            <p style={{ textAlign: "center", fontSize: 13, color: "var(--sio-muted)", margin: 0 }}>
              {mode === "login" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setError("");
                    }}
                    style={linkButtonStyle}
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError("");
                    }}
                    style={linkButtonStyle}
                  >
                    Log in
                  </button>
                </>
              )}
            </p>
            {mode === "login" && (
              <p style={{ textAlign: "center", fontSize: 13, color: "var(--sio-muted)", margin: 0 }}>
                Have a password set up?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setUsePasswordLogin(true);
                    setError("");
                  }}
                  style={linkButtonStyle}
                >
                  Log in with password instead
                </button>
              </p>
            )}
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 13.5, color: "var(--sio-muted)", textAlign: "center" }}>
              OTP sent to {email}.
              {devOtp && (
                <>
                  {" "}
                  Your code: <strong style={{ color: "var(--sio-ink)" }}>{devOtp}</strong>
                </>
              )}
            </p>
            <input
              aria-label="6-digit OTP"
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
                setStep("email");
                setOtp("");
                setDevOtp("");
                setError("");
              }}
              style={{ background: "none", border: "none", color: "var(--sio-muted)", fontSize: 13, cursor: "pointer", padding: 4 }}
            >
              ← Change email
            </button>
          </form>
        )}

        {step === "google-phone" && (
          <form onSubmit={handleFinishGoogleSignup} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 13, color: "var(--sio-muted)", textAlign: "center", marginTop: -4 }}>
              Signed in as <strong style={{ color: "var(--sio-ink)" }}>{pendingGoogleEmail}</strong>. One more thing — what's your mobile number?
            </p>
            <div>
              <label htmlFor="account-google-phone" style={labelStyle}>Mobile number</label>
              <input
                id="account-google-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile number"
                style={inputStyle}
                autoFocus
              />
              <p style={{ fontSize: 11.5, color: "var(--sio-muted)", marginTop: 6 }}>
                Used for reservation pickups and seller notifications — never shared publicly.
              </p>
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "var(--sio-muted)", cursor: "pointer" }}>
              <input type="checkbox" checked={googleAgreed} onChange={(e) => setGoogleAgreed(e.target.checked)} style={{ marginTop: 2 }} />
              <span>I agree to SORT NOW's Terms of Service and Privacy Policy.</span>
            </label>
            {error && <ErrorBanner text={error} />}
            <button type="submit" disabled={googleBusy} className="sio-btn-primary sio-shine-btn" style={{ ...buttonStyle, opacity: googleBusy ? 0.7 : 1 }}>
              {googleBusy ? "Setting up…" : "Finish signing up"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setError("");
                setPhone("");
                setGoogleAgreed(false);
                setPendingGoogleCredential("");
              }}
              style={{ background: "none", border: "none", color: "var(--sio-muted)", fontSize: 13, cursor: "pointer", padding: 4 }}
            >
              ← Use a different sign-in method
            </button>
          </form>
        )}

        {step === "profile" && (
          <form onSubmit={handleCompleteProfile} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 13, color: "var(--sio-muted)", textAlign: "center", marginTop: -4 }}>
              {noAccountFound
                ? "We couldn't find an account for that email. Let's create one — tell us a little about you."
                : "🎉 Email verified. Tell us a little about you to finish setting up your account."}
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                color: "var(--sio-muted)",
                background: "var(--sio-cream)",
                border: "1px solid var(--sio-line)",
                borderRadius: 10,
                padding: "10px 12px",
              }}
            >
              <span style={{ color: "var(--sio-success)", display: "flex" }}><CheckIcon size={15} strokeWidth={2.4} /></span>
              <span>
                <strong style={{ color: "var(--sio-ink)" }}>{email}</strong> verified
              </span>
            </div>
            <div>
              <label htmlFor="account-profile-name" style={labelStyle}>Full name *</label>
              <input id="account-profile-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Sharma" style={inputStyle} autoFocus />
            </div>
            <div>
              <label htmlFor="account-profile-phone" style={labelStyle}>Mobile number *</label>
              <input
                id="account-profile-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile number"
                style={inputStyle}
              />
              <p style={{ fontSize: 11.5, color: "var(--sio-muted)", marginTop: 6 }}>
                Used for reservation pickups and seller notifications — never shared publicly.
              </p>
            </div>
            <div>
              <label style={labelStyle}>What do you shop for most? (optional)</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["women", "men", "kids"] as Category[]).map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setCategory(category === c ? "" : c)}
                    aria-pressed={category === c}
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
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label htmlFor="account-profile-city" style={labelStyle}>City (optional)</label>
                <input id="account-profile-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Mumbai" style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label htmlFor="account-profile-pincode" style={labelStyle}>Pincode (optional)</label>
                <input
                  id="account-profile-pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="e.g. 400050"
                  style={inputStyle}
                />
              </div>
            </div>
            <p style={{ fontSize: 11.5, color: "var(--sio-muted)", marginTop: -8 }}>Helps us default "Stores near you" to your area.</p>
            <div>
              <label htmlFor="account-profile-dob" style={labelStyle}>Date of birth (optional)</label>
              <input
                id="account-profile-dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                style={inputStyle}
              />
              <p style={{ fontSize: 11.5, color: "var(--sio-muted)", marginTop: 6 }}>So we can send you a birthday treat.</p>
            </div>
            <div>
              <label htmlFor="account-profile-password" style={labelStyle}>Set a password (optional)</label>
              <input
                id="account-profile-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters, a letter, a number, and a symbol"
                style={inputStyle}
              />
              <p style={{ fontSize: 11.5, color: "var(--sio-muted)", marginTop: 6 }}>
                You can always log in with just an OTP - set a password if you'd rather skip waiting for one next time.
              </p>
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "var(--sio-muted)", cursor: "pointer" }}>
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 2 }} />
              <span>I agree to SORT NOW's Terms of Service and Privacy Policy.</span>
            </label>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "var(--sio-muted)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
                style={{ marginTop: 2 }}
              />
              <span>Send me offers, restocks, and nearby sales by email (optional).</span>
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
  // "google-phone" is a side path off "email", not a fourth stage - shown at
  // the same position as "profile" (the other "just need one more thing"
  // step) rather than adding a dot that would apply to every other flow too.
  const current = STEP_ORDER.indexOf(step === "google-phone" ? "profile" : step);
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

function AccountLink({ href, icon, label, desc }: { href: string; icon: React.ReactNode; label: string; desc: string }) {
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
      <span style={{ flexShrink: 0, color: "var(--sio-ink)" }}>{icon}</span>
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

const linkButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  color: "var(--sio-ink)",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  textDecoration: "underline",
};
