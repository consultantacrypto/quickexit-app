-- QuickExit Media orders ledger (Phase 2B / 2B.1)
-- LOCAL / STAGING FIRST. Do not apply to Production from an unverified session.
-- Independent from Stripe checkout/webhook implementation in this phase.
-- Application writes use service role; owners may SELECT own rows only.
--
-- Integrity notes (Phase 2B.1):
-- - listing_id uses ON DELETE RESTRICT so a hard delete of a listing cannot
--   silently erase paid/pending Media payment history. The app soft-deletes
--   listings (status updates such as admin_removed / archived) and does not
--   hard-delete them in normal flows; RESTRICT is therefore compatible and
--   safer for audit/reconciliation than CASCADE.
-- - user_id uses ON DELETE RESTRICT (owner snapshot), matching seller-side
--   patterns in listing_inquiries (seller_id).
-- - Partial unique index media_orders_one_active_per_listing_idx keeps at most
--   one pending|paid row per listing. Phase 2D checkout MUST cancel/supersede
--   abandoned pending rows (payment_status → cancelled) before inserting a
--   new pending order. Duplicate clicks / retries rely on that transaction.
-- - Commercial snapshot columns (package, listing_value_eur_snapshot,
--   value_tier, amount_ron, currency) are immutable by application contract;
--   no DB immutability trigger in v1.
--
-- Transactional: run the entire file in one session (BEGIN … COMMIT).
-- Repeatable: IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS.
-- Destructive ops: none (no DROP TABLE of existing product tables, no TRUNCATE).
--
-- Rollback (manual, after this file has been applied):
--   BEGIN;
--   DROP TRIGGER IF EXISTS media_orders_updated_at_trigger ON public.media_orders;
--   DROP FUNCTION IF EXISTS public.media_orders_set_updated_at();
--   DROP TABLE IF EXISTS public.media_orders CASCADE;
--   COMMIT;

BEGIN;

-- ---------------------------------------------------------------------------
-- media_orders — editorial Media purchase ledger (separate from listing payment)
-- ---------------------------------------------------------------------------
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

-- v1: at most one pending or paid Media order per listing.
-- Keep this DB guard. Application checkout (Phase 2D) must:
--   1) cancel abandoned pending for the listing (or fail closed if paid exists);
--   2) then INSERT the new pending row in the same service-role transaction.
-- History rows (failed / cancelled / refunded) are excluded and remain allowed.
CREATE UNIQUE INDEX IF NOT EXISTS media_orders_one_active_per_listing_idx
  ON public.media_orders (listing_id)
  WHERE payment_status IN ('pending', 'paid');

ALTER TABLE public.media_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_orders FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.media_orders FROM PUBLIC;
REVOKE ALL ON public.media_orders FROM anon;
REVOKE ALL ON public.media_orders FROM authenticated;
GRANT SELECT ON public.media_orders TO authenticated;
-- No GRANT INSERT/UPDATE/DELETE to authenticated — service role only.

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

-- No anon policies. No authenticated INSERT/UPDATE/DELETE policies.
-- HQ/admin and checkout/webhook paths use service role (BYPASSRLS).

COMMIT;
