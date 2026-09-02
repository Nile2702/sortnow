# Product Scope & Personas

## 1. Problem statement

India's fashion retail is dominated by lakhs of independent stores and regional
chains that have no affordable way to (a) get discovered online by nearby
shoppers, and (b) run a distinct branded storefront instead of looking like a
generic marketplace listing. Shoppers, meanwhile, want to **discover apparel
near them**, filter/sort by what matters (price, size, occasion, live sale),
and either buy online or walk in.

SORT IT OUT closes this loop: **discover → sort/filter → shop online or in
store → repeat with the same sort saved.**

## 2. Personas

### 2.1 Shopper — "Ritika, 24, Tier-2 city (e.g. Nashik)"
- Uses a budget Android phone on 4G, price-sensitive on data.
- Wants to find "ethnic wear under ₹1500 within 3 km" and see if a store has
  a live sale today.
- Wants her sort/filter ("Sarees, Cotton, ₹500–1500, size M") to persist
  across sessions and stores — "shop in sort" from the ask: revisit the same
  filtered view later instead of re-filtering.
- Prefers Hindi or her regional language; low-bandwidth, PWA installable.

### 2.2 Shopkeeper/Merchant — "Anil, owns 'Urban Vogue' boutique, Bandra Mumbai"
- Has 300–2000 SKUs, updates stock manually or via a helper.
- Wants a storefront that looks like *his* brand, not a template that looks
  identical to every other seller.
- Wants to announce a "Flat 40% off — today only" live sale instantly and put
  a QR code on his shop window/table.
- Not technical — onboarding must work over WhatsApp-level simplicity.

### 2.3 Regional Chain Admin — "Meena, ops lead for a 12-store ethnic wear chain in Chennai"
- Needs bulk catalog upload (CSV/Excel), per-store inventory sync, and
  consolidated GST invoicing across branches.
- Needs role-based access: store managers can edit their own store's stock,
  she sees all 12.

### 2.4 Platform Ops / CTO persona (internal)
- Needs multi-tenant isolation, abuse/fraud controls, GSTIN verification,
  subscription dunning, and India-wide performance (Tier 2/3 network
  conditions).

## 3. Core user journeys

1. **Hyperlocal discovery:** Shopper opens app/PWA → grants location or types
   PIN code → sees stores/products within a radius, filterable by
   category, price, size, live-sale-now.
2. **Sort-and-shop:** Shopper applies filters ("sort") → the *sort state* is
   saved as a reusable **Smart Sort** (named filter set) → shopper can
   re-open "My Sorts" later to re-apply the same filter across whichever
   stores are now nearby/updated.
3. **O2O QR loop:** Shopper scans a physical QR standee in-store → lands on
   that store's live digital catalog with real-time inventory indicators
   ("3 left", "Out of stock") → can reserve/pay online or ask staff.
4. **Seller onboarding:** Merchant signs up → GSTIN/PAN auto-verified →
   bank/UPI linked → picks a plan → uses the no-code Storefront Studio to
   pick a theme, upload banners/logo → bulk-uploads catalog → generates
   QR standees → goes live.
5. **Live sale broadcast:** Merchant toggles "Live Sale" on the portal →
   sets discount rules + end time → storefront shows a live countdown +
   badge; nearby shoppers with matching Smart Sorts get a push/WhatsApp
   notification.

## 4. Non-functional priorities (India-specific)

- **Network:** Assume 3G/4G on Tier 2/3, design for < 150KB initial JS,
  aggressive image compression (AVIF/WebP), skeleton loading, offline PWA
  shell.
- **Language:** English, Hindi, Marathi, Tamil, Telugu, Bengali, Gujarati at
  launch; all customer-facing strings via i18n keys, not hardcoded.
- **Payments:** UPI-first (AutoPay/e-mandate for subscriptions, UPI intent
  for shopper checkout where COD/online purchase is enabled).
- **Compliance:** GST-compliant invoicing (CGST/SGST/IGST by state-of-supply),
  GSTIN/PAN verification for merchant onboarding, data localization
  (customer/financial data stored in India region).
