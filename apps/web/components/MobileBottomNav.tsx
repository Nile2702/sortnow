"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isMobileAppShellPage } from "../lib/mobile-shell";
import { getCart, cartCount } from "../lib/cart";

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

function DiscoverIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <rect x="6" y="4" width="12" height="16" rx="2.5" transform="rotate(-8 12 12)" opacity={active ? 0.5 : 1} />
      <rect x="6" y="4" width="12" height="16" rx="2.5" transform="rotate(6 12 12)" />
    </svg>
  );
}

function SortIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
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
  { href: "/discover", label: "Discover", Icon: DiscoverIcon, match: (p: string) => p.startsWith("/discover") },
  { href: "/cart", label: "Sort", Icon: SortIcon, match: (p: string) => p === "/cart" },
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
  const [cartN, setCartN] = useState(0);

  // Hooks must run on every render regardless of route (the app-shell check
  // below returns null conditionally), so this lives above that early
  // return rather than skipped when it wouldn't be rendered anyway.
  useEffect(() => {
    const refresh = () => setCartN(cartCount(getCart()));
    refresh();
    window.addEventListener("sio:cart-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("sio:cart-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

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
              <span style={{ position: "relative", display: "flex" }}>
                <tab.Icon active={active} />
                {tab.href === "/cart" && cartN > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -8,
                      minWidth: 15,
                      height: 15,
                      padding: "0 3px",
                      borderRadius: "50%",
                      background: "var(--sio-bronze-dark)",
                      color: "#fff",
                      fontSize: 9.5,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: 1,
                    }}
                  >
                    {cartN > 99 ? "99+" : cartN}
                  </span>
                )}
              </span>
              <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 500 }}>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
