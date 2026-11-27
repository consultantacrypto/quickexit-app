-- =============================================================================
-- NOT APPLIED.
-- Do not run this file against production or staging from the pull request.
-- No INSERT. No remote write is performed by this change.
--
-- Production quickexit-db already has public.payments (0 rows) from the
-- untracked migration attribution_payments_sold_at (version 20261022093415).
-- CREATE TABLE IF NOT EXISTS is a no-op there. promo_queue is new.
--
-- Apply only after review, on the database that should receive webhook writes.
-- service_role (BYPASSRLS) is the only writer. anon and authenticated have no
-- policies. Preview must not be treated as a license to apply this remotely.
-- =============================================================================

BEGIN;

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

CREATE INDEX IF NOT EXISTS payments_paid_at_idx ON public.payments (paid_at DESC);
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments (user_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.payments FROM PUBLIC;
REVOKE ALL ON TABLE public.payments FROM anon;
REVOKE ALL ON TABLE public.payments FROM authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.payments TO service_role;

CREATE TABLE IF NOT EXISTS public.promo_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_checkout_session_id text NOT NULL UNIQUE,
  stripe_payment_intent_id text,
  listing_id uuid NOT NULL,
  title text NOT NULL,
  package_id text,
  amount_minor integer NOT NULL,
  currency text NOT NULL,
  paid_at timestamptz NOT NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  public_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promo_queue_status_check CHECK (status IN ('pending', 'done', 'late'))
);

COMMENT ON TABLE public.promo_queue IS
  'Listing promo work queue. pending until published, late after due_at, done when the team marks it published. due_at is Europe/Bucharest: paid_at + 1h for local times 08:00:00 through 22:00:00 inclusive; 09:00 the same morning before 08:00; 09:00 the next morning after 22:00. Service-role only.';

CREATE INDEX IF NOT EXISTS promo_queue_status_due_idx
  ON public.promo_queue (status, due_at);

ALTER TABLE public.promo_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_queue FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.promo_queue FROM PUBLIC;
REVOKE ALL ON TABLE public.promo_queue FROM anon;
REVOKE ALL ON TABLE public.promo_queue FROM authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.promo_queue TO service_role;

COMMIT;
