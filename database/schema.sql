-- =====================================================================
-- SORT IT OUT — Multi-Tenant PostgreSQL Schema
-- Region: ap-south-1 (Mumbai). Extensions: pgcrypto, postgis (optional
-- fallback geo), citext (case-insensitive slugs/emails).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
-- CREATE EXTENSION IF NOT EXISTS postgis; -- enable if using PostGIS instead of/alongside ES geo

-- ---------------------------------------------------------------------
-- Reference: India PIN codes / geo
-- ---------------------------------------------------------------------
CREATE TABLE pin_codes (
    pincode         CHAR(6) PRIMARY KEY,
    city            VARCHAR(100) NOT NULL,
    district        VARCHAR(100),
    state           VARCHAR(100) NOT NULL,
    state_code      CHAR(2) NOT NULL,           -- GST state code, e.g. '27' = Maharashtra
    latitude        NUMERIC(9,6) NOT NULL,
    longitude       NUMERIC(9,6) NOT NULL,
    is_metro        BOOLEAN NOT NULL DEFAULT FALSE,
    tier            SMALLINT NOT NULL DEFAULT 3 CHECK (tier IN (1,2,3))
);
CREATE INDEX idx_pin_codes_geo ON pin_codes (latitude, longitude);

-- Named local markets within a city, e.g. "Commercial Street, Bengaluru"
CREATE TABLE local_markets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150) NOT NULL,       -- 'Commercial Street'
    city            VARCHAR(100) NOT NULL,       -- 'Bengaluru'
    pincode         CHAR(6) REFERENCES pin_codes(pincode),
    latitude        NUMERIC(9,6) NOT NULL,
    longitude       NUMERIC(9,6) NOT NULL
);

-- ---------------------------------------------------------------------
-- Tenants / Stores
-- ---------------------------------------------------------------------
CREATE TYPE store_category AS ENUM ('ethnic', 'western', 'mixed', 'footwear', 'accessories', 'kidswear');
CREATE TYPE store_status   AS ENUM ('draft', 'active', 'suspended', 'closed');

