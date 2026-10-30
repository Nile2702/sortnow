"use client";

import { useEffect, useState } from "react";
import { useSellerStore } from "../../../../lib/use-seller-store";
import { showToast } from "../../../../lib/toast";
import { LoadingScreen } from "../../../../components/LoadingSpinner";
import { CheckIcon } from "../../../../components/icons";

interface GeminiKeyData {
  hasKey: boolean;
  keyPreview: string | null;
}

// Replaces the old "AI Photo Credits" page - Add Mannequin used to run on a
// shared platform Gemini key, metered against credits a seller bought from
// SORT NOW (fake pricing, no real payment processor ever wired up). Now
// each seller brings their own free key instead, so nothing is bought here
// at all - this page is just where that key is pasted in and managed.
export default function GeminiKeyPage() {
  const { store, loading: storeLoading } = useSellerStore();
  const [data, setData] = useState<GeminiKeyData | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState(false);

  function load(storeId: string) {
    setLoadError(false);
    fetch(`/api/v1/seller/stores/${storeId}/gemini-key`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch(() => setLoadError(true));
  }

  useEffect(() => {
    if (store) load(store.id);
  }, [store]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!store) return;
    setError("");
    setSaving(true);
    const res = await fetch(`/api/v1/seller/stores/${store.id}/gemini-key`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: keyInput.trim() }),
    });
    const result = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      setError(result?.message ?? "Couldn't save that key.");
      return;
    }
    setData(result);
    setKeyInput("");
    showToast("Gemini API key saved", "success");
  }

  async function handleRemove() {
    if (!store) return;
    setRemoving(true);
    const res = await fetch(`/api/v1/seller/stores/${store.id}/gemini-key`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: null }),
    });
    setRemoving(false);
    if (!res.ok) {
      showToast("Couldn't remove the key. Try again.");
      return;
    }
    setData(await res.json());
    showToast("Gemini API key removed");
  }

  if (loadError) {
    return (
      <main style={{ maxWidth: 700, margin: "0 auto", padding: 40, textAlign: "center" }}>
        <p style={{ fontWeight: 600, marginBottom: 12 }}>Couldn't load your Gemini key settings.</p>
        <button
          onClick={() => store && load(store.id)}
          style={{ padding: "10px 20px", borderRadius: 999, border: "none", background: "var(--sio-ink)", color: "#fff", fontWeight: 600, cursor: "pointer" }}
        >
          Retry
        </button>
      </main>
    );
  }

  if (storeLoading || !store || !data) {
    return <LoadingScreen maxWidth={700} />;
  }

  return (
    <main style={{ maxWidth: 700, margin: "0 auto", padding: "28px 20px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Gemini API Key</h1>
      <p style={{ color: "var(--sio-muted)", marginBottom: 28 }}>
        Used only by the <strong>Add Mannequin</strong> step in your product photos (background removal is always free and needs no key).
        You bring your own Gemini API key from Google — nothing is bought or charged through SORT NOW for this feature. Google doesn't offer
        a free tier for this kind of image generation, so each photo is a small, real charge (typically a few rupees) billed to your own
        Google account, not to SORT NOW.
      </p>

      <div className="sio-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--sio-cream)", padding: 24, marginBottom: 24 }}>
        {data.hasKey ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: "var(--sio-success-bg)", color: "var(--sio-success)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <CheckIcon size={11} strokeWidth={2.6} /> Connected
              </span>
              <span style={{ fontSize: 13, color: "var(--sio-muted)", fontFamily: "monospace" }}>{data.keyPreview}</span>
            </div>
            <button
              onClick={handleRemove}
              disabled={removing}
              style={{ padding: "9px 18px", borderRadius: 999, border: "1px solid var(--sio-error-border)", background: "#fff", color: "var(--sio-error)", fontWeight: 600, fontSize: 13, cursor: removing ? "default" : "pointer" }}
            >
              {removing ? "Removing…" : "Remove key"}
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "var(--sio-muted)", marginBottom: 16 }}>No Gemini API key on file yet — Add Mannequin won't work until you add one.</p>
            <form onSubmit={handleSave} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Paste your Gemini API key"
                style={{ flex: 1, minWidth: 220, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--sio-line)", fontSize: 13 }}
              />
              <button
                type="submit"
                disabled={saving || !keyInput.trim()}
                style={{ padding: "10px 20px", borderRadius: 999, border: "none", background: "var(--sio-ai-accent)", color: "#fff", fontWeight: 600, fontSize: 13, cursor: saving ? "default" : "pointer" }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </form>
            {error && <p style={{ fontSize: 13, color: "var(--sio-error)", marginTop: 10 }}>{error}</p>}
          </>
        )}
      </div>

      <div className="sio-card" style={{ background: "var(--sio-cream)", borderRadius: 16, border: "1px solid var(--sio-cream)", padding: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>How to get a key</h2>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--sio-muted)", lineHeight: 1.8 }}>
          <li>
            Open{" "}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: "var(--sio-ai-accent)" }}>
              aistudio.google.com/app/apikey
            </a>{" "}
            and sign in with any Google account.
          </li>
          <li>Click "Create API key" — this part is free and takes about two minutes.</li>
          <li>
            Image generation isn't covered by Google's free tier, so you'll also need to turn on billing for your Google account if you
            haven't already (Google will prompt you) — each mannequin photo then costs Google's own small fee, typically a few rupees,
            charged directly to you.
          </li>
          <li>Copy the key and paste it above.</li>
        </ol>
        <p style={{ fontSize: 12, color: "var(--sio-muted)", marginTop: 12 }}>
          SORT NOW never sees or charges for any of this — it's entirely between you and Google.
        </p>
      </div>
    </main>
  );
}
