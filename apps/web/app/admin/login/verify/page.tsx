import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FullLogo } from "../../../../components/LogoBadge";
import { verifyAdminPendingToken, ADMIN_PENDING_2FA_COOKIE } from "../../../../lib/admin-session";

// Second factor of /admin/login - only reachable with a valid pending-2FA
// cookie (issued by app/api/v1/admin/login/route.ts right after the
// password check passes). Anyone landing here without one - the cookie
// expired (10 minutes, see lib/admin-session.ts), got cleared, or they
// just typed this URL directly - gets bounced back to start over with the
// password again, rather than shown a dead-end OTP form with nothing to
// verify against.
export default async function AdminLoginVerifyPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string; dev_otp?: string };
}) {
  const pendingToken = cookies().get(ADMIN_PENDING_2FA_COOKIE)?.value;
  if (!(await verifyAdminPendingToken(pendingToken))) {
    redirect(`/admin/login${searchParams.next ? `?next=${encodeURIComponent(searchParams.next)}` : ""}`);
  }

  const next = searchParams.next ?? "/admin/sellers";

  return (
    <main style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px" }}>
      <div
        className="sio-card"
        style={{ width: "100%", maxWidth: 360, background: "#fff", borderRadius: 16, border: "1px solid var(--sio-line)", padding: 28 }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <FullLogo height={34} chip />
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 700, textAlign: "center", marginBottom: 4 }}>Enter your code</h1>
        <p style={{ fontSize: 13, color: "var(--sio-muted)", textAlign: "center", marginBottom: 20 }}>
          We've emailed a 6-digit code to the admin address on file.
        </p>

        {searchParams.dev_otp && (
          <p style={{ fontSize: 12, color: "var(--sio-muted)", textAlign: "center", marginBottom: 16 }}>
            Dev mode — code: <strong style={{ color: "var(--sio-ink)" }}>{searchParams.dev_otp}</strong> (no email provider connected yet)
          </p>
        )}

        <form method="post" action="/api/v1/admin/login/verify" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="admin-otp" style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
              6-digit code
            </label>
            <input
              id="admin-otp"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              autoFocus
              maxLength={6}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--sio-line)",
                fontSize: 18,
                letterSpacing: "0.3em",
                textAlign: "center",
              }}
            />
          </div>

          {searchParams.error && (
            <p
              role="alert"
              style={{
                fontSize: 13,
                color: "var(--sio-error)",
                background: "var(--sio-error-bg)",
                border: "1px solid var(--sio-error-border)",
                borderRadius: 10,
                padding: "10px 12px",
                margin: 0,
              }}
            >
              Incorrect or expired code. Try again.
            </p>
          )}

          <button
            type="submit"
            style={{
              marginTop: 6,
              padding: "12px",
              borderRadius: 999,
              border: "none",
              background: "var(--sio-ink)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Verify &amp; sign in
          </button>
        </form>
      </div>
    </main>
  );
}