CREATE TABLE merchants (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number        VARCHAR(15) NOT NULL UNIQUE,
    email               CITEXT UNIQUE,
    legal_name          VARCHAR(255),
    business_type       VARCHAR(50),             -- proprietorship / partnership / pvt_ltd / llp
    pan_number          CHAR(10),
    pan_verified_at     TIMESTAMPTZ,
    gstin               CHAR(15),
    gstin_verified_at   TIMESTAMPTZ,
    gstin_state_code    CHAR(2),                 -- derived from GSTIN first 2 digits
    onboarding_step     VARCHAR(50) NOT NULL DEFAULT 'phone_verified',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE merchant_payout_accounts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id         UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    account_type        VARCHAR(10) NOT NULL CHECK (account_type IN ('bank','upi')),
    ifsc                CHAR(11),
    account_number_enc  BYTEA,                   -- encrypted at application layer (KMS envelope)
    upi_vpa             VARCHAR(100),
    account_holder_name VARCHAR(255),
    penny_drop_status   VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending/verified/failed
    verified_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE stores (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id         UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    parent_store_id     UUID REFERENCES stores(id),   -- for chain branches under one merchant
    slug                CITEXT NOT NULL UNIQUE,       -- 'urban-vogue'
    custom_domain       VARCHAR(255) UNIQUE,          -- 'www.urbanvogue.com' (Max tier)
    domain_verified_at  TIMESTAMPTZ,
    name                VARCHAR(255) NOT NULL,
    category            store_category NOT NULL DEFAULT 'mixed',
    status              store_status NOT NULL DEFAULT 'draft',
    pincode             CHAR(6) REFERENCES pin_codes(pincode),
    local_market_id     UUID REFERENCES local_markets(id),
    latitude            NUMERIC(9,6),
    longitude           NUMERIC(9,6),
    address_line        TEXT,
    default_locale      VARCHAR(10) NOT NULL DEFAULT 'en',
    supported_locales   VARCHAR(10)[] NOT NULL DEFAULT ARRAY['en'],
    partition_key       SMALLINT NOT NULL DEFAULT 0, -- hash(store_id) % N, for large-tenant partitioning
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stores_geo ON stores (latitude, longitude);
CREATE INDEX idx_stores_pincode ON stores (pincode);
CREATE INDEX idx_stores_merchant ON stores (merchant_id);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_tenant_isolation ON stores
    USING (id = current_setting('app.current_store_id', true)::uuid
           OR current_setting('app.role', true) = 'admin');

-- ---------------------------------------------------------------------
-- Theme Configurations (Storefront Theme Engine)
-- ---------------------------------------------------------------------
CREATE TYPE theme_status AS ENUM ('draft', 'live', 'archived');

CREATE TABLE theme_configurations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id            UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    version             INTEGER NOT NULL,
    status              theme_status NOT NULL DEFAULT 'draft',
    config              JSONB NOT NULL,          -- validated against schemas/theme-config.schema.json
    created_by          UUID REFERENCES merchants(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at        TIMESTAMPTZ,
    UNIQUE (store_id, version)
);
CREATE INDEX idx_theme_store_status ON theme_configurations (store_id, status);
-- Only one 'live' theme per store — enforced at application layer on publish
-- (archive previous live row inside the same transaction).

-- ---------------------------------------------------------------------
-- Catalog: Products / Variants / Inventory
-- ---------------------------------------------------------------------
CREATE TABLE product_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name        VARCHAR(150) NOT NULL,
    parent_id   UUID REFERENCES product_categories(id),
    sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES product_categories(id),
    sku_prefix      VARCHAR(50) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    fabric          VARCHAR(100),
    base_price      NUMERIC(10,2) NOT NULL,
    compare_at_price NUMERIC(10,2),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    billing_metered BOOLEAN NOT NULL DEFAULT FALSE,  -- true if published beyond plan SKU cap
    images          JSONB NOT NULL DEFAULT '[]',     -- [{url, alt, sort_order}]
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY HASH (store_id);
-- Create N partitions to spread whale tenants (25k+ SKU chains) across shards:
-- CREATE TABLE products_p0 PARTITION OF products FOR VALUES WITH (MODULUS 8, REMAINDER 0);
-- ... p1..p7

CREATE INDEX idx_products_store_active ON products (store_id, is_active);

CREATE TABLE product_translations (
    product_id      UUID NOT NULL,
    store_id        UUID NOT NULL,
    locale          VARCHAR(10) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    PRIMARY KEY (product_id, locale)
);

CREATE TABLE product_variants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID NOT NULL,
    store_id        UUID NOT NULL,
    sku             VARCHAR(80) NOT NULL,
    size            VARCHAR(20),                 -- S/M/L/XL or numeric
    color           VARCHAR(50),
    price_override  NUMERIC(10,2),
    barcode         VARCHAR(50),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (store_id, sku)
) PARTITION BY HASH (store_id);

CREATE TABLE inventory_ledger (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id      UUID NOT NULL,
    store_id        UUID NOT NULL,
    quantity_change INTEGER NOT NULL,             -- +ve stock-in, -ve sale/adjustment
    reason          VARCHAR(30) NOT NULL,         -- 'bulk_import','sale','manual_adjust','return'
    resulting_qty   INTEGER NOT NULL,
    source          VARCHAR(20) NOT NULL DEFAULT 'portal', -- portal/pos/api
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY HASH (store_id);
CREATE INDEX idx_inventory_variant ON inventory_ledger (variant_id, created_at DESC);

CREATE TABLE bulk_import_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    file_url        TEXT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'queued', -- queued/processing/completed/failed
    total_rows      INTEGER,
    success_rows    INTEGER,
    error_rows      INTEGER,
    error_report_url TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ
);

-- ---------------------------------------------------------------------
-- Live Sales
-- ---------------------------------------------------------------------
CREATE TABLE live_sales (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    title           VARCHAR(150) NOT NULL,          -- 'Flat 40% Off'
    discount_type   VARCHAR(10) NOT NULL CHECK (discount_type IN ('percent','flat')),
    discount_value  NUMERIC(10,2) NOT NULL,
    category_id     UUID REFERENCES product_categories(id), -- null = storewide
    starts_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    ends_at         TIMESTAMPTZ NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_live_sales_active ON live_sales (store_id, is_active, ends_at);

-- ---------------------------------------------------------------------
-- QR Codes
-- ---------------------------------------------------------------------
CREATE TABLE qr_codes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    label           VARCHAR(100),                  -- 'Shop Window', 'Table 3'
    target_url      TEXT NOT NULL,
    png_url         TEXT,
    pdf_url         TEXT,                          -- print-ready standee
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE store_analytics_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL,
    event_type      VARCHAR(30) NOT NULL,          -- 'qr_scan','page_view','add_to_cart'
    qr_code_id      UUID REFERENCES qr_codes(id),
    session_id      VARCHAR(100),
    metadata        JSONB NOT NULL DEFAULT '{}',
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY RANGE (occurred_at);   -- monthly partitions, high-volume append-only

-- ---------------------------------------------------------------------
-- Shopper Smart Sorts (saved filters — the "sort and shop in sort" feature)
-- ---------------------------------------------------------------------
CREATE TABLE shoppers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number    VARCHAR(15) UNIQUE,
    preferred_locale VARCHAR(10) NOT NULL DEFAULT 'en',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE smart_sorts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shopper_id      UUID NOT NULL REFERENCES shoppers(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,          -- 'Cotton sarees under 1500 near home'
    filters         JSONB NOT NULL,                 -- {category, price_min, price_max, size, color, pincode, radius_km, sort_by}
    notify_on_live_sale BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Plans / Subscriptions / Billing
-- ---------------------------------------------------------------------
CREATE TABLE plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(20) NOT NULL UNIQUE,     -- 'lite','pro','max'
    name            VARCHAR(50) NOT NULL,
    sku_limit       INTEGER NOT NULL,
    monthly_price   NUMERIC(10,2) NOT NULL,
    annual_price    NUMERIC(10,2) NOT NULL,
    overage_price_per_sku NUMERIC(6,2) NOT NULL DEFAULT 2.00,
    hsn_sac_code    VARCHAR(10) NOT NULL DEFAULT '998319',
    features        JSONB NOT NULL DEFAULT '{}'
);

CREATE TYPE subscription_status AS ENUM ('trialing','active','past_due','suspended','cancelled');

CREATE TABLE subscriptions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id            UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    plan_id             UUID NOT NULL REFERENCES plans(id),
    psp                 VARCHAR(20) NOT NULL,        -- 'razorpay' / 'cashfree'
    psp_subscription_id VARCHAR(100) NOT NULL,
    billing_cycle       VARCHAR(10) NOT NULL DEFAULT 'monthly', -- monthly/annual
    status              subscription_status NOT NULL DEFAULT 'trialing',
    current_period_start TIMESTAMPTZ,
    current_period_end   TIMESTAMPTZ,
    grace_period_ends_at  TIMESTAMPTZ,
    cancel_at_period_end  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (psp, psp_subscription_id)
);
CREATE INDEX idx_subscriptions_store ON subscriptions (store_id);
CREATE INDEX idx_subscriptions_status ON subscriptions (status);

CREATE TABLE usage_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    metered_sku_days INTEGER NOT NULL DEFAULT 0,
    charged         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE webhook_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    psp             VARCHAR(20) NOT NULL,
    psp_event_id    VARCHAR(150) NOT NULL,
    event_type      VARCHAR(80) NOT NULL,
    payload         JSONB NOT NULL,
    processed_at    TIMESTAMPTZ,
    received_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (psp, psp_event_id)              -- idempotency guard against PSP retries
);

