# SORT IT OUT — Pan-India O2O Fashion Discovery & Multi-Tenant Commerce Platform

"Sort it, find it, shop it near you."

SORT IT OUT is a multi-tenant Online-to-Offline (O2O) platform that lets every
independent boutique, regional chain, and ethnic/Western retailer in India run
a storefront, while shoppers discover apparel near them by PIN code, filter
("sort") by what they want, and either buy online or walk into the physical
store already knowing what's in stock.

## What's actually running

[apps/web](apps/web) is a real, working Next.js app — not just docs. Run it with:

```bash
cd apps/web && npm install && npm run dev
```

**Consumer site** (`/`)
- Hyperlocal discovery by PIN code, radius (1–25 km), and Men/Women/Kids
  category + subcategory filters (hover dropdown on desktop, tap accordion
  on mobile).
- **Shop in Sort** — cross-store product search (price, size, sort-by) that
  finds matching apparel across every nearby store at once. Save a filter
  combo as a **Smart Sort** (`/sorts`) and re-apply it later.
- Per-store storefronts (`/store/[slug]`) sharing one design system —
  header, fonts, spacing, and card style are uniform site-wide; each store's
  theme only tints its own hero gradient and CTA/accent color, so stores
  stay distinguishable without looking like different products.
- Wishlist, cart, checkout → real order creation → order confirmation and
  history (`/orders`), all working end to end.

**Seller Portal** (`/seller`) — pick a demo store from the switcher (no auth
in this build) and manage it:
- **Dashboard** — live stats (SKU count, low-stock alerts, plan, status).
- **Products** — full CRUD against the live catalog; changes appear on the
  storefront immediately.
- **Theme Studio** — color pickers + hero copy editor with a live preview,
  publishes straight to the store's theme.
- **QR Marketing** — generates a real, scannable QR code per placement
  (shop window, table, etc.), tagged for footfall attribution.
- **Billing** — Lite/Pro/Max plans, SKU usage, and GST invoices computed
  with real CGST/SGST-vs-IGST split logic.
- **Onboarding** — mocked GSTIN/PAN/UPI verification wizard.

**What's mocked, on purpose:** there's no real database (in-memory data,
seeded from [lib/seed-data.ts](apps/web/lib/seed-data.ts), resets on server
restart), no real auth (the seller "session" is just a localStorage store
picker), and no real payments (checkout and plan changes don't call
Razorpay/Cashfree). Everything else — routing, filtering, CRUD, caching,
cache invalidation, GST math — is real.

## Repo map

| Path | What it is |
|---|---|
| [apps/web](apps/web) | **The running app** — consumer site + Seller Portal (Next.js) |
| [docs/01-product-and-personas.md](docs/01-product-and-personas.md) | Product scope, personas, core user journeys |
| [docs/02-system-architecture.md](docs/02-system-architecture.md) | Target production architecture: microservices/serverless, infra, caching, CDN |
| [docs/03-multi-tenant-storefront.md](docs/03-multi-tenant-storefront.md) | Multi-tenancy model, theme engine, routing strategy |
| [docs/04-monetization-and-billing.md](docs/04-monetization-and-billing.md) | Plans, metering, Indian payment rails, GST invoicing (billing math is implemented; PSP calls are not) |
| [docs/05-onboarding-and-compliance.md](docs/05-onboarding-and-compliance.md) | GSTIN/PAN verification, bank/UPI setup, KYC flow (mocked in the app) |
| [docs/06-api-surface.md](docs/06-api-surface.md) | Target REST API surface for a real backend |
| [database/schema.sql](database/schema.sql) | Full PostgreSQL multi-tenant schema the in-memory data model mirrors |
| [schemas/theme-config.schema.json](schemas/theme-config.schema.json) | Storefront Theme Engine JSON Schema |
| [schemas/theme-config.example.json](schemas/theme-config.example.json) | Example tenant theme payload |
| [services/billing](services/billing) | Reference: real Razorpay webhook listener (not wired into the app) |
| [services/qr](services/qr) | QR standee generation notes |

## Target production stack (docs/02)

The docs describe where this goes in production — a real backend to swap in
under the same API surface `apps/web` already calls:

- **Frontend (B2C storefront + PWA):** Next.js 14 (App Router, SSR + ISR), next-intl for i18n, Workbox for PWA/offline.
- **Backend:** Node.js/NestJS microservices (Catalog, Search, Tenant, Billing, Notification, Media) behind an API Gateway.
- **Data:** PostgreSQL (multi-tenant, row-level tenancy via `store_id`), Redis (cache + session + rate limit), Elasticsearch/OpenSearch (product search & geo queries), S3-compatible object storage + CDN.
- **Search/Geo:** PostGIS or Elasticsearch geo_point for radius search; India PIN code → lat/long reference table.
- **Payments/Billing:** Razorpay (primary) with Cashfree as secondary PSP — UPI AutoPay e-mandates, cards, net banking.
- **Infra:** Kubernetes (`ap-south-1`) or serverless (Lambda + SQS) for event-driven pieces.
- **Observability:** OpenTelemetry, Grafana/Loki/Prometheus.

Start with [docs/02-system-architecture.md](docs/02-system-architecture.md) for the full picture, or just run `apps/web` to see it working today.
