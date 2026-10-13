"use client";

import { useState } from "react";
import { useSellerStore } from "../../../../lib/use-seller-store";

const STEPS = ["Business Details", "GSTIN", "PAN", "Bank/UPI Payout", "Done"];

export default function OnboardingPage() {
  const { store } = useSellerStore();
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("proprietorship");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [upi, setUpi] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Only a "draft" store (just signed up, not yet submitted) needs
  // submitting - the pre-seeded demo stores are already "active" and are
  // just replaying this flow for its own sake, so skip the call there.
  //
  // This does NOT verify anything and does NOT activate the store - there
  // is no real GSTIN/PAN/UPI/KYC provider wired up. It just records what
  // the seller typed in and moves the store to "pending_review", where it
  // sits until the site owner manually looks it over and approves it (see
  // app/admin/sellers). See docs/05-onboarding-and-compliance.md.
  async function completeOnboarding() {
    if (store?.status !== "draft") {
      setStep(4);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/v1/seller/stores/${store.id}/submit-for-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gstin, pan, upiVpa: upi }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setSubmitError(body?.message || "Couldn't submit your details. Please try again.");
        return;
      }
      setStep(4);
    } catch {
      setSubmitError("Couldn't reach the server. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Merchant Onboarding</h1>
      <p style={{ color: "#64748b", marginBottom: 24 }}>
        We don't verify GSTIN/PAN/UPI automatically for the pilot - the site owner reviews every new seller's details by hand before the
        store goes live. See docs/05-onboarding-and-compliance.md.
      </p>

      {/* Step indicator */}
      <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ flex: 1 }}>
            <div style={{ height: 4, borderRadius: 999, background: i <= step ? "#0f172a" : "#e2e8f0", marginBottom: 6 }} />
            <div style={{ fontSize: 11, color: i <= step ? "#0f172a" : "#94a3b8" }}>{s}</div>
          </div>
        ))}
      </div>

      <div className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9", padding: 28 }}>
        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Legal business name</label>
              <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} style={fieldStyle()} placeholder="e.g. Urban Vogue Retail Pvt Ltd" />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Business type</label>
              <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} style={fieldStyle()}>
                <option value="proprietorship">Proprietorship</option>
                <option value="partnership">Partnership</option>
                <option value="pvt_ltd">Private Limited</option>
                <option value="llp">LLP</option>
              </select>
            </div>
            <NextButton disabled={!businessName.trim()} onClick={() => setStep(1)} />
          </div>
        )}

        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ fontSize: 13, color: "#64748b" }}>
              Optional if you're under the GST registration threshold (₹40L turnover for goods) - you can still sell without a GSTIN, but
              won't be able to issue tax invoices. We don't verify this automatically; the site owner checks it by hand before approving
              your store.
            </p>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>GSTIN</label>
              <input
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                maxLength={15}
                style={fieldStyle()}
                placeholder="27ABCDE1234F1Z5"
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(2)} style={{ ...verifyBtnStyle(), background: "#fff", color: "#64748b", border: "1px solid #e2e8f0" }}>
                Skip for now
              </button>
              <NextButton disabled={gstin.length > 0 && gstin.length !== 15} onClick={() => setStep(2)} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ fontSize: 13, color: "#64748b" }}>
              We don't verify this automatically either - just type it in and the site owner will check it against your business records
              before approving your store.
            </p>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>PAN</label>
              <input value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} maxLength={10} style={fieldStyle()} placeholder="ABCDE1234F" />
            </div>
            <NextButton disabled={pan.length !== 10} onClick={() => setStep(3)} />
          </div>
        )}

        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ fontSize: 13, color: "#64748b" }}>Where your payouts will be sent, once your store is approved and you start making sales.</p>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>UPI VPA for payouts</label>
              <input value={upi} onChange={(e) => setUpi(e.target.value)} style={fieldStyle()} placeholder="yourbusiness@okhdfcbank" />
            </div>
            {submitError && <p style={{ color: "#e11d48", fontSize: 13, margin: 0 }}>{submitError}</p>}
            <NextButton disabled={!upi.includes("@") || submitting} onClick={completeOnboarding} label={submitting ? "Submitting…" : "Submit for review"} />
          </div>
        )}

        {step === 4 && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Your details are submitted</h2>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>
              We'll review your GSTIN/PAN/UPI details and activate your store shortly - you'll be notified once it's live. In the meantime
              you can set up your storefront and add your first products.
            </p>
            <a
              href="/seller"
              style={{ display: "inline-block", padding: "12px 24px", borderRadius: 999, background: "#0f172a", color: "#fff", textDecoration: "none", fontWeight: 600 }}
            >
              Go to Dashboard
            </a>
          </div>
        )}
      </div>
    </main>
  );
}

function fieldStyle(): React.CSSProperties {
  return { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14 };
}

function verifyBtnStyle(): React.CSSProperties {
  return { padding: "10px 18px", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" };
}

function NextButton({ onClick, disabled, label = "Continue" }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "12px 24px",
        borderRadius: 999,
        border: "none",
        background: disabled ? "#e2e8f0" : "#0f172a",
        color: disabled ? "#94a3b8" : "#fff",
        fontWeight: 600,
        fontSize: 14,
        cursor: disabled ? "not-allowed" : "pointer",
        alignSelf: "flex-start",
      }}
    >
      {label}
    </button>
  );
}
