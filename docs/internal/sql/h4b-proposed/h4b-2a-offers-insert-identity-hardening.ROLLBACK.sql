-- =============================================================================
-- H4B.2a ROLLBACK — restore Production INSERT policies (MANUAL ONLY)
-- NOT YET APPLIED TO PRODUCTION
-- Restores broad WITH CHECK (true) INSERT policies by exact Production names.
-- Does not touch SELECT/UPDATE. No row data mutation.
-- =============================================================================

BEGIN;

DROP POLICY IF EXISTS "listing_offers_insert_authenticated_self" ON public.listing_offers;
DROP POLICY IF EXISTS "listing_offers_insert_anon_guest_null" ON public.listing_offers;
DROP POLICY IF EXISTS "demand_offers_insert_authenticated_self" ON public.demand_offers;

CREATE POLICY "Oricine poate trimite oferte"
  ON public.listing_offers
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Oricine poate trimite propuneri"
  ON public.demand_offers
  FOR INSERT
  TO public
  WITH CHECK (true);

COMMIT;
