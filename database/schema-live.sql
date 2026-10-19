-- =====================================================================
-- SORT NOW — Live PostgreSQL schema (Neon)
--
-- This is the schema actually deployed to the live database backing
-- apps/web. It is generated directly from the TypeScript interfaces and
-- in-memory logic in apps/web/lib/seed-data.ts (not from the older,
-- aspirational database/schema.sql — see the note at the top of that
-- file). Every table, column and enum here corresponds to an exported
-- interface or a Record<id, T> map seed-data.ts used to keep in
-- globalThis-backed arrays/objects before this migration.
--
-- IDs are plain TEXT primary keys, assigned by the application using the
-- same id-generation schemes seed-data.ts already used before this
-- migration (e.g. `store-${slug}-${Date.now().toString(36)}`,
-- `RSV-${...}`, `bill-${...}`) rather than DB-generated UUIDs — several
-- of those ids are shown to end users (e.g. a reservation's "RSV-..." id
-- doubles as its pickup reference) or looked up by exact string from
-- client-held state, so changing the id format/strategy would be a
-- user-visible behavior change, not just a storage swap. pgcrypto is
-- still enabled below for any future use (e.g. if a table migrates to
-- DB-generated ids later).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- Enums — one per TypeScript string-literal union in seed-data.ts.
-- ---------------------------------------------------------------------
-- "pending_review" sits between "draft" and "active": a seller has
-- submitted their GSTIN/PAN/UPI details via onboarding, but the site
-- owner hasn't manually approved the store yet (see
-- lib/seed-data.ts submitStoreForReview/activateStore and
-- app/admin/sellers/page.tsx). Excluded from shopper-facing listings the
-- same as "draft" - see the "active"-only filters in lib/seed-data.ts.
CREATE TYPE store_status AS ENUM ('draft', 'pending_review', 'active', 'suspended', 'closed');
-- "on_hold" is the per-listing counterpart to a store's own "suspended"
-- status (see store_status above) - set by the site owner's product
-- moderation tool (app/admin/products, lib/seed-data.ts holdProduct/
-- unholdProduct) to pull one listing out of shopper-facing search/browse/
-- reservation without suspending the whole seller. Every product starts
-- "live".
CREATE TYPE product_status AS ENUM ('live', 'on_hold');
CREATE TYPE gender AS ENUM ('men', 'women', 'kids');
-- "expired" added via scripts/migrate-reservation-expired-status.js on the
-- live DB - a "pending" reservation past its reservedUntil window is
-- flipped to "expired" the first time anything reads it (write-on-read,
-- see lib/seed-data.ts's flipIfExpired).
CREATE TYPE reservation_status AS ENUM ('pending', 'fulfilled', 'cancelled', 'expired');
-- Note: "expired" (ReservationStatus) is derived at read time from
-- reserved_until, never stored — see effectiveReservationStatus() in
-- lib/seed-data.ts.
CREATE TYPE notification_recipient AS ENUM ('seller', 'shopper');
-- store_approved/store_rejected/store_suspended/store_reinstated/
-- product_held/product_unheld added via scripts/migrate-notification-triggers.js
-- on the live DB - sellers are now notified of their own account/listing
-- status changes (lib/seed-data.ts activateStore/rejectStore/suspendStore/
-- reinstateStore/holdProduct/unholdProduct), not just reservation activity.
CREATE TYPE notification_trigger AS ENUM (
  'reservation_created',
  'reservation_fulfilled',
  'reservation_cancelled',
  'back_in_stock',
  'referral_joined',
  'store_approved',
  'store_rejected',
  'store_suspended',
  'store_reinstated',
  'product_held',
  'product_unheld'
);
CREATE TYPE billing_mode AS ENUM ('gst', 'normal');
CREATE TYPE bill_payment_mode AS ENUM ('cash', 'upi', 'card', 'other');
CREATE TYPE bill_status AS ENUM ('issued', 'void');
CREATE TYPE plan_code AS ENUM ('lite', 'pro', 'max');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due');
CREATE TYPE analytics_event_type AS ENUM ('page_view', 'qr_scan');
-- Added via scripts/migrate-sale-campaigns.js - see sale_campaigns below.
CREATE TYPE sale_discount_type AS ENUM ('percent', 'flat');
CREATE TYPE sale_scope AS ENUM ('all', 'category', 'products');

-- ---------------------------------------------------------------------
-- Stores (lib/seed-data.ts `Store`). seller_password_hash merges in what
-- used to be the separate `sellerCredentials` in-memory map — there has
-- only ever been a 1:1 store->password relationship, so one column here
-- is simpler than a side table for the same thing a real deployment
-- would eventually let a merchant rotate during onboarding.
-- ---------------------------------------------------------------------
CREATE TABLE stores (
    id                      TEXT PRIMARY KEY,
    slug                    TEXT NOT NULL UNIQUE,
    name                    TEXT NOT NULL,
    status                  store_status NOT NULL DEFAULT 'draft',
    category                TEXT NOT NULL,
    city                    TEXT NOT NULL,
    pincode                 TEXT NOT NULL,
    local_market            TEXT NOT NULL,
    latitude                DOUBLE PRECISION NOT NULL,
    longitude               DOUBLE PRECISION NOT NULL,
    live_sale               JSONB,                  -- LiveSale | null
    phone                   TEXT,
    email                   TEXT,                   -- delivery address for seller OTP login (lib/email.ts); not collected at signup
    boosted_until           TIMESTAMPTZ,
    seller_password_hash    TEXT NOT NULL,
    -- Submitted (not verified - no real KYC provider is called, see
    -- app/seller/(dashboard)/onboarding/page.tsx) GSTIN/PAN/UPI details,
    -- plus when they were submitted for the site owner's manual review.
    gstin                   TEXT,
    pan                     TEXT,
    upi_vpa                 TEXT,
    submitted_for_review_at TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- When this store most recently became "active" - set by
    -- activateStore() (first approval) and reinstateStore() (after a
    -- suspension). Shown as "Activated" on app/admin/sellers/active.
    activated_at            TIMESTAMPTZ
);
CREATE INDEX idx_stores_status ON stores (status);
CREATE INDEX idx_stores_phone ON stores (phone) WHERE phone IS NOT NULL;

-- Theme Studio config per store (lib/seed-data.ts `themes` map). Kept as
-- a single JSONB blob, same shape as the in-memory `any`-typed theme
-- record — it's read/written as one object everywhere it's used
-- (updateStoreTheme, getLiveTheme), never queried by a sub-field.
CREATE TABLE themes (
    store_id    TEXT PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
    theme       JSONB NOT NULL
);

-- Per-store category list (lib/seed-data.ts `categories` map). sort_order
-- preserves the original array order (used for nav/category-picker
-- display order), since a plain id/name table has no inherent order.
CREATE TABLE categories (
    id          TEXT PRIMARY KEY,
    store_id    TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    sort_order  INT NOT NULL DEFAULT 0
);
CREATE INDEX idx_categories_store_id ON categories (store_id, sort_order);

-- ---------------------------------------------------------------------
-- Products (lib/seed-data.ts `Product`). store_slug is denormalized
-- (kept in sync with stores.slug at write time) because searchProducts/
-- the storefront already treat it as a plain field on the product, not a
-- joined value.
-- ---------------------------------------------------------------------
CREATE TABLE products (
    id                  TEXT PRIMARY KEY,
    store_id            TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    store_slug          TEXT NOT NULL,
    category_id         TEXT NOT NULL,
    gender              gender NOT NULL,
    sub_category        TEXT NOT NULL,
    title               TEXT NOT NULL,
    description         TEXT,
    fabric              TEXT,
    color               TEXT,
    brand               TEXT,
    color_group_id      TEXT,
    product_code        TEXT,
    base_price          NUMERIC(10,2) NOT NULL,
    compare_at_price    NUMERIC(10,2),
    cost_price          NUMERIC(10,2),             -- never exposed shopper-side (see searchProducts)
    images              JSONB NOT NULL DEFAULT '[]'::jsonb,   -- { url: string }[]
    sizes               TEXT[] NOT NULL DEFAULT '{}',
    -- NULL means "stock isn't tracked for this listing" (unlimited) - the
    -- CHECK only rejects an explicit negative value, never NULL (a CHECK
    -- constraint treats a NULL expression result as satisfied). Added via
    -- scripts/migrate-stock-credit-checks.js as a DB-level backstop behind
    -- createReservation/createBill's own transactional, row-locked
    -- stock-sufficiency recheck (see the comments on both in
    -- lib/seed-data.ts) - belt and suspenders against the TOCTOU race this
    -- column is exposed to from two call sites.
    stock_remaining     INT CHECK (stock_remaining >= 0),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    status              product_status NOT NULL DEFAULT 'live'
);
CREATE INDEX idx_products_store_id ON products (store_id);
CREATE INDEX idx_products_gender_subcategory ON products (gender, sub_category);
CREATE INDEX idx_products_color_group ON products (store_id, color_group_id) WHERE color_group_id IS NOT NULL;
CREATE INDEX idx_products_created_at ON products (created_at DESC);
CREATE INDEX idx_products_status ON products (status);

-- ---------------------------------------------------------------------
-- Sale campaigns (lib/seed-data.ts `SaleCampaign`) - added via
-- scripts/migrate-sale-campaigns.js. A real, scoped discount a seller runs
-- for a window of time, as opposed to stores.live_sale above (a purely
-- cosmetic storefront banner that never touches any product's price).
--
-- Deliberately never writes to products.base_price/compare_at_price - a
-- campaign is applied at read time only (see applyActiveSales() in
-- lib/seed-data.ts, called from the shopper-facing product routes/
-- components, never from the seller's own catalog-editing paths), the same
-- "derive it at read time from a stored window" pattern already used for
-- live_sale and reservation expiry. That keeps a product's stored price
-- always equal to what the seller actually typed, so their own edit form
-- never shows (or risks re-saving) a discounted price as if it were real.
--
-- scope='category' matches on (gender, sub_category) - the pairing actually
-- indexed and used throughout search/filtering - not products.category_id,
-- which isn't a real per-store taxonomy FK (see the comment on products
-- above). scope='products' lists explicit product ids in product_ids.
-- ---------------------------------------------------------------------
CREATE TABLE sale_campaigns (
    id               TEXT PRIMARY KEY,
    store_id         TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name             TEXT NOT NULL,
    discount_type    sale_discount_type NOT NULL,
    discount_value   NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
    scope            sale_scope NOT NULL,
    gender           gender,             -- set when scope = 'category'
    sub_category     TEXT,               -- set when scope = 'category'
    product_ids      TEXT[],             -- set when scope = 'products'
    starts_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    ends_at          TIMESTAMPTZ NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (ends_at > starts_at)
);
CREATE INDEX idx_sale_campaigns_store_active ON sale_campaigns (store_id, starts_at, ends_at);

-- ---------------------------------------------------------------------
-- Reservations (lib/seed-data.ts `Reservation`) — the core "reserve
-- online, pick up in store" flow. store_name/store_slug are snapshotted
-- at creation time, same as in the original in-memory record, so a later
-- store rename never rewrites a reservation already handed to a shopper.
-- ---------------------------------------------------------------------
CREATE TABLE reservations (
    id              TEXT PRIMARY KEY,
    store_id        TEXT NOT NULL REFERENCES stores(id),
    store_name      TEXT NOT NULL,
    store_slug      TEXT NOT NULL,
    items           JSONB NOT NULL,            -- ReservationItem[]
    total           NUMERIC(10,2) NOT NULL,
    shopper_name    TEXT NOT NULL,
    shopper_phone   TEXT NOT NULL,
    status          reservation_status NOT NULL DEFAULT 'pending',
    reserved_until  TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reservations_store_id ON reservations (store_id, created_at DESC);
CREATE INDEX idx_reservations_shopper_phone ON reservations (shopper_phone);

-- ---------------------------------------------------------------------
-- Notifications (lib/seed-data.ts `Notification`) — an SMS/WhatsApp-style
-- delivery log. store_id is NOT a foreign key: the referral_joined
-- trigger fires with the literal sentinel "platform" (not a real store),
-- same as in the original in-memory code.
-- ---------------------------------------------------------------------
CREATE TABLE notifications (
    id          TEXT PRIMARY KEY,
    store_id    TEXT NOT NULL,
    recipient   notification_recipient NOT NULL,
    phone       TEXT NOT NULL,
    trigger     notification_trigger NOT NULL,
    message     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_store_id ON notifications (store_id, created_at DESC);

-- Back-in-stock waitlist (lib/seed-data.ts `WaitlistEntry`).
CREATE TABLE waitlist_entries (
    id              TEXT PRIMARY KEY,
    product_id      TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    store_id        TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    shopper_name    TEXT NOT NULL,
    shopper_phone   TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_waitlist_product_id ON waitlist_entries (product_id);

-- ---------------------------------------------------------------------
-- Shoppers (lib/seed-data.ts `Shopper`).
-- ---------------------------------------------------------------------
CREATE TABLE shoppers (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    phone               TEXT NOT NULL UNIQUE,
    email               TEXT,
    preferred_category  gender,
    pincode             TEXT,
    city                TEXT,
    date_of_birth       DATE,
    marketing_opt_in    BOOLEAN NOT NULL DEFAULT FALSE,
    password_hash       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    referral_code       TEXT UNIQUE,
    referred_by         TEXT REFERENCES shoppers(id)
);
CREATE INDEX idx_shoppers_referred_by ON shoppers (referred_by) WHERE referred_by IS NOT NULL;

-- ---------------------------------------------------------------------
-- In-store billing (lib/seed-data.ts `BillingSettings`, `Bill`).
-- ---------------------------------------------------------------------
CREATE TABLE billing_settings (
    store_id              TEXT PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
    mode                  billing_mode NOT NULL DEFAULT 'normal',
    gstin                 TEXT,
    tax_rate_percent      NUMERIC(5,2) NOT NULL DEFAULT 5,
    next_invoice_number   INT NOT NULL DEFAULT 1,
    invoice_note          TEXT
);

CREATE TABLE bills (
    id                  TEXT PRIMARY KEY,
    invoice_number      TEXT NOT NULL,
    store_id            TEXT NOT NULL REFERENCES stores(id),
    store_name          TEXT NOT NULL,          -- snapshotted at issue time
    store_address       TEXT,
    invoice_note        TEXT,
    mode                billing_mode NOT NULL,
    gstin               TEXT,
    tax_rate_percent    NUMERIC(5,2) NOT NULL,
    items               JSONB NOT NULL,         -- BillItem[]
    subtotal            NUMERIC(10,2) NOT NULL,
    discount_percent    NUMERIC(5,2),
    discount_amount     NUMERIC(10,2),
    cgst                NUMERIC(10,2) NOT NULL,
    sgst                NUMERIC(10,2) NOT NULL,
    grand_total         NUMERIC(10,2) NOT NULL,
    total_quantity      INT NOT NULL,
    payment_mode        bill_payment_mode NOT NULL,
    customer_name       TEXT,
    customer_phone      TEXT,
    status              bill_status NOT NULL DEFAULT 'issued',
    void_reason         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bills_store_id ON bills (store_id, created_at DESC);
CREATE INDEX idx_bills_status ON bills (store_id, status);

-- ---------------------------------------------------------------------
-- Billing: plans/subscriptions (lib/seed-data.ts `Subscription`). PLANS
-- itself stays a static TS constant (never queried by a shopper/seller
-- id), so there's no `plans` table — only the per-store subscription
-- state that actually varies.
-- ---------------------------------------------------------------------
CREATE TABLE subscriptions (
    store_id              TEXT PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
    plan_code             plan_code NOT NULL DEFAULT 'lite',
    status                subscription_status NOT NULL DEFAULT 'active',
    current_period_end    TIMESTAMPTZ NOT NULL
);

-- Store Boost and AI photo credits are both already columns/tables of
-- their own (stores.boosted_until; photo_credits below) — BOOST_PACKAGES
-- and PHOTO_CREDIT_PACKAGES remain static TS constants, same reasoning
-- as PLANS above.
CREATE TABLE photo_credits (
    store_id    TEXT PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
    -- CHECK added via scripts/migrate-stock-credit-checks.js, same backstop
    -- reasoning as products.stock_remaining above - spendPhotoCredit is now
    -- a single atomic UPDATE ... WHERE credits >= 1 (lib/seed-data.ts), so
    -- this should never actually be reached, but a DB-level guard costs
    -- nothing and catches any future logic bug directly.
    credits     INT NOT NULL DEFAULT 3 CHECK (credits >= 0)
);

-- ---------------------------------------------------------------------
-- Analytics (lib/seed-data.ts `AnalyticsEvent`). No app-assigned id
-- existed on this record (it was just pushed into an array), so a plain
-- serial surrogate key is used here.
-- ---------------------------------------------------------------------
CREATE TABLE analytics_events (
    id              BIGSERIAL PRIMARY KEY,
    store_id        TEXT NOT NULL,
    event_type      analytics_event_type NOT NULL,
    qr_position     TEXT,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_analytics_store_date ON analytics_events (store_id, occurred_at DESC);

-- ---------------------------------------------------------------------
-- Reviews (lib/seed-data.ts `Review`, `StoreReview`).
-- ---------------------------------------------------------------------
CREATE TABLE reviews (
    id                  TEXT PRIMARY KEY,
    product_id          TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    author_name         TEXT NOT NULL,
    rating              SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title               TEXT,
    comment             TEXT NOT NULL,
    verified_purchase   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_product_id ON reviews (product_id);

CREATE TABLE store_reviews (
    id              TEXT PRIMARY KEY,
    store_id        TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    author_name     TEXT NOT NULL,
    rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_store_reviews_store_id ON store_reviews (store_id);

-- GstInvoice (lib/seed-data.ts `GstInvoice`) is intentionally NOT a table
-- — computeGstInvoice()/getInvoicesForStore() compute it on the fly from
-- `subscriptions` + a hardcoded per-store state-code map, exactly as the
-- in-memory version did; nothing ever persisted an invoice row.
