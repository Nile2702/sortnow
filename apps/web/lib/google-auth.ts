// Verifies the ID token "Continue with Google" (Google Identity Services'
// JS button, see app/account/page.tsx) hands back, via Google's own
// tokeninfo REST endpoint rather than pulling in google-auth-library or a
// JWT library to verify the RS256 signature locally - same call-a-REST-
// endpoint-directly convention as lib/email.ts (Resend) and
// lib/ai-photo-enhance.ts (Gemini), and plenty for a pilot's login volume.
// Google's own docs flag this endpoint as better suited to debugging than
// high-QPS production use (undocumented rate limits) - worth switching to
// local JWKS verification if real traffic ever makes that endpoint a
// bottleneck, but not before.
const TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";

export interface GoogleIdentity {
  googleId: string;
  email: string;
  name: string;
}

export type VerifyResult = { ok: true; identity: GoogleIdentity } | { ok: false; reason: string };

// GOOGLE_CLIENT_ID is public by design (it's embedded in the client-side
// Sign In With Google button too, see NEXT_PUBLIC_GOOGLE_CLIENT_ID) - the
// security boundary is the token's signature (verified by Google itself via
// this endpoint) and the audience check below, not keeping the client ID
// secret.
export async function verifyGoogleIdToken(credential: string): Promise<VerifyResult> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return { ok: false, reason: "not_configured" };

  let response: Response;
  try {
    response = await fetch(`${TOKENINFO_URL}?id_token=${encodeURIComponent(credential)}`);
  } catch {
    return { ok: false, reason: "upstream_error" };
  }
  if (!response.ok) return { ok: false, reason: "invalid_token" };

  const payload = await response.json().catch(() => null);
  if (!payload) return { ok: false, reason: "invalid_token" };

  // The endpoint verifies the signature and expiry for us, but NOT the
  // audience - a token minted for an unrelated app would otherwise pass.
  if (payload.aud !== clientId) return { ok: false, reason: "wrong_audience" };
  // tokeninfo returns booleans as the strings "true"/"false", not real
  // booleans - comparing loosely here would silently accept an unverified
  // email.
  if (payload.email_verified !== "true" && payload.email_verified !== true) {
    return { ok: false, reason: "email_not_verified" };
  }
  if (!payload.sub || !payload.email) return { ok: false, reason: "invalid_token" };

  return {
    ok: true,
    identity: { googleId: payload.sub, email: payload.email, name: payload.name ?? payload.email.split("@")[0] },
  };
}
