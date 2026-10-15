-- =============================================================================
-- CANONICAL RECONSTRUCTION of Production migration history row:
--   version: 20261008150013
--   name:    quickexit_media_orders_phase_2b_2b1
--
-- Placed AFTER H4B.0 schema bootstrap so public.listings exists (FK).
-- Production originally recorded this under 20261008150013 after listings
-- already existed outside migration history.
--
-- Source of truth: docs/internal/sql/media-orders.sql + production-truth.
-- Modes: FRESH_DATABASE + EXISTING_PRODUCTION (idempotent).
-- NO DROP TABLE. NO data deletes.
-- DO NOT invent semantics beyond evidenced SQL.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.media_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  package text NOT NULL,
  listing_value_eur_snapshot numeric NOT NULL,
  value_tier text NOT NULL,
  amount_ron integer NOT NULL,
  currency text NOT NULL DEFAULT 'ron',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  payment_status text NOT NULL DEFAULT 'pending',
  editorial_status text NOT NULL DEFAULT 'queued',
  locale text,
  source text NOT NULL DEFAULT 'publish_checkout',
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  fulfilled_at timestamptz,
  refunded_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_orders_package_check
    CHECK (package IN ('stories_4', 'stories_8', 'featured')),
  CONSTRAINT media_orders_value_tier_check
    CHECK (value_tier IN ('under_50k', '50k_100k', '100k_500k', 'over_500k')),
  CONSTRAINT media_orders_payment_status_check
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  CONSTRAINT media_orders_editorial_status_check
    CHECK (
      editorial_status IN (
        'queued',
        'needs_info',
        'in_research',
        'in_production',
        'published',
        'rejected',
        'cancelled'
      )
    ),
  CONSTRAINT media_orders_source_check
    CHECK (source IN ('publish_checkout', 'post_publish')),
  CONSTRAINT media_orders_amount_ron_positive
    CHECK (amount_ron > 0),
  CONSTRAINT media_orders_listing_value_positive
    CHECK (listing_value_eur_snapshot > 0),
  CONSTRAINT media_orders_currency_ron
    CHECK (currency = 'ron')
);

-- Ensure columns exist if an older stub table was created by H4B.0 local bootstrap
ALTER TABLE public.media_orders ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;
ALTER TABLE public.media_orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
ALTER TABLE public.media_orders ADD COLUMN IF NOT EXISTS editorial_status text;
ALTER TABLE public.media_orders ADD COLUMN IF NOT EXISTS locale text;
ALTER TABLE public.media_orders ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.media_orders ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.media_orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.media_orders ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz;
ALTER TABLE public.media_orders ADD COLUMN IF NOT EXISTS refunded_at timestamptz;
ALTER TABLE public.media_orders ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE public.media_orders ADD COLUMN IF NOT EXISTS updated_at timestamptz;

CREATE OR REPLACE FUNCTION public.media_orders_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS media_orders_updated_at_trigger ON public.media_orders;
CREATE TRIGGER media_orders_updated_at_trigger
  BEFORE UPDATE ON public.media_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.media_orders_set_updated_at();

CREATE INDEX IF NOT EXISTS media_orders_listing_id_idx
  ON public.media_orders (listing_id);

CREATE INDEX IF NOT EXISTS media_orders_user_id_idx
  ON public.media_orders (user_id);

CREATE INDEX IF NOT EXISTS media_orders_stripe_checkout_session_id_idx
  ON public.media_orders (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS media_orders_payment_editorial_status_idx
  ON public.media_orders (payment_status, editorial_status);

CREATE INDEX IF NOT EXISTS media_orders_created_at_idx
  ON public.media_orders (created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS media_orders_one_active_per_listing_idx
  ON public.media_orders (listing_id)
  WHERE payment_status IN ('pending', 'paid');

ALTER TABLE public.media_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_orders FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.media_orders FROM PUBLIC;
REVOKE ALL ON public.media_orders FROM anon;
REVOKE ALL ON public.media_orders FROM authenticated;
GRANT SELECT ON public.media_orders TO authenticated;

DROP POLICY IF EXISTS media_orders_owner_select ON public.media_orders;
CREATE POLICY media_orders_owner_select
  ON public.media_orders
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.listings l
      WHERE l.id = media_orders.listing_id
        AND l.user_id = auth.uid()
    )
  );

COMMIT;
