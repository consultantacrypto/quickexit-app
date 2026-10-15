-- =============================================================================
-- H4B.0 LOCAL BOOTSTRAP — NOT A HISTORICAL PRODUCTION MIGRATION
-- DO NOT APPLY TO PRODUCTION (geywuzwbzecknokvnins)
--
-- Purpose: minimum schema for local RLS / Storage / Realtime security matrix.
-- Columns sourced from H4B Production read-only inventory (2026-10-10).
-- Does NOT claim these DDL statements were applied to Production historically.
-- =============================================================================

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text,
  kyc_status text NOT NULL DEFAULT 'unverified',
  user_type text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- listings (security-relevant subset of observed Production columns)
CREATE TABLE IF NOT EXISTS public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text,
  status text NOT NULL DEFAULT 'pending_payment',
  category text,
  description text,
  market_price numeric,
  exit_price numeric,
  images text[] NOT NULL DEFAULT '{}',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- demands
CREATE TABLE IF NOT EXISTS public.demands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending_payment',
  category text,
  description text,
  budget numeric,
  budget_min numeric,
  requirements text,
  target_asset text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- listing_offers (columns proven present on Production empty-table probes)
CREATE TABLE IF NOT EXISTS public.listing_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  buyer_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  offer_price numeric,
  buyer_phone text,
  buyer_email text,
  message text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- demand_offers
CREATE TABLE IF NOT EXISTS public.demand_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id uuid NOT NULL REFERENCES public.demands (id) ON DELETE CASCADE,
  seller_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  offer_price numeric,
  asset_description text,
  seller_phone text,
  seller_email text,
  images text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- negotiation_rooms / messages (columns proven present)
CREATE TABLE IF NOT EXISTS public.negotiation_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.listings (id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.negotiation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.negotiation_rooms (id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- valuation_reports — PARTIAL ownership model:
-- Production has vehicle_profile_id, NOT user_id. No vehicle_profiles table
-- confirmed in repo inventory. Ownership RLS cannot be faithfully modeled
-- without inventing columns — see current-policy SQL comments.
CREATE TABLE IF NOT EXISTS public.valuation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_profile_id uuid,
  ai_strategy_explanation text,
  confidence_score numeric,
  liquidation_price numeric,
  liquidity_score numeric,
  listing_quality_score numeric,
  market_anchor_price numeric,
  quick_exit_price numeric,
  strong_exit_price numeric,
  generated_at timestamptz NOT NULL DEFAULT now()
);

-- admin_risk_resolutions
CREATE TABLE IF NOT EXISTS public.admin_risk_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_key text NOT NULL,
  risk_type text,
  entity_table text,
  entity_id text,
  severity text,
  title text,
  note text,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'H4B.0 local bootstrap — not Production migration history';
COMMENT ON TABLE public.valuation_reports IS 'H4B.0 PARTIAL — ownership join unknown (vehicle_profile_id only)';