CREATE TABLE gst_invoices (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id     UUID NOT NULL REFERENCES subscriptions(id),
    store_id            UUID NOT NULL REFERENCES stores(id),
    invoice_number      VARCHAR(30) NOT NULL UNIQUE,   -- sequential, statutory format
    taxable_value       NUMERIC(10,2) NOT NULL,
    place_of_supply_state_code CHAR(2) NOT NULL,
    platform_state_code CHAR(2) NOT NULL,
    cgst_rate           NUMERIC(4,2) NOT NULL DEFAULT 0,
    cgst_amount         NUMERIC(10,2) NOT NULL DEFAULT 0,
    sgst_rate           NUMERIC(4,2) NOT NULL DEFAULT 0,
    sgst_amount         NUMERIC(10,2) NOT NULL DEFAULT 0,
    igst_rate           NUMERIC(4,2) NOT NULL DEFAULT 0,
    igst_amount         NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_amount        NUMERIC(10,2) NOT NULL,
    hsn_sac_code        VARCHAR(10) NOT NULL,
    pdf_url             TEXT,
    issued_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- Helper: derive CGST/SGST vs IGST given merchant state code and platform
-- state code (called from Billing Service before inserting gst_invoices)
-- =====================================================================
CREATE OR REPLACE FUNCTION fn_compute_gst_split(
    p_taxable_value NUMERIC, p_rate NUMERIC,
    p_place_of_supply CHAR(2), p_platform_state CHAR(2)
) RETURNS TABLE(cgst_rate NUMERIC, cgst_amt NUMERIC, sgst_rate NUMERIC, sgst_amt NUMERIC, igst_rate NUMERIC, igst_amt NUMERIC) AS $$
BEGIN
    IF p_place_of_supply = p_platform_state THEN
        RETURN QUERY SELECT p_rate/2, ROUND(p_taxable_value * p_rate/200, 2),
                            p_rate/2, ROUND(p_taxable_value * p_rate/200, 2),
                            0::NUMERIC, 0::NUMERIC;
    ELSE
        RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC,
                            p_rate, ROUND(p_taxable_value * p_rate/100, 2);
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
