"use client";

import { useState } from "react";

const STEPS = ["Business Details", "GSTIN Verification", "PAN Verification", "Bank/UPI Payout", "Done"];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("proprietorship");
  const [gstin, setGstin] = useState("");
  const [gstinStatus, setGstinStatus] = useState<"idle" | "checking" | "verified" | "skipped">("idle");
  const [pan, setPan] = useState("");
  const [panStatus, setPanStatus] = useState<"idle" | "checking" | "verified">("idle");
  const [upi, setUpi] = useState("");
  const [upiStatus, setUpiStatus] = useState<"idle" | "checking" | "verified">("idle");

  function verifyGstin() {
    setGstinStatus("checking");
    setTimeout(() => setGstinStatus("verified"), 1200);
  }
  function verifyPan() {
    setPanStatus("checking");
    setTimeout(() => setPanStatus("verified"), 1000);
  }
  function verifyUpi() {
    setUpiStatus("checking");
    setTimeout(() => setUpiStatus("verified"), 900);
  }

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Merchant Onboarding</h1>
      <p style={{ color: "#64748b", marginBottom: 24 }}>
        Mocked GSTIN/PAN/UPI verification per docs/05-onboarding-and-compliance.md — no real KYC provider is called in this demo.
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
              Optional if you're under the GST registration threshold (₹40L turnover for goods) — you can still sell without a GSTIN, but
              won't be able to issue tax invoices.
            </p>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>GSTIN</label>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  maxLength={15}
                  style={{ ...fieldStyle(), flex: 1 }}
                  placeholder="27ABCDE1234F1Z5"
                />
                <button onClick={verifyGstin} disabled={gstin.length !== 15 || gstinStatus === "checking"} style={verifyBtnStyle()}>
                  {gstinStatus === "checking" ? "Checking…" : "Verify"}
                </button>
              </div>
              {gstinStatus === "verified" && <StatusBadge ok text="GSTIN verified — Maharashtra, Active" />}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(2)} style={{ ...verifyBtnStyle(), background: "#fff", color: "#64748b", border: "1px solid #e2e8f0" }}>
                Skip for now
              </button>
              <NextButton disabled={gstinStatus !== "verified"} onClick={() => setStep(2)} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>PAN</label>
              <div style={{ display: "flex", gap: 10 }}>
                <input value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} maxLength={10} style={{ ...fieldStyle(), flex: 1 }} placeholder="ABCDE1234F" />
                <button onClick={verifyPan} disabled={pan.length !== 10 || panStatus === "checking"} style={verifyBtnStyle()}>
                  {panStatus === "checking" ? "Checking…" : "Verify"}
                </button>
              </div>
              {panStatus === "verified" && <StatusBadge ok text="PAN verified — name matches business records" />}
            </div>
            <NextButton disabled={panStatus !== "verified"} onClick={() => setStep(3)} />
          </div>
        )}

        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>UPI VPA for payouts</label>
              <div style={{ display: "flex", gap: 10 }}>
                <input value={upi} onChange={(e) => setUpi(e.target.value)} style={{ ...fieldStyle(), flex: 1 }} placeholder="yourbusiness@okhdfcbank" />
                <button onClick={verifyUpi} disabled={!upi.includes("@") || upiStatus === "checking"} style={verifyBtnStyle()}>
                  {upiStatus === "checking" ? "Verifying…" : "Verify"}
                </button>
              </div>
              {upiStatus === "verified" && <StatusBadge ok text="Penny-drop successful — account active" />}
            </div>
            <NextButton disabled={upiStatus !== "verified"} onClick={() => setStep(4)} label="Complete Onboarding" />
          </div>
        )}

        {step === 4 && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>You're all set!</h2>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>
              Next: pick a plan, customize your storefront in Theme Studio, and add your first products.
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

function StatusBadge({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div style={{ marginTop: 8, fontSize: 13, color: ok ? "#16a34a" : "#e11d48", display: "flex", alignItems: "center", gap: 6 }}>
      <span>{ok ? "✓" : "✕"}</span> {text}
    </div>
  );
}
