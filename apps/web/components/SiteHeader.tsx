"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getCart, cartCount } from "../lib/cart";
import { getWishlist } from "../lib/wishlist";
import { CATEGORY_TREE } from "../lib/catalog-constants";
import { LogoBadge } from "./LogoBadge";
import { getShopperSession, onShopperSessionChange, ShopperSession } from "../lib/shopper-session";

function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s-7.5-4.6-10-9.3C0.3 8.1 2 4.5 5.6 4c2-.3 3.8.7 4.9 2.4C11.6 4.7 13.4 3.7 15.4 4c3.6.5 5.3 4.1 3.6 7.7C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
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

function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
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

interface SearchSuggestion {
  id: string;
  title: string;
  basePrice: number;
  storeName: string;
  images?: { url: string }[];
}

export function SiteHeader() {
  const router = useRouter();
  const [cartN, setCartN] = useState(0);
  const [wishN, setWishN] = useState(0);
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopper, setShopper] = useState<ShopperSession | null>(null);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef<HTMLFormElement | null>(null);

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

  useEffect(() => {
    setShopper(getShopperSession());
    return onShopperSessionChange(() => setShopper(getShopperSession()));
  }, []);

  // Debounced as-you-type suggestions - waits for a short pause in typing
  // before hitting the search API, so we're not firing a request per
  // keystroke.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }
    setLoadingSuggestions(true);
    const timer = setTimeout(() => {
      fetch(`/api/v1/products/search?q=${encodeURIComponent(trimmed)}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((results: SearchSuggestion[]) => {
          setSuggestions(results.slice(0, 6));
          setActiveIndex(-1);
        })
        .finally(() => setLoadingSuggestions(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setShowSuggestions(false);
    router.push(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : "/");
  }

  function goToSuggestion(s: SearchSuggestion) {
    setShowSuggestions(false);
    router.push(`/product/${s.id}`);
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      goToSuggestion(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  return (
    <div
      className="sio-glass"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        borderLeft: "none",
        borderRight: "none",
        borderTop: "none",
        borderBottomWidth: 1,
        borderBottomStyle: "solid",
      }}
    >
      <div
        className="sio-header-row"
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        <button
          className="sio-mobile-menu-btn"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Menu"
          style={{ background: "none", border: "none", color: "var(--sio-ink)", cursor: "pointer", padding: 4 }}
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
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "0.03em",
            textDecoration: "none",
            color: "var(--sio-ink)",
            whiteSpace: "nowrap",
          }}
        >
          <LogoBadge size={40} />
          <span className="sio-logo-text">SORT IT OUT</span>
        </Link>

        <nav className="sio-header-nav">
          {CATEGORY_TREE.map((c) => (
            <CategoryMenu key={c.value} gender={c.value} label={c.label} subCategories={c.subCategories} />
          ))}
          <Link href="/shops" style={{ color: "var(--sio-ink-soft)", textDecoration: "none", whiteSpace: "nowrap", padding: "8px 10px", fontSize: 13 }}>
            Shops
          </Link>
        </nav>

        <form
          ref={searchRef}
          onSubmit={handleSearch}
          className="sio-header-search-form"
          style={{ flex: "1 1 100px", minWidth: 0, position: "relative" }}
          autoComplete="off"
        >
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--sio-muted)" }}>
            <SearchIcon />
          </span>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search for products…"
            autoComplete="off"
            style={{
              width: "100%",
              padding: "10px 14px 10px 38px",
              border: "1px solid var(--sio-line)",
              background: "var(--sio-cream)",
              fontSize: 14,
              outline: "none",
              borderRadius: 999,
            }}
          />

          {showSuggestions && query.trim().length >= 2 && (
            <div
              className="sio-dropdown"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                right: 0,
                background: "var(--sio-paper)",
                border: "1px solid var(--sio-line)",
                borderRadius: 14,
                boxShadow: "0 16px 32px rgba(22,20,15,0.12)",
                padding: 6,
                zIndex: 30,
                maxHeight: 380,
                overflowY: "auto",
              }}
            >
              {loadingSuggestions ? (
                <div style={{ padding: "14px 12px", fontSize: 13, color: "var(--sio-muted)" }}>Searching…</div>
              ) : suggestions.length === 0 ? (
                <div style={{ padding: "14px 12px", fontSize: 13, color: "var(--sio-muted)" }}>
                  No products found for &ldquo;{query.trim()}&rdquo;
                </div>
              ) : (
                <>
                  {suggestions.map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => goToSuggestion(s)}
                      onMouseEnter={() => setActiveIndex(i)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "none",
                        background: i === activeIndex ? "var(--sio-cream)" : "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <img
                        src={s.images?.[0]?.url}
                        alt=""
                        style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0, background: "var(--sio-cream)" }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {s.title}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--sio-muted)" }}>{s.storeName}</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, flexShrink: 0, color: "var(--sio-ink)" }}>₹{s.basePrice}</div>
                    </button>
                  ))}
                  <button
                    type="submit"
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "10px 12px",
                      marginTop: 2,
                      borderRadius: 10,
                      border: "none",
                      borderTop: "1px solid var(--sio-line)",
                      background: "none",
                      color: "var(--sio-bronze-dark)",
                      fontWeight: 600,
                      fontSize: 12.5,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    See all results for &ldquo;{query.trim()}&rdquo; →
                  </button>
                </>
              )}
            </div>
          )}
        </form>

        <nav className="sio-header-icons" style={{ display: "flex", gap: 20, alignItems: "center", whiteSpace: "nowrap" }}>
          <Link href="/wishlist" style={{ position: "relative", color: "var(--sio-ink-soft)", display: "flex" }} aria-label="Wishlist">
            <HeartIcon />
            {wishN > 0 && <CountBadge n={wishN} />}
          </Link>
          <Link href="/cart" style={{ position: "relative", color: "var(--sio-ink-soft)", display: "flex" }} aria-label="Your Sort">
            <SortIcon />
            {cartN > 0 && <CountBadge n={cartN} />}
          </Link>
          <Link href="/reservations" className="sio-header-reservations" style={{ color: "var(--sio-ink-soft)", display: "flex" }} aria-label="My Reservations">
            <ReceiptIcon />
          </Link>
          {shopper ? (
            <Link
              href="/account"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                textDecoration: "none",
                color: "var(--sio-ink)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "var(--sio-ink)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  flexShrink: 0,
                }}
              >
                {shopper.name.trim().charAt(0).toUpperCase()}
              </span>
              <span className="sio-login-label" style={{ whiteSpace: "nowrap" }}>
                Hi, {shopper.name.split(" ")[0]}
              </span>
            </Link>
          ) : (
            <Link
              href="/account"
              className="sio-btn-primary sio-shine-btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 20px",
                background: "var(--sio-ink)",
                color: "#fff",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 999,
              }}
            >
              <span className="sio-login-label">Login / Sign up</span>
              <span className="sio-login-icon" aria-hidden>
                <PersonIcon />
              </span>
            </Link>
          )}
        </nav>
      </div>

      {mobileOpen && <MobileMenu onNavigate={() => setMobileOpen(false)} shopper={shopper} />}
    </div>
  );
}

function MobileMenu({ onNavigate, shopper }: { onNavigate: () => void; shopper: ShopperSession | null }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="sio-mobile-menu sio-fade-in" style={{ borderTop: "1px solid var(--sio-line)", background: "var(--sio-paper)" }}>
      {CATEGORY_TREE.map((c) => (
        <div key={c.value} style={{ borderBottom: "1px solid var(--sio-line)" }}>
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
              color: "var(--sio-ink)",
              cursor: "pointer",
            }}
          >
            {c.label}
            <ChevronIcon open={expanded === c.value} />
          </button>
          {expanded === c.value && (
            <div style={{ paddingBottom: 8 }}>
              <Link href={`/category/${c.value}`} onClick={onNavigate} style={mobileLinkStyle(true)}>
                All {c.label}
              </Link>
              {c.subCategories.map((sc) => (
                <Link key={sc} href={`/category/${c.value}?subCategory=${encodeURIComponent(sc)}`} onClick={onNavigate} style={mobileLinkStyle(false)}>
                  {sc}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
      <Link href="/shops" onClick={onNavigate} style={{ ...mobileLinkStyle(true), padding: "14px 20px" }}>
        Shops
      </Link>
      <div style={{ display: "flex", gap: 10, padding: "16px 20px", borderTop: "1px solid var(--sio-line)" }}>
        <Link
          href="/account"
          onClick={onNavigate}
          style={{ flex: 1, textAlign: "center", padding: "12px", background: "var(--sio-ink)", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 600, borderRadius: 999 }}
        >
          {shopper ? `Hi, ${shopper.name.split(" ")[0]}` : "Login / Sign up"}
        </Link>
      </div>
    </div>
  );
}

function mobileLinkStyle(bold: boolean): React.CSSProperties {
  return {
    display: "block",
    padding: "10px 20px 10px 32px",
    color: bold ? "var(--sio-ink)" : "var(--sio-muted)",
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
        href={`/category/${gender}`}
        aria-expanded={open}
        aria-haspopup="true"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          color: open ? "var(--sio-ink)" : "var(--sio-ink-soft)",
          whiteSpace: "nowrap",
          padding: "8px 10px",
          fontWeight: open ? 600 : 400,
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
            background: "var(--sio-paper)",
            border: "1px solid var(--sio-line)",
            borderRadius: 14,
            boxShadow: "0 16px 32px rgba(22,20,15,0.1)",
            padding: 8,
            minWidth: 190,
            zIndex: 30,
          }}
        >
          <Link href={`/category/${gender}`} className="sio-dropdown-link" style={dropdownLinkStyle(true)} onClick={() => setOpen(false)}>
            All {label}
          </Link>
          <div style={{ height: 1, background: "var(--sio-line)", margin: "4px 0" }} />
          {subCategories.map((sc) => (
            <Link
              key={sc}
              href={`/category/${gender}?subCategory=${encodeURIComponent(sc)}`}
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
    borderRadius: 8,
    color: bold ? "var(--sio-ink)" : "var(--sio-ink-soft)",
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
        background: "var(--sio-bronze-dark)",
        color: "#fff",
        borderRadius: "50%",
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

