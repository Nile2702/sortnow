# QR Marketing Hub — QR Standee Generator (service outline)

Generates print-ready QR standees/table-top collateral for the O2O
foot-traffic loop. Triggered from `POST /v1/stores/{store_id}/qr-codes`.

## Flow

1. API creates a `qr_codes` row with `target_url = https://sortitout.in/store/{slug}?src=qr&pos={id}`.
2. A serverless worker (AWS Lambda, triggered off `qr.requested` event):
   - Generates the QR image via a QR library (e.g. `qrcode` npm package) at
     high resolution (600+ DPI equivalent for print), with the store's
     `brand.colors.primary` as the QR foreground color and the logo embedded
     in the center (error-correction level `H` to tolerate the logo overlay).
   - Composites the QR onto one of 3 print templates (A5 standee, table
     tent, shop-window sticker) using the store's theme brand colors/fonts
     pulled from `theme_configurations` — via a headless-Chromium HTML→PDF
     render (Puppeteer) so print templates are just themed HTML, consistent
     with the storefront's own theming approach.
   - Uploads the resulting PNG (`png_url`) and print-ready PDF (`pdf_url`,
     with 3mm bleed) to S3 → CDN.
3. `qr_codes.png_url` / `pdf_url` updated; merchant notified in-portal and
   can download/reorder printing directly from the Seller Portal.

## Attribution

Every scan hits `POST /v1/qr/resolve` before redirecting to the storefront,
logging a `store_analytics_events` row (`event_type = 'qr_scan'`,
`qr_code_id`) so footfall-to-conversion can be attributed per physical QR
placement (e.g. "shop window" vs. "checkout counter") on the merchant's
analytics dashboard.
