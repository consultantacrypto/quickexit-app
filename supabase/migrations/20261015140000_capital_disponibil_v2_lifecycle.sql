-- =============================================================================
-- Capital Disponibil v2 — additive demand lifecycle (paid / activated / expires)
-- Staging-first. Idempotent. No DROP COLUMN / data deletes.
-- =============================================================================

BEGIN;

ALTER TABLE public.demands
  ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT false;

ALTER TABLE public.demands
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

ALTER TABLE public.demands
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

ALTER TABLE public.demands
  ADD COLUMN IF NOT EXISTS package_id text;

ALTER TABLE public.demands
  ADD COLUMN IF NOT EXISTS buyer_verified boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.demands.paid IS
  'True after successful Stripe fulfillment for Capital Disponibil.';
COMMENT ON COLUMN public.demands.activated_at IS
  'Timestamp when demand became publicly active after payment.';
COMMENT ON COLUMN public.demands.expires_at IS
  'End of paid visibility window (typically activated_at + 30 days).';
COMMENT ON COLUMN public.demands.package_id IS
  'Stripe package id used at checkout (e.g. demand_standard_30d).';
COMMENT ON COLUMN public.demands.buyer_verified IS
  'Snapshot of profiles.kyc_status=verified at activation (public prestige badge).';

CREATE INDEX IF NOT EXISTS demands_active_expires_at_idx
  ON public.demands (expires_at)
  WHERE status = 'active';

-- Public may only read effectively-active demands (status + not past expires_at).
DROP POLICY IF EXISTS "Public poate citi demands active" ON public.demands;
CREATE POLICY "Public poate citi demands active"
  ON public.demands
  FOR SELECT
  TO public
  USING (
    status = 'active'
    AND (expires_at IS NULL OR expires_at > timezone('utc', now()))
  );

-- Sellers may only insert offers against effectively-active demands.
DROP POLICY IF EXISTS "demand_offers_insert_authenticated_self" ON public.demand_offers;
CREATE POLICY "demand_offers_insert_authenticated_self"
  ON public.demand_offers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    seller_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.demands d
      WHERE d.id = demand_offers.demand_id
        AND d.status = 'active'
        AND (d.expires_at IS NULL OR d.expires_at > timezone('utc', now()))
    )
  );

COMMIT;
