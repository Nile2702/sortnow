# SORT IT OUT — Pan-India O2O Fashion Discovery & Multi-Tenant Commerce Platform

"Sort it, find it, shop it near you."

SORT IT OUT is a multi-tenant Online-to-Offline (O2O) platform that lets every
independent boutique, regional chain, and ethnic/Western retailer in India run a
fully custom-branded digital storefront, while shoppers discover apparel near
them by PIN code / geolocation, filter ("sort") by what they want, and either
buy online or walk into the physical store already knowing what's in stock.

## Repo map

| Path | What it is |
|---|---|
| [docs/01-product-and-personas.md](docs/01-product-and-personas.md) | Product scope, personas, core user journeys |
| [docs/02-system-architecture.md](docs/02-system-architecture.md) | Microservices/serverless architecture, infra, caching, CDN |
| [docs/03-multi-tenant-storefront.md](docs/03-multi-tenant-storefront.md) | Multi-tenancy model, theme engine, routing strategy |
| [docs/04-monetization-and-billing.md](docs/04-monetization-and-billing.md) | Plans, metering, Indian payment rails, GST invoicing |
| [docs/05-onboarding-and-compliance.md](docs/05-onboarding-and-compliance.md) | GSTIN/PAN verification, bank/UPI setup, KYC flow |
| [docs/06-api-surface.md](docs/06-api-surface.md) | Key REST/GraphQL endpoints per module |
| [database/schema.sql](database/schema.sql) | Full PostgreSQL multi-tenant schema |
| [schemas/theme-config.schema.json](schemas/theme-config.schema.json) | Storefront Theme Engine JSON Schema |
| [schemas/theme-config.example.json](schemas/theme-config.example.json) | Example tenant theme payload |
| [apps/web](apps/web) | Next.js dynamic storefront renderer (sample) |
| [services/billing](services/billing) | Subscription webhook listener (sample, Razorpay-shaped) |
| [services/qr](services/qr) | QR standee generation service (sample) |

## Tech stack at a glance

- **Frontend (B2C storefront + PWA):** Next.js 14 (App Router, SSR + ISR), Tailwind CSS with CSS variables for theming, next-intl for i18n, Workbox for PWA/offline.
- **Seller Portal (B2B):** Next.js (separate app, `portal.sortitout.in`), React Query, no-code theme studio.
- **Backend:** Node.js/NestJS microservices (Catalog, Search, Tenant, Billing, Notification, Media) behind an API Gateway; Python for image pipeline workers.
- **Data:** PostgreSQL (multi-tenant, row-level tenancy via `store_id`), Redis (cache + session + rate limit), Elasticsearch/OpenSearch (product search & geo queries), S3-compatible object storage + CDN (Cloudflare/Akamai India POPs or AWS CloudFront with Mumbai/Chennai edge).
- **Search/Geo:** PostGIS or Elasticsearch geo_point for radius search; India PIN code → lat/long reference table.
- **Payments/Billing:** Razorpay (primary) with Cashfree as secondary PSP — UPI AutoPay e-mandates, cards, net banking.
- **Infra:** Kubernetes (EKS/AKS in `ap-south-1`/Central India) or serverless (AWS Lambda + SQS) for event-driven pieces (image processing, invoice generation, webhook handling).
- **Observability:** OpenTelemetry, Grafana/Loki/Prometheus.

Start with [docs/02-system-architecture.md](docs/02-system-architecture.md) for the full picture.
