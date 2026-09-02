# Multi-Tenant Storefront & Theme Engine

## 1. Tenancy & routing model

Each merchant is a `store` row (see `database/schema.sql`) with a unique
`slug` (e.g. `urban-vogue`) and optional `custom_domain`. Three ways to reach
a storefront, all resolving to the same rendering pipeline:

1. **Path-based (default, free tier):** `sortitout.in/store/urban-vogue`
2. **Subdomain (Pro+):** `urban-vogue.sortitout.in`
3. **Custom domain (Max tier):** `www.urbanvogue.com` (CNAME → platform,
   verified via DNS TXT record, TLS auto-provisioned via ACM/Let's Encrypt)

Next.js middleware inspects the incoming `Host` header and rewrites to a
single dynamic route `/store/[slug]`, so there is **one** rendering code
path regardless of which of the three access methods was used — see
`apps/web/middleware.ts` and `apps/web/app/store/[slug]/page.tsx`.

## 2. Theme Configuration Engine

Every store has a `theme_configurations` row storing a JSONB blob validated
against `schemas/theme-config.schema.json`. It captures:

- **Brand tokens:** primary/secondary/accent colors, font family pairs
  (heading/body), border-radius scale, logo/favicon URLs.
- **Layout:** hero banner carousel (images + CTA links), grid style
  (2/3/4-column, list vs. card), featured collection ordering, section
  order (banner → live sale strip → featured → categories → new arrivals).
- **Live sale strip:** on/off, countdown style, badge color.

At request time, the Storefront Renderer:

```
1. Resolve slug/domain → store_id (cached in Redis: theme:{store_id})
2. Fetch theme JSONB (cache-aside, 10 min TTL, invalidated on Theme Studio save)
3. Map theme tokens → CSS custom properties injected as an inline <style> tag
   scoped to :root for that request (SSR — no FOUC, no client-side theme flash)
4. Render shared component library (ProductGrid, HeroCarousel, LiveSaleBanner)
   which consume only var(--sio-*) CSS variables, never hardcoded colors
```

This means the **component code is 100% shared** across every tenant — only
CSS variable values and a JSON-driven layout order differ. No per-tenant
forked frontend code, no per-tenant deploys.

## 3. No-Code Storefront Studio (Seller Portal)

A visual editor in the Seller Portal (`portal.sortitout.in/studio`) that:
- Renders a live preview iframe pointed at a "draft" theme version
  (`theme_configurations.status = 'draft'`) so merchants see changes before
  publishing.
- Provides color pickers bound to the token schema, a font pair picker
  (curated Google Fonts subset for license/perf reasons), drag-to-reorder
  for homepage sections, and a banner-carousel image uploader (auto-runs
  through the Media Pipeline for compression).
- "Publish" copies `draft` → `live` theme version atomically and busts the
  Redis theme cache for that `store_id`; a version history table
  (`theme_configurations` keeps prior versions with `status='archived'`)
  allows one-click rollback.

## 4. O2O QR foot-traffic loop

- Each store (and optionally each physical table/rack for large stores) gets
  a `qr_codes` row pointing to `sortitout.in/store/{slug}?src=qr&pos={id}`.
- Scanning shows the **live catalog** filtered to `in_stock_at_store = true`
  with real-time inventory badges sourced from the same `inventory_ledger`
  the Seller Portal writes to — no separate "in-store" data model.
- `src=qr` query param is tracked in the `store_analytics_events` table to
  attribute footfall/conversion back to physical QR placement vs. online
  discovery, which merchants see on their portal dashboard.

## 5. Localization & low-bandwidth strategy

- All UI strings loaded via `next-intl` message catalogs
  (`en`, `hi`, `mr`, `ta`, `te`, `bn`, `gu`); product titles/descriptions are
  stored per-locale in `product_translations` (falls back to the store's
  default language, then English).
- PWA: `next-pwa`/Workbox service worker precaches the app shell + last-
  viewed store's theme assets; runtime caching (stale-while-revalidate) for
  product images; App Manifest for "Add to Home Screen" on budget Android
  devices common in Tier 2/3.
- Images served as responsive `<picture>` with AVIF → WebP → JPEG fallback,
  capped at 3 breakpoints to limit request fan-out on slow networks.
