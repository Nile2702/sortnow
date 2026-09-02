# System Architecture

## 1. High-level topology

```
                                   ┌─────────────────────────┐
                                   │   CDN (India edge POPs)  │
                                   │  Cloudflare / CloudFront │
                                   └────────────┬─────────────┘
                                                │ static assets, images, ISR pages
                    ┌───────────────────────────┼───────────────────────────┐
                    │                            │                           │
          ┌─────────▼─────────┐        ┌─────────▼─────────┐       ┌─────────▼─────────┐
          │  Consumer Web/PWA  │        │  Seller Portal Web │       │   Admin Console    │
          │  Next.js (SSR/ISR) │        │  Next.js (SPA/SSR) │       │   Next.js (SPA)    │
          │  sortitout.in      │        │  portal.sortitout.in│      │  ops.sortitout.in  │
          └─────────┬─────────┘        └─────────┬─────────┘       └─────────┬─────────┘
                    │                            │                           │
                    └───────────────┬────────────┴─────────────┬────────────┘
                                     │                          │
                             ┌───────▼──────────────────────────▼───────┐
                             │        API Gateway (Kong / AWS APIGW)     │
                             │  authN (JWT/OAuth), rate limit, routing   │
                             └───────┬───────────┬──────────┬───────────┘
             ┌───────────────────────┼───────────┼──────────┼──────────────────────────┐
             │                       │           │          │                          │
      ┌──────▼──────┐        ┌───────▼──────┐ ┌──▼───────┐ ┌▼────────────┐   ┌─────────▼────────┐
      │ Tenant/Store │        │  Catalog &   │ │  Search  │ │  Billing &   │   │  Notification    │
      │  Service     │        │  Inventory   │ │ & Geo    │ │  Subscription│   │  Service (Push/  │
      │ (theme cfg,  │        │  Service     │ │ Service  │ │  Service     │   │  SMS/WhatsApp/    │
      │  onboarding) │        │              │ │(ES/Postgis)│ (Razorpay/  │   │  Email)          │
      └──────┬──────┘        └───────┬──────┘ └──┬───────┘ │  Cashfree)   │   └─────────┬────────┘
             │                       │           │         └──────┬───────┘             │
             │                       │           │                │                     │
      ┌──────▼───────────────────────▼───────────▼────────────────▼─────────────────────▼───────┐
      │                          Event Bus (Kafka / AWS SNS+SQS)                                  │
      │   store.created, product.updated, sale.started, subscription.renewed, invoice.generated   │
      └──────┬───────────────────────┬───────────┬────────────────┬─────────────────────┬────────┘
             │                       │           │                │                     │
      ┌──────▼──────┐        ┌───────▼──────┐ ┌──▼─────────┐ ┌────▼─────────┐   ┌────────▼───────┐
      │ Media/Image  │        │  Bulk Import │ │  Invoice   │ │  QR Standee   │   │  Analytics/     │
      │ Pipeline     │        │  Worker      │ │  Generator │ │  Generator    │   │  Recommendation │
      │ (compress,   │        │ (CSV/Excel   │ │ (GST PDF)  │ │  Service      │   │  Worker         │
      │  resize,     │        │  → SKU rows) │ │            │ │               │   │                 │
      │  CDN upload) │        └──────────────┘ └────────────┘ └───────────────┘   └────────────────┘
      └──────────────┘

      Data layer: PostgreSQL (primary, multi-tenant) · Redis (cache/session/rate-limit) ·
                  Elasticsearch/OpenSearch (search + geo) · S3-compatible object store (media)
```

## 2. Why microservices + event bus (not a monolith)

- **Independent scaling:** Search/Geo and Media Pipeline see very different
  load profiles than Billing. Catalog writes spike during bulk CSV imports.
- **India-specific failure isolation:** Payment gateway flakiness (common
  with UPI AutoPay at scale) must not take down product browsing.
