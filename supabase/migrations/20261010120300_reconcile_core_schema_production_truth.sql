-- =============================================================================
-- Core schema reconciliation toward Production truth (2026-10-11 export)
-- Additive / idempotent. FRESH_DATABASE + EXISTING_PRODUCTION safe.
-- No DROP TABLE / DROP COLUMN. No data deletes.
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Missing Production tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.adjustment_rules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category text NOT NULL,
  attribute text NOT NULL,
  factor_value numeric NOT NULL,
  min_cap numeric DEFAULT 0.75,
  max_cap numeric DEFAULT 1.25,
  is_active boolean DEFAULT true,
  rule_version text DEFAULT '1.0.0'
);

CREATE TABLE IF NOT EXISTS public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid,
  title text NOT NULL,
  category text NOT NULL,
  sub_category text,
  market_price numeric,
  exit_price numeric NOT NULL,
  discount_percentage numeric,
  deal_score numeric,
  status text DEFAULT 'active',
  details jsonb,
  images text[],
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.market_search_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_signature text NOT NULL,
  category text NOT NULL,
  response_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS public.vehicle_profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  mileage_km integer NOT NULL,
  transmission text,
  fuel_type text,
  vat_deductible boolean DEFAULT false,
  service_history_status text,
  accident_status text DEFAULT 'none',
  vin_code text,
  created_at timestamptz DEFAULT now()
);

-- valuation_reports / admin_risk may already exist from H4B.0 — add missing cols
CREATE TABLE IF NOT EXISTS public.valuation_reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_profile_id uuid,
  market_anchor_price numeric NOT NULL DEFAULT 0,
  quick_exit_price numeric NOT NULL DEFAULT 0,
  strong_exit_price numeric NOT NULL DEFAULT 0,
  liquidation_price numeric NOT NULL DEFAULT 0,
  confidence_score integer,
  liquidity_score integer,
  listing_quality_score integer,
  ai_strategy_explanation text,
  generated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_risk_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_key text NOT NULL,
  risk_type text NOT NULL,
  entity_table text,
  entity_id uuid,
  severity text DEFAULT 'medium',
  title text NOT NULL,
  note text,
  resolved_by uuid,
  resolved_at timestamptz DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- listings — add Production columns missing from H4B.0 stub
-- ---------------------------------------------------------------------------
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS discount numeric;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS sale_strategy text;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS deal_score numeric;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS vehicle_make text;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS vehicle_model text;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS vehicle_year integer;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS vehicle_km integer;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS transmission text;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS drivetrain text;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS accident_status text;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS has_service_history boolean;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS seller_type text;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS is_seed boolean;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS offer_count integer;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS highest_offer numeric;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS last_offer_at timestamptz;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS crypto_payment_mode text;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS crypto_assets text[];
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS listing_kind text;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS availability_status text;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS availability_confirmed_at timestamptz;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS details jsonb;

-- Soft defaults for new columns on fresh DBs (safe if already set)
UPDATE public.listings SET offer_count = 0 WHERE offer_count IS NULL;
ALTER TABLE public.listings ALTER COLUMN offer_count SET DEFAULT 0;
UPDATE public.listings SET crypto_payment_mode = 'none' WHERE crypto_payment_mode IS NULL;
ALTER TABLE public.listings ALTER COLUMN crypto_payment_mode SET DEFAULT 'none';
UPDATE public.listings SET crypto_assets = '{}'::text[] WHERE crypto_assets IS NULL;
ALTER TABLE public.listings ALTER COLUMN crypto_assets SET DEFAULT '{}'::text[];
UPDATE public.listings SET listing_kind = 'specific_asset' WHERE listing_kind IS NULL;
ALTER TABLE public.listings ALTER COLUMN listing_kind SET DEFAULT 'specific_asset';
UPDATE public.listings SET availability_status = 'available' WHERE availability_status IS NULL;
ALTER TABLE public.listings ALTER COLUMN availability_status SET DEFAULT 'available';

-- ---------------------------------------------------------------------------
-- demands / offers / negotiations column parity (additive only)
-- ---------------------------------------------------------------------------
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS target_asset text;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS budget_min numeric;
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS requirements jsonb;

ALTER TABLE public.listing_offers ADD COLUMN IF NOT EXISTS buyer_phone text;
ALTER TABLE public.listing_offers ADD COLUMN IF NOT EXISTS buyer_email text;
ALTER TABLE public.listing_offers ADD COLUMN IF NOT EXISTS message text;

ALTER TABLE public.demand_offers ADD COLUMN IF NOT EXISTS seller_phone text;
ALTER TABLE public.demand_offers ADD COLUMN IF NOT EXISTS seller_email text;
ALTER TABLE public.demand_offers ADD COLUMN IF NOT EXISTS asset_description text;

-- Production truth: demand_offers.images is jsonb. H4B.0 local stub used text[].
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'demand_offers'
      AND column_name = 'images'
      AND udt_name = '_text'
  ) THEN
    ALTER TABLE public.demand_offers
      ALTER COLUMN images DROP DEFAULT,
      ALTER COLUMN images TYPE jsonb USING to_jsonb(images),
      ALTER COLUMN images SET DEFAULT '[]'::jsonb;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'demand_offers'
      AND column_name = 'images'
  ) THEN
    ALTER TABLE public.demand_offers
      ADD COLUMN images jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;

ALTER TABLE public.negotiation_rooms ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.negotiation_messages ADD COLUMN IF NOT EXISTS content text;

-- leads fuller Production columns
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS preferred_channel text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS data_source_note text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS legal_basis text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS asset_summary text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS asset_location text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS est_value_eur numeric;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ai_score integer;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ai_score_reason text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS next_action text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS next_action_at timestamptz;

ALTER TABLE public.lead_messages ADD COLUMN IF NOT EXISTS channel text;
ALTER TABLE public.lead_messages ADD COLUMN IF NOT EXISTS direction text;
ALTER TABLE public.lead_messages ADD COLUMN IF NOT EXISTS generated_by_ai boolean;
ALTER TABLE public.lead_messages ADD COLUMN IF NOT EXISTS model text;
ALTER TABLE public.lead_messages ADD COLUMN IF NOT EXISTS approved_by text;
ALTER TABLE public.lead_messages ADD COLUMN IF NOT EXISTS copied_at timestamptz;
ALTER TABLE public.lead_messages ADD COLUMN IF NOT EXISTS sent_manually_at timestamptz;

ALTER TABLE public.lead_events ADD COLUMN IF NOT EXISTS payload jsonb;
ALTER TABLE public.lead_events ADD COLUMN IF NOT EXISTS actor_email text;

COMMIT;
