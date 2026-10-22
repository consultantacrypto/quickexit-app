-- =============================================================================
-- Attribution + payments + sold_at
-- NOT applied by this PR. Apply manually in the Supabase SQL editor
-- (quickexit-db) BEFORE deploying the app that writes these columns.
-- Idempotent. Does not drop data.
--
-- Rollback sketch (only if you need to undo before any reads depend on it):
--   ALTER TABLE public.listings DROP COLUMN IF EXISTS sold_at;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS attribution_first, DROP COLUMN IF EXISTS attribution_last, DROP COLUMN IF EXISTS heard_from, DROP COLUMN IF EXISTS heard_from_detail;
--   (repeat for listings, listing_offers, listing_inquiries, demands)
--   DROP TABLE IF EXISTS public.payments;
--   DROP TRIGGER IF EXISTS listings_set_sold_at ON public.listings;
--   DROP FUNCTION IF EXISTS public.listings_set_sold_at();
-- =============================================================================

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS attribution_first jsonb,
  ADD COLUMN IF NOT EXISTS attribution_last jsonb,
  ADD COLUMN IF NOT EXISTS heard_from text,
  ADD COLUMN IF NOT EXISTS heard_from_detail text;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS attribution_first jsonb,
  ADD COLUMN IF NOT EXISTS attribution_last jsonb,
  ADD COLUMN IF NOT EXISTS heard_from text,
  ADD COLUMN IF NOT EXISTS heard_from_detail text,
  ADD COLUMN IF NOT EXISTS sold_at timestamptz;

ALTER TABLE public.listing_offers
  ADD COLUMN IF NOT EXISTS attribution_first jsonb,
  ADD COLUMN IF NOT EXISTS attribution_last jsonb,
  ADD COLUMN IF NOT EXISTS heard_from text,
  ADD COLUMN IF NOT EXISTS heard_from_detail text;

ALTER TABLE public.listing_inquiries
  ADD COLUMN IF NOT EXISTS attribution_first jsonb,
  ADD COLUMN IF NOT EXISTS attribution_last jsonb,
  ADD COLUMN IF NOT EXISTS heard_from text,
  ADD COLUMN IF NOT EXISTS heard_from_detail text;

ALTER TABLE public.demands
  ADD COLUMN IF NOT EXISTS attribution_first jsonb,
  ADD COLUMN IF NOT EXISTS attribution_last jsonb,
  ADD COLUMN IF NOT EXISTS heard_from text,
  ADD COLUMN IF NOT EXISTS heard_from_detail text;

COMMENT ON COLUMN public.profiles.attribution_first IS
  'First-touch operational attribution captured at signup (UTM, click ids, referrer, landing path).';
COMMENT ON COLUMN public.profiles.heard_from IS
  'Self-reported answer to "De unde ai aflat de QuickExit?"';
COMMENT ON COLUMN public.listings.sold_at IS
  'Set by listings_set_sold_at when status becomes sold.';

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_checkout_session_id text NOT NULL UNIQUE,
  stripe_payment_intent_id text,
  amount_minor integer NOT NULL,
  currency text NOT NULL,
  package_id text,
  product text,
  user_id uuid,
  listing_id uuid,
  demand_id uuid,
  media_order_id uuid,
  media_package text,
  media_amount_minor integer,
  listing_amount_minor integer,
  attribution_first jsonb,
  attribution_last jsonb,
  heard_from text,
  heard_from_detail text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payments IS
  'Paid Stripe Checkout sessions recorded by /api/stripe/webhook. Service-role only.';

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payments FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS payments_paid_at_idx ON public.payments (paid_at DESC);
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments (user_id);
CREATE INDEX IF NOT EXISTS listings_sold_at_idx ON public.listings (sold_at DESC);
CREATE INDEX IF NOT EXISTS listings_user_created_idx ON public.listings (user_id, created_at);

CREATE OR REPLACE FUNCTION public.listings_set_sold_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'sold' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'sold') THEN
    IF NEW.sold_at IS NULL THEN
      NEW.sold_at := now();
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM 'sold' AND OLD.status = 'sold' THEN
    NEW.sold_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listings_set_sold_at ON public.listings;
CREATE TRIGGER listings_set_sold_at
  BEFORE INSERT OR UPDATE OF status, sold_at ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.listings_set_sold_at();

COMMIT;
