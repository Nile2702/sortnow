# Key API Surface (representative, not exhaustive)

All routes sit behind the API Gateway at `api.sortitout.in`. AuthN via JWT
(shopper) or OAuth2 client-credentials + session (merchant/admin). Every
merchant/admin route is additionally scoped by `store_id` derived from the
authenticated session — never accepted as a trusted client-supplied field.

## Consumer (B2C)

| Method | Route | Purpose |
|---|---|---|
| GET | `/v1/discover?pincode=400050&radius=5&category=ethnic` | Nearby stores/products |
| GET | `/v1/discover?lat=..&lng=..&radius=10` | Geolocation-based discovery |
| GET | `/v1/stores/{slug}` | Store profile + theme + live sale status |
| GET | `/v1/stores/{slug}/products?sort=price_asc&size=M&color=red` | Store catalog with sort/filter |
| POST | `/v1/sorts` | Save a "Smart Sort" (named filter set) |
| GET | `/v1/sorts` | List shopper's saved Smart Sorts |
| POST | `/v1/sorts/{id}/apply` | Re-apply a saved Smart Sort against current nearby stores |
| GET | `/v1/pincodes/{pincode}` | Resolve PIN → lat/long, city, serviceable stores count |
| POST | `/v1/qr/resolve` | Resolve scanned QR payload → store + in-store catalog view |

## Seller Portal (B2B)

| Method | Route | Purpose |
|---|---|---|
| POST | `/v1/merchants/onboarding/gstin-verify` | Verify GSTIN, prefill business details |
| POST | `/v1/merchants/onboarding/pan-verify` | Verify PAN |
| POST | `/v1/merchants/onboarding/bank-account` | Add + penny-drop verify payout account |
| GET/PUT | `/v1/stores/{store_id}/theme` (draft) | Read/update draft theme config (Theme Studio) |
| POST | `/v1/stores/{store_id}/theme/publish` | Promote draft → live, bust cache |
| POST | `/v1/stores/{store_id}/products/bulk-import` | Upload CSV/Excel, returns job id |
| GET | `/v1/stores/{store_id}/products/bulk-import/{job_id}` | Poll import job status/errors |
| POST | `/v1/stores/{store_id}/products` | Create single product + variants |
| PATCH | `/v1/stores/{store_id}/inventory` | Adjust stock (per variant) |
| POST | `/v1/stores/{store_id}/live-sale` | Start a live sale (rules + end time) |
| DELETE | `/v1/stores/{store_id}/live-sale` | End live sale early |
| POST | `/v1/stores/{store_id}/qr-codes` | Generate a new QR standee (returns print-ready PDF/PNG) |
| GET | `/v1/stores/{store_id}/analytics` | Footfall (QR scans), online views, conversion |

## Billing

| Method | Route | Purpose |
|---|---|---|
| POST | `/v1/billing/subscriptions` | Create subscription (redirects to PSP checkout) |
| GET | `/v1/billing/subscriptions/current` | Current plan, status, next charge date |
| POST | `/v1/billing/subscriptions/cancel` | Cancel at period end |
| GET | `/v1/billing/invoices` | List GST invoices (with PDF links) |
| POST | `/webhooks/razorpay` | PSP webhook receiver (signature-verified) |
| POST | `/webhooks/cashfree` | Secondary PSP webhook receiver |

## Admin/Ops

| Method | Route | Purpose |
|---|---|---|
| GET | `/v1/admin/merchants?status=past_due` | Ops dunning queue |
| POST | `/v1/admin/merchants/{id}/suspend` | Manual override suspend |
| GET | `/v1/admin/tenants/{id}/audit-log` | Full audit trail for a tenant |
