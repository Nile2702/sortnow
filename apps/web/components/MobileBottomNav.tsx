"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isMobileAppShellPage } from "../lib/mobile-shell";

const BAR_HEIGHT = 60;

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M4 11.5L12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function CategoryIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

function ReservationIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
      {!active && <path d="M9 8h6M9 12h6" />}
    </svg>
  );
}

function AccountIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

const TABS = [
  { href: "/", label: "Home", Icon: HomeIcon, match: (p: string) => p === "/" },
  { href: "/search", label: "Category", Icon: CategoryIcon, match: (p: string) => p === "/search" || p.startsWith("/category/") },
  { href: "/reservations", label: "Reservations", Icon: ReservationIcon, match: (p: string) => p.startsWith("/reservations") },
  { href: "/account", label: "Account", Icon: AccountIcon, match: (p: string) => p.startsWith("/account") },
];

// Persistent bottom tab bar for the two pages redesigned as an app-style
// mobile experience - see MobileAppHeader for the matching header and
// lib/mobile-shell.ts for the shared page rule (every shopper page except
// product detail, which already has its own back navigation and no room
// to spare above the fold; the seller portal has its own nav entirely).
export function MobileBottomNav() {
  const pathname = usePathname();
  if (!isMobileAppShellPage(pathname)) return null;

  return (
    <>
      <div className="sio-app-bottom-spacer" style={{ height: BAR_HEIGHT }} />
      <nav className="sio-app-bottom-nav sio-glass" style={{ height: BAR_HEIGHT }}>
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                textDecoration: "none",
                color: active ? "var(--sio-bronze-dark)" : "var(--sio-muted)",
              }}
            >
              <tab.Icon active={active} />
              <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 500 }}>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
