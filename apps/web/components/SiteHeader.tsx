"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getCart, cartCount } from "../lib/cart";
import { getWishlist } from "../lib/wishlist";
import { CATEGORY_TREE } from "../lib/seed-data";

function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s-7.5-4.6-10-9.3C0.3 8.1 2 4.5 5.6 4c2-.3 3.8.7 4.9 2.4C11.6 4.7 13.4 3.7 15.4 4c3.6.5 5.3 4.1 3.6 7.7C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 8h12l-1 12H7L6 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function LogoMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round">
      <path d="M4 6h16" />
      <path d="M6 12h12" />
      <path d="M9 18h6" />
    </svg>
  );
}

export function SiteHeader() {
  const router = useRouter();
  const [cartN, setCartN] = useState(0);
  const [wishN, setWishN] = useState(0);
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setCartN(cartCount(getCart()));
      setWishN(getWishlist().length);
    };
    refresh();
    window.addEventListener("sio:cart-updated", refresh);
    window.addEventListener("sio:wishlist-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("sio:cart-updated", refresh);
      window.removeEventListener("sio:wishlist-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(query.trim() ? `/?q=${encodeURIComponent(query.trim())}` : "/");
  }

  return (
    <div style={{ position: "sticky", top: 0, zIndex: 20, background: "#fff", boxShadow: "0 1px 2px rgba(15,23,42,0.06)" }}>
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <button
          className="sio-mobile-menu-btn"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Menu"
          style={{ background: "none", border: "none", color: "#0f172a", cursor: "pointer", padding: 4 }}
        >
          {mobileOpen ? <CloseIcon /> : <MenuIcon />}
        </button>

        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--site-font-heading)",
            fontSize: 19,
            fontWeight: 700,
            textDecoration: "none",
            color: "#0f172a",
            whiteSpace: "nowrap",
          }}
        >
          <LogoMark />
          SORT IT OUT
        </Link>

        <nav className="sio-header-nav">
          {CATEGORY_TREE.map((c) => (
            <CategoryMenu key={c.value} gender={c.value} label={c.label} subCategories={c.subCategories} />
          ))}
          <Link href="/" style={{ color: "#334155", textDecoration: "none", whiteSpace: "nowrap", padding: "8px 10px" }}>
            Shops
          </Link>
        </nav>

        <form onSubmit={handleSearch} style={{ flex: "1 1 100px", minWidth: 0, position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
            <SearchIcon />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for products…"
            style={{
              width: "100%",
              padding: "10px 14px 10px 38px",
              borderRadius: 999,
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              fontSize: 14,
              outline: "none",
            }}
          />
        </form>

        <nav style={{ display: "flex", gap: 18, alignItems: "center", whiteSpace: "nowrap" }}>
          <Link href="/wishlist" style={{ position: "relative", color: "#334155", display: "flex" }} aria-label="Wishlist">
            <HeartIcon />
            {wishN > 0 && <CountBadge n={wishN} />}
          </Link>
          <Link href="/cart" style={{ position: "relative", color: "#334155", display: "flex" }} aria-label="Cart">
            <BagIcon />
            {cartN > 0 && <CountBadge n={cartN} />}
          </Link>
          <Link href="/orders" style={{ color: "#334155", display: "flex" }} aria-label="Orders">
            <ReceiptIcon />
          </Link>
          <Link
            href="/account"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 999,
              background: "#0f172a",
              color: "#fff",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Login / Sign Up
          </Link>
        </nav>
      </div>

      {mobileOpen && <MobileMenu onNavigate={() => setMobileOpen(false)} />}
    </div>
  );
}

