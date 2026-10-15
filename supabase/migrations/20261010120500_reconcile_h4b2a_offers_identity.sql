-- =============================================================================
-- H4B.2a — canonical offers identity hardening (Production final state)
-- INSERT: applied 2026-10-10 via h4b-2a-offers-insert-identity-hardening.sql
-- SELECT/UPDATE: production-truth pg_policies (2026-10-11)
-- Idempotent. No DROP ALL. No negotiations/Storage.
-- Rollback INSERT: docs/internal/sql/h4b-proposed/h4b-2a-offers-insert-identity-hardening.ROLLBACK.sql
-- =============================================================================

BEGIN;

ALTER TABLE public.listing_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_offers ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.listing_offers TO authenticated;
GRANT SELECT, INSERT ON public.listing_offers TO anon;
GRANT SELECT, INSERT, UPDATE ON public.demand_offers TO authenticated;
GRANT SELECT ON public.demand_offers TO anon;

-- listing_offers SELECT / UPDATE (Production names)
DROP POLICY IF EXISTS "Doar ownerul listingului vede ofertele" ON public.listing_offers;
CREATE POLICY "Doar ownerul listingului vede ofertele"
  ON public.listing_offers
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_offers.listing_id AND l.user_id = auth.uid()
    )
    OR buyer_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Ownerul listingului poate actualiza ofertele primite" ON public.listing_offers;
CREATE POLICY "Ownerul listingului poate actualiza ofertele primite"
  ON public.listing_offers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_offers.listing_id AND l.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_offers.listing_id AND l.user_id = auth.uid()
    )
  );

-- listing_offers INSERT (H4B.2a final — replace broad public insert)
DROP POLICY IF EXISTS "Oricine poate trimite oferte" ON public.listing_offers;
DROP POLICY IF EXISTS "listing_offers_insert_authenticated_self" ON public.listing_offers;
DROP POLICY IF EXISTS "listing_offers_insert_anon_guest_null" ON public.listing_offers;

CREATE POLICY "listing_offers_insert_authenticated_self"
  ON public.listing_offers
  FOR INSERT
  TO authenticated
  WITH CHECK (buyer_user_id = auth.uid());

CREATE POLICY "listing_offers_insert_anon_guest_null"
  ON public.listing_offers
  FOR INSERT
  TO anon
  WITH CHECK (buyer_user_id IS NULL);

-- demand_offers SELECT / UPDATE
DROP POLICY IF EXISTS "Doar ownerul cererii vede propunerile" ON public.demand_offers;
CREATE POLICY "Doar ownerul cererii vede propunerile"
  ON public.demand_offers
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.demands d
      WHERE d.id = demand_offers.demand_id AND d.buyer_id = auth.uid()
    )
    OR seller_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Ownerul cererii poate actualiza ofertele primite" ON public.demand_offers;
CREATE POLICY "Ownerul cererii poate actualiza ofertele primite"
  ON public.demand_offers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.demands d
      WHERE d.id = demand_offers.demand_id AND d.buyer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.demands d
      WHERE d.id = demand_offers.demand_id AND d.buyer_id = auth.uid()
    )
  );

-- demand_offers INSERT (authenticated self only — no anon)
DROP POLICY IF EXISTS "Oricine poate trimite propuneri" ON public.demand_offers;
DROP POLICY IF EXISTS "demand_offers_insert_authenticated_self" ON public.demand_offers;

CREATE POLICY "demand_offers_insert_authenticated_self"
  ON public.demand_offers
  FOR INSERT
  TO authenticated
  WITH CHECK (seller_user_id = auth.uid());

COMMIT;
