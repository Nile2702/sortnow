import { FullLogo } from "../../../components/LogoBadge";

// Plain <form> POSTing to app/api/v1/admin/login/route.ts - same
// no-client-JS convention every other admin action already uses (approve,
// suspend, hold, ...). Replaces pasting ?key=<ADMIN_SECRET> into the URL
// (see lib/admin-auth.ts and lib/admin-session.ts for why) with an actual
// login: middleware.ts redirects here whenever a visitor has neither a
// valid session cookie nor a legacy ?key= link.
export default function AdminLoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
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
        <h1 style={{ fontSize: 18, fontWeight: 700, textAlign: "center", marginBottom: 4 }}>Admin sign in</h1>
        <p style={{ fontSize: 13, color: "var(--sio-muted)", textAlign: "center", marginBottom: 20 }}>
          For reviewing and moderating sellers.
        </p>

        <form method="post" action="/api/v1/admin/login" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="admin-password" style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
              Admin password
            </label>
            <input
              id="admin-password"
              name="password"
              type="password"
              required
              autoFocus
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--sio-line)", fontSize: 14 }}
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
              Incorrect password. Try again.
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
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