function MobileMenu({ onNavigate }: { onNavigate: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="sio-mobile-menu sio-fade-in" style={{ borderTop: "1px solid #f1f5f9", background: "#fff" }}>
      {CATEGORY_TREE.map((c) => (
        <div key={c.value} style={{ borderBottom: "1px solid #f8fafc" }}>
          <button
            onClick={() => setExpanded(expanded === c.value ? null : c.value)}
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 20px",
              background: "none",
              border: "none",
              fontSize: 15,
              fontWeight: 600,
              color: "#0f172a",
              cursor: "pointer",
            }}
          >
            {c.label}
            <ChevronIcon open={expanded === c.value} />
          </button>
          {expanded === c.value && (
            <div style={{ paddingBottom: 8 }}>
              <Link href={`/?gender=${c.value}`} onClick={onNavigate} style={mobileLinkStyle(true)}>
                All {c.label}
              </Link>
              {c.subCategories.map((sc) => (
                <Link key={sc} href={`/?gender=${c.value}&subCategory=${encodeURIComponent(sc)}`} onClick={onNavigate} style={mobileLinkStyle(false)}>
                  {sc}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
      <Link href="/" onClick={onNavigate} style={{ ...mobileLinkStyle(true), padding: "14px 20px" }}>
        Shops
      </Link>
      <div style={{ display: "flex", gap: 10, padding: "16px 20px", borderTop: "1px solid #f1f5f9" }}>
        <Link
          href="/account"
          onClick={onNavigate}
          style={{ flex: 1, textAlign: "center", padding: "10px", borderRadius: 999, background: "#0f172a", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 600 }}
        >
          Login / Sign Up
        </Link>
      </div>
    </div>
  );
}

function mobileLinkStyle(bold: boolean): React.CSSProperties {
  return {
    display: "block",
    padding: "10px 20px 10px 32px",
    color: bold ? "#0f172a" : "#475569",
    fontWeight: bold ? 600 : 400,
    fontSize: 14,
    textDecoration: "none",
  };
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      style={{ transition: "transform 0.15s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function CategoryMenu({ gender, label, subCategories }: { gender: string; label: string; subCategories: string[] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openNow() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }

  // Small delay before closing so crossing the gap between the trigger and
  // the panel (or a brief cursor overshoot) doesn't flicker the menu shut -
  // this is what makes hover-to-open actually reliable.
  function closeSoon() {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative" }} onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <Link
        href={`/?gender=${gender}`}
        aria-expanded={open}
        aria-haspopup="true"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          color: open ? "#0f172a" : "#475569",
          whiteSpace: "nowrap",
          padding: "8px 10px",
          fontWeight: open ? 700 : 400,
          fontSize: 13,
          textDecoration: "none",
        }}
      >
        {label}
        <ChevronIcon open={open} />
      </Link>

      {open && (
        <div
          className="sio-dropdown"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            boxShadow: "0 12px 24px rgba(15,23,42,0.14)",
            padding: 8,
            minWidth: 190,
            zIndex: 30,
          }}
        >
          <Link href={`/?gender=${gender}`} className="sio-dropdown-link" style={dropdownLinkStyle(true)} onClick={() => setOpen(false)}>
            All {label}
          </Link>
          <div style={{ height: 1, background: "#f1f5f9", margin: "4px 0" }} />
          {subCategories.map((sc) => (
            <Link
              key={sc}
              href={`/?gender=${gender}&subCategory=${encodeURIComponent(sc)}`}
              className="sio-dropdown-link"
              style={dropdownLinkStyle(false)}
              onClick={() => setOpen(false)}
            >
              {sc}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function dropdownLinkStyle(bold: boolean): React.CSSProperties {
  return {
    display: "block",
    padding: "8px 10px",
    borderRadius: 6,
    color: bold ? "#0f172a" : "#475569",
    fontWeight: bold ? 600 : 400,
    textDecoration: "none",
    fontSize: 13,
  };
}

function CountBadge({ n }: { n: number }) {
  return (
    <span
      style={{
        position: "absolute",
        top: -8,
        right: -10,
        background: "#e11d48",
        color: "#fff",
        borderRadius: 999,
        fontSize: 10,
        padding: "1px 5px",
        minWidth: 14,
        textAlign: "center",
      }}
    >
      {n}
    </span>
  );
}

