# Merchant Onboarding & Compliance (India-specific)

## 1. Onboarding flow

```
1. Phone number + OTP (MSG91/Twilio Verify) → basic account created
2. Business details: legal name, business type (proprietorship/partnership/
   pvt ltd), GSTIN (optional for turnover < ₹40L threshold — see §2)
3. GSTIN verification (if provided) → auto-fills legal name, registered
   address, state code — merchant just confirms
4. PAN validation (mandatory) → verifies name match against GSTIN (if given)
5. Bank account or UPI VPA for payouts → penny-drop verification
6. Store profile: category (ethnic/western/mixed), city, PIN code(s) served
7. Plan selection → PSP checkout for subscription mandate
8. Storefront Studio (theme pick) → Catalog upload (manual or bulk CSV) →
   Go live
```

Each step is resumable (`merchant_onboarding_status` table) since a
non-technical shopkeeper is unlikely to complete this in one sitting.

## 2. GSTIN verification

- Call a GST verification API (NSDL/Karza/Signzy or similar KYC-as-a-service
  provider — do **not** call the GSTN government portal directly at scale;
  these providers are the standard integration pattern) with the entered
  GSTIN.
- Response validates: GSTIN format (15-char: 2-digit state code + 10-char
  PAN + entity code + check digit), registration status (`Active`), legal
  name, principal place of business, registration date.
- **GSTIN is optional** for merchants under the GST registration threshold
  (₹40L turnover for goods in most states, ₹20L in special category
  states) — SORT IT OUT still onboards unregistered small merchants but:
  - They cannot enable a "Tax invoice" checkout mode (only informal receipt).
  - Platform's own subscription invoice to them still carries platform's
    GST (B2C invoice, no ITC claim possible for them) — this only affects
    the **platform's** invoice to the merchant, not the merchant's own
    sales.

## 3. PAN validation

- PAN format regex (`[A-Z]{5}[0-9]{4}[A-Z]{1}`) as a first-pass client
  check, then server-side verification via the same KYC provider (or
  NSDL PAN verification API) confirming PAN is active and (where GSTIN was
  provided) that PAN embedded in the GSTIN matches the standalone PAN
  submitted — catches typos/fraud early.

## 4. Bank/UPI payout setup

- Merchant provides either a bank account (IFSC + account number) or a UPI
  VPA for receiving payouts (subscription is a *charge to* the merchant;
  this bank/UPI is for the *separate* case where SORT IT OUT facilitates
  online order payments and needs to settle funds to the merchant).
- **Penny-drop verification**: platform initiates a ₹1 transfer via the PSP's
  payout API; success confirms account holder name (fuzzy-matched against
  the business/owner legal name) and that the account is active, before
  it's marked `verified` in `merchant_payout_accounts`.
- Routed through the PSP's payout/vendor-payment product (Razorpau
  RazorpayX or Cashfree Payouts) rather than a custom banking integration.

## 5. Data localization & retention

- All PII, financial, and transaction data stored in India region
  (`ap-south-1` Mumbai) per RBI/MeitY data localization expectations for
  payment-related data.
- KYC documents (PAN/GSTIN images if collected) stored encrypted at rest
  (S3 SSE-KMS), access-logged, retained per the applicable data retention
  policy and purged on account closure after the statutory/contractual
  retention window.