- **Team ownership boundary:** Seller Portal team owns Catalog+Onboarding;
  Consumer team owns Search+Storefront Renderer; a small platform team owns
  Billing+Compliance — services map to these boundaries.

Each service is a NestJS (Node/TypeScript) app with its own schema/tables
(logical separation inside one PostgreSQL cluster to start — see §4), and
publishes domain events to Kafka/SNS so other services react without tight
coupling (e.g., Notification service reacts to `sale.started` without
Catalog knowing Notification exists).

## 3. Caching layer (Redis)

| Cache | Key shape | TTL | Purpose |
|---|---|---|---|
| Theme config | `theme:{store_id}` | 10 min, invalidated on save | Storefront Renderer avoids DB hit per request |
| PIN code geo lookup | `pin:{pincode}` | 30 days | PIN → lat/long is near-static |
| Nearby store search | `geo:{pincode}:{radius}:{category_hash}` | 60 sec | Absorbs discovery-page traffic bursts |
| Session/cart | `cart:{session_id}` | 24 hr | Guest cart before login |
| Rate limit buckets | `rl:{ip or tenant}:{route}` | sliding window | Abuse protection on public APIs |
| Live sale flags | `sale:live:{store_id}` | until sale end | Fast badge/countdown rendering without DB round-trip |

## 4. Multi-tenant data strategy

**Pooled multi-tenancy with row-level `store_id` scoping** (not
schema-per-tenant, not database-per-tenant) — chosen because:
- Expected long-tail of tenants (thousands of boutiques with 100–2,000 SKUs)
  makes per-tenant schemas an operational nightmare at that scale.
- A handful of large chains (25,000+ SKUs) are the exception, not the norm —
  handled by partitioning `products`/`inventory` tables by `store_id` hash
  or range, not by giving them a separate database.
- Postgres **Row-Level Security (RLS)** policies enforce `store_id` isolation
  at the DB layer as a defense-in-depth measure, in addition to application-
  layer tenant scoping in every query (see `database/schema.sql`).

For very large chains, a `partition_key` (hash of `store_id`) is used to
range/hash-partition `products`, `product_variants`, and `inventory_ledger`
tables so one whale tenant's 25k SKUs don't degrade query plans for everyone
else.

## 5. Media & CDN

- Uploaded images go to S3 (or S3-compatible) → an async worker (Sharp/
  libvips) generates AVIF/WebP + 3 responsive sizes (thumb/grid/full) →
  written back to a `cdn/` prefix → CDN (Cloudflare, India POPs: Mumbai,
  Chennai, Delhi, Bengaluru, Kolkata) fronts all of it.
- Consumer app requests `srcset` with AVIF-first, WebP fallback, JPEG last
  resort for old Android WebViews common on budget phones.

## 6. Search & geo

- **Elasticsearch/OpenSearch** index `products_index` with a `geo_point`
  field taken from the parent store's coordinates (denormalized at index
  time) + category/price/size/color facets + a `live_sale` boolean/boost.
- Radius queries (`geo_distance` filter, 1–25 km) combine with the shopper's
  Smart Sort filters as an ES bool query; fallback to Postgres+PostGIS
  `ST_DWithin` for stores with search index lag (rare, only during reindex).
- PIN code → lat/long resolved from the `pin_codes` reference table (loaded
  from India Post's official PIN code dataset), so a shopper can search by
  PIN even without granting geolocation.

## 7. Deployment

- Kubernetes cluster in AWS `ap-south-1` (Mumbai) as primary region, with a
  DR region in `ap-south-2` (Hyderabad) or GCP `asia-south1`.
- Event-driven, bursty workloads (image processing, invoice PDF generation,
  bulk CSV import, QR generation) run as serverless functions (AWS Lambda)
  triggered off the event bus/SQS, not always-on pods — cost-efficient given
  the long tail of small merchants with infrequent bulk operations.
- Blue/green or canary deploys for the Storefront Renderer (customer-facing,
  highest blast radius if broken).
