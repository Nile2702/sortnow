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

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" />
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

export function SiteHeader() {
  const router = useRouter();
  const [cartN, setCartN] = useState(0);
  const [wishN, setWishN] = useState(0);
  const [query, setQuery] = useState("");

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
          maxWidth: 1100,
          margin: "0 auto",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        <Link href="/" style={{ fontSize: 20, fontWeight: 800, textDecoration: "none", color: "#0f172a", whiteSpace: "nowrap" }}>
          SORT IT <span style={{ color: "#2563eb" }}>OUT</span>
        </Link>

        <form onSubmit={handleSearch} style={{ flex: 1, position: "relative", maxWidth: 480 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
            <SearchIcon />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sarees, kurtis, denim…"
            style={{
              width: "100%",
              padding: "10px 14px 10px 36px",
              borderRadius: 999,
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              fontSize: 14,
              outline: "none",
            }}
          />
        </form>

        <nav style={{ display: "flex", gap: 20, alignItems: "center", fontSize: 12, color: "#334155", marginLeft: "auto" }}>
          <Link href="/account" style={navIconStyle}>
            <UserIcon />
            <span>Account</span>
          </Link>
          <Link href="/wishlist" style={navIconStyle}>
            <span style={{ position: "relative" }}>
              <HeartIcon />
              {wishN > 0 && <CountBadge n={wishN} />}
            </span>
            <span>Wishlist</span>
          </Link>
          <Link href="/cart" style={navIconStyle}>
            <span style={{ position: "relative" }}>
              <BagIcon />
              {cartN > 0 && <CountBadge n={cartN} />}
            </span>
            <span>Cart</span>
          </Link>
        </nav>
      </div>

      <div style={{ borderTop: "1px solid #f1f5f9" }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "10px 16px",
            display: "flex",
            gap: 4,
            alignItems: "center",
            fontSize: 13,
            flexWrap: "wrap",
          }}
        >
          <Link href="/" style={{ color: "#475569", textDecoration: "none", whiteSpace: "nowrap", padding: "8px 12px" }}>
            All
          </Link>
          {CATEGORY_TREE.map((c) => (
            <CategoryMenu key={c.value} gender={c.value} label={c.label} subCategories={c.subCategories} />
          ))}
          <Link
            href="/?liveOnly=true"
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "#e11d48",
              fontWeight: 700,
              textDecoration: "none",
              whiteSpace: "nowrap",
              padding: "8px 12px",
            }}
          >
            <span className="sio-live-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "#e11d48", display: "inline-block" }} />
            Live Sales
          </Link>
        </div>
      </div>
    </div>
  );
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

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: open ? "#0f172a" : "#475569",
          whiteSpace: "nowrap",
          padding: "8px 10px",
          fontWeight: open ? 700 : 400,
          fontSize: 13,
          fontFamily: "inherit",
        }}
      >
        {label}
        <ChevronIcon open={open} />
      </button>

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

const navIconStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
  color: "#334155",
  textDecoration: "none",
};
