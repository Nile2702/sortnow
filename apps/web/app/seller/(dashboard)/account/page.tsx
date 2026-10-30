"use client";

import { useEffect, useState } from "react";
import { useSellerStore } from "../../../../lib/use-seller-store";
import { showToast } from "../../../../lib/toast";
import { LoadingScreen } from "../../../../components/LoadingSpinner";
import { ClipboardIcon } from "../../../../components/icons";

const STEPS = ["Business Details", "GSTIN", "PAN", "Bank/UPI Payout", "Done"];

// Shown only while the store is still "draft" - a brand-new signup that's
// never been submitted for review. Once submitted (pending_review/active/
// suspended/closed), this tab shows AccountDetailsForm below instead - the
// wizard has nothing left to "complete", and re-running it used to be a
// dead-end that silently discarded whatever a seller re-typed into it.
function OnboardingWizard({ storeId }: { storeId: string }) {
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("proprietorship");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [upi, setUpi] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // This does NOT verify anything and does NOT activate the store - there
  // is no real GSTIN/PAN/UPI/KYC provider wired up. It just records what
  // the seller typed in and moves the store to "pending_review", where it
  // sits until the site owner manually looks it over and approves it (see
  // app/admin/sellers). See docs/05-onboarding-and-compliance.md.
  async function completeOnboarding() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/v1/seller/stores/${storeId}/submit-for-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legalBusinessName: businessName, businessType, gstin, pan, upiVpa: upi }),
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
    <>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Merchant Onboarding</h1>
      <p style={{ color: "var(--sio-muted)", marginBottom: 24 }}>
        We don't verify GSTIN/PAN/UPI automatically for the pilot - the site owner reviews every new seller's details by hand before the
        store goes live. See docs/05-onboarding-and-compliance.md.
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ flex: 1 }}>
            <div style={{ height: 4, borderRadius: 999, background: i <= step ? "var(--sio-ink)" : "var(--sio-line)", marginBottom: 6 }} />
            <div style={{ fontSize: 11, color: i <= step ? "var(--sio-ink)" : "var(--sio-muted)" }}>{s}</div>
          </div>
        ))}
      </div>

      <div className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--sio-cream)", padding: 28 }}>
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
            <p style={{ fontSize: 13, color: "var(--sio-muted)" }}>
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
              <button onClick={() => setStep(2)} style={{ ...verifyBtnStyle(), background: "#fff", color: "var(--sio-muted)", border: "1px solid var(--sio-line)" }}>
                Skip for now
              </button>
              <NextButton disabled={gstin.length > 0 && gstin.length !== 15} onClick={() => setStep(2)} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ fontSize: 13, color: "var(--sio-muted)" }}>
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
            <p style={{ fontSize: 13, color: "var(--sio-muted)" }}>Where your payouts will be sent, once your store is approved and you start making sales.</p>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>UPI VPA for payouts</label>
              <input value={upi} onChange={(e) => setUpi(e.target.value)} style={fieldStyle()} placeholder="yourbusiness@okhdfcbank" />
            </div>
            {submitError && <p style={{ color: "var(--sio-error)", fontSize: 13, margin: 0 }}>{submitError}</p>}
            <NextButton disabled={!upi.includes("@") || submitting} onClick={completeOnboarding} label={submitting ? "Submitting…" : "Submit for review"} />
          </div>
        )}

        {step === 4 && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "var(--sio-ink)" }}>
              <ClipboardIcon size={40} strokeWidth={1.5} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Your details are submitted</h2>
            <p style={{ color: "var(--sio-muted)", fontSize: 14, marginBottom: 20 }}>
              We'll review your GSTIN/PAN/UPI details and activate your store shortly - you'll be notified once it's live. In the meantime
              you can set up your storefront and add your first products.
            </p>
            <a
              href="/seller"
              style={{ display: "inline-block", padding: "12px 24px", borderRadius: 999, background: "var(--sio-ink)", color: "#fff", textDecoration: "none", fontWeight: 600 }}
            >
              Go to Dashboard
            </a>
          </div>
        )}
      </div>
    </>
  );
}

interface AccountDetails {
  name: string;
  status: string;
  legalBusinessName?: string | null;
  businessType?: string | null;
  gstin?: string | null;
  pan?: string | null;
  upiVpa?: string | null;
  phone?: string;
  email?: string;
  submittedForReviewAt?: string | null;
}

const STATUS_NOTE: Record<string, string> = {
  pending_review: "Your details are submitted and awaiting the site owner's review - you can still fix anything below before it's approved.",
  suspended: "Your store is on hold, but your account details are unaffected - update anything below if it's changed.",
  closed: "Your store is closed. These details are kept for your records and for support if you reopen.",
};

// Shown for every status except "draft" - a plain edit form for whatever
// the onboarding wizard (or a previous edit) already recorded, since none
// of this was ever editable again after first submission until now.
function AccountDetailsForm({ storeId }: { storeId: string }) {
  const [data, setData] = useState<AccountDetails | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [loadError, setLoadError] = useState(false);

  function load() {
    setLoadError(false);
    fetch(`/api/v1/seller/stores/${storeId}/account`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: AccountDetails) => {
        setData(d);
        setForm({
          legalBusinessName: d.legalBusinessName ?? "",
          businessType: d.businessType ?? "proprietorship",
          gstin: d.gstin ?? "",
          pan: d.pan ?? "",
          upiVpa: d.upiVpa ?? "",
          phone: d.phone ?? "",
          email: d.email ?? "",
        });
      })
      .catch(() => setLoadError(true));
  }

  useEffect(load, [storeId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSaving(true);
    const res = await fetch(`/api/v1/seller/stores/${storeId}/account`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      setErrors(result?.errors ?? [result?.message ?? "Couldn't save your details."]);
      return;
    }
    setData(result);
    showToast("Account details saved", "success");
  }

  if (loadError) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <p style={{ fontWeight: 600, marginBottom: 12 }}>Couldn't load your account details.</p>
        <button
          onClick={load}
          style={{ padding: "10px 20px", borderRadius: 999, border: "none", background: "var(--sio-ink)", color: "#fff", fontWeight: 600, cursor: "pointer" }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return <LoadingScreen maxWidth={640} />;

  const note = STATUS_NOTE[data.status];

  return (
    <>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Account</h1>
      <p style={{ color: "var(--sio-muted)", marginBottom: note ? 10 : 24 }}>
        The business, tax, and payout details you submitted during onboarding — update anything here if it's changed. None of this is
        re-verified automatically; the site owner reviews changes to GSTIN/PAN the same way as at signup.
      </p>
      {note && <p style={{ color: "var(--sio-pending)", fontSize: 13, marginBottom: 24 }}>{note}</p>}

      <form
        onSubmit={handleSave}
        className="sio-card"
        style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--sio-cream)", padding: 28, display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Legal business name</label>
          <input
            value={form.legalBusinessName}
            onChange={(e) => setForm((f) => ({ ...f, legalBusinessName: e.target.value }))}
            style={fieldStyle()}
            placeholder="e.g. Urban Vogue Retail Pvt Ltd"
          />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Business type</label>
          <select value={form.businessType} onChange={(e) => setForm((f) => ({ ...f, businessType: e.target.value }))} style={fieldStyle()}>
            <option value="proprietorship">Proprietorship</option>
            <option value="partnership">Partnership</option>
            <option value="pvt_ltd">Private Limited</option>
            <option value="llp">LLP</option>
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>GSTIN</label>
            <input
              value={form.gstin}
              onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))}
              maxLength={15}
              style={fieldStyle()}
              placeholder="27ABCDE1234F1Z5"
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>PAN</label>
            <input
              value={form.pan}
              onChange={(e) => setForm((f) => ({ ...f, pan: e.target.value.toUpperCase() }))}
              maxLength={10}
              style={fieldStyle()}
              placeholder="ABCDE1234F"
            />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>UPI VPA for payouts</label>
          <input value={form.upiVpa} onChange={(e) => setForm((f) => ({ ...f, upiVpa: e.target.value }))} style={fieldStyle()} placeholder="yourbusiness@okhdfcbank" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Phone</label>
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} style={fieldStyle()} placeholder="9876543210" />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              style={fieldStyle()}
              placeholder="you@business.com"
            />
          </div>
        </div>

        {errors.length > 0 && (
          <div style={{ fontSize: 13, color: "var(--sio-error)" }}>
            {errors.map((e) => (
              <div key={e}>{e}</div>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{
            alignSelf: "flex-start",
            padding: "12px 24px",
            borderRadius: 999,
            border: "none",
            background: saving ? "var(--sio-muted)" : "var(--sio-ink)",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            cursor: saving ? "default" : "pointer",
          }}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </>
  );
}

export default function AccountPage() {
  const { store, loading } = useSellerStore();

  if (loading || !store) {
    return <LoadingScreen maxWidth={640} />;
  }

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "28px 20px 60px" }}>
      {store.status === "draft" ? <OnboardingWizard storeId={store.id} /> : <AccountDetailsForm storeId={store.id} />}
    </main>
  );
}

function fieldStyle(): React.CSSProperties {
  return { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--sio-line)", fontSize: 14 };
}

function verifyBtnStyle(): React.CSSProperties {
  return { padding: "10px 18px", borderRadius: 10, border: "none", background: "var(--sio-ink)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" };
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
        background: disabled ? "var(--sio-line)" : "var(--sio-ink)",
        color: disabled ? "var(--sio-muted)" : "#fff",
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
