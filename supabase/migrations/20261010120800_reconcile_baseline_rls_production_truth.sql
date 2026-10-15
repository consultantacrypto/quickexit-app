-- =============================================================================
-- Baseline RLS enablement + Production-truth policies for non-H4 tables
-- Source: docs/internal/staging-bootstrap/production-truth/rls-*.json
-- Idempotent. FRESH_DATABASE + EXISTING_PRODUCTION safe.
-- Does not drop H4B.2a/2b policies.
-- =============================================================================

BEGIN;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negotiation_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negotiation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valuation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_risk_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adjustment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_search_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_profiles ENABLE ROW LEVEL SECURITY;

-- FORCE RLS where Production truth has it
ALTER TABLE public.listing_inquiries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.media_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.seller_contacts FORCE ROW LEVEL SECURITY;

-- Grants (Production-like PostgREST surface)
GRANT SELECT ON public.listings TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT SELECT ON public.demands TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demands TO authenticated;
REVOKE ALL ON public.profiles FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.listing_offers TO authenticated;
GRANT SELECT, INSERT ON public.listing_offers TO anon;
GRANT SELECT, INSERT, UPDATE ON public.demand_offers TO authenticated;
GRANT SELECT ON public.demand_offers TO anon;
GRANT SELECT, INSERT ON public.negotiation_rooms TO authenticated;
GRANT SELECT ON public.negotiation_rooms TO anon;
GRANT SELECT, INSERT ON public.negotiation_messages TO authenticated;
GRANT SELECT ON public.negotiation_messages TO anon;
GRANT SELECT ON public.valuation_reports TO anon, authenticated;
GRANT SELECT ON public.admin_risk_resolutions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.seller_contacts TO authenticated;
GRANT SELECT, INSERT ON public.listing_inquiries TO authenticated;
GRANT SELECT ON public.media_orders TO authenticated;

-- profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- listings
DROP POLICY IF EXISTS "Owner vede si editeaza tot" ON public.listings;
DROP POLICY IF EXISTS "Auth users pot insera listings" ON public.listings;
DROP POLICY IF EXISTS "Public poate citi listings active" ON public.listings;
DROP POLICY IF EXISTS "Users pot edita propriile anunturi" ON public.listings;
DROP POLICY IF EXISTS "Users pot face update la anuntul lor" ON public.listings;

CREATE POLICY "Owner vede si editeaza tot"
  ON public.listings FOR ALL TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Auth users pot insera listings"
  ON public.listings FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public poate citi listings active"
  ON public.listings FOR SELECT TO public
  USING (status = 'active');

CREATE POLICY "Users pot edita propriile anunturi"
  ON public.listings FOR UPDATE TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users pot face update la anuntul lor"
  ON public.listings FOR UPDATE TO public
  USING (auth.uid() = user_id);

-- demands
DROP POLICY IF EXISTS "Owner vede si editeaza cererile lui" ON public.demands;
DROP POLICY IF EXISTS "Auth users pot insera demands" ON public.demands;
DROP POLICY IF EXISTS "Public poate citi demands active" ON public.demands;

CREATE POLICY "Owner vede si editeaza cererile lui"
  ON public.demands FOR ALL TO public
  USING (auth.uid() = buyer_id);

CREATE POLICY "Auth users pot insera demands"
  ON public.demands FOR INSERT TO public
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Public poate citi demands active"
  ON public.demands FOR SELECT TO public
  USING (status = 'active');

-- seller_contacts
DROP POLICY IF EXISTS seller_contacts_insert_own ON public.seller_contacts;
DROP POLICY IF EXISTS seller_contacts_select_own ON public.seller_contacts;
DROP POLICY IF EXISTS seller_contacts_update_own ON public.seller_contacts;

CREATE POLICY seller_contacts_insert_own
  ON public.seller_contacts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY seller_contacts_select_own
  ON public.seller_contacts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY seller_contacts_update_own
  ON public.seller_contacts FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- listing_inquiries
DROP POLICY IF EXISTS listing_inquiries_buyer_insert ON public.listing_inquiries;
DROP POLICY IF EXISTS listing_inquiries_buyer_select_own ON public.listing_inquiries;
DROP POLICY IF EXISTS listing_inquiries_seller_select ON public.listing_inquiries;

CREATE POLICY listing_inquiries_buyer_insert
  ON public.listing_inquiries FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY listing_inquiries_buyer_select_own
  ON public.listing_inquiries FOR SELECT TO authenticated
  USING (buyer_id = auth.uid());

CREATE POLICY listing_inquiries_seller_select
  ON public.listing_inquiries FOR SELECT TO authenticated
  USING (
    seller_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_inquiries.listing_id AND l.user_id = auth.uid()
    )
  );

-- admin_risk_resolutions (exact Production dual policies)
DROP POLICY IF EXISTS "Admin poate insera riscuri rezolvate" ON public.admin_risk_resolutions;
DROP POLICY IF EXISTS "Admin poate citi riscurile rezolvate" ON public.admin_risk_resolutions;
DROP POLICY IF EXISTS admin_risk_resolutions_insert_hq_email ON public.admin_risk_resolutions;
DROP POLICY IF EXISTS admin_risk_resolutions_select_hq_email ON public.admin_risk_resolutions;

CREATE POLICY "Admin poate insera riscuri rezolvate"
  ON public.admin_risk_resolutions FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email'::text) = 'consultantacrypto.ro@gmail.com'::text);

CREATE POLICY "Admin poate citi riscurile rezolvate"
  ON public.admin_risk_resolutions FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'email'::text) = 'consultantacrypto.ro@gmail.com'::text);

CREATE POLICY admin_risk_resolutions_insert_hq_email
  ON public.admin_risk_resolutions FOR INSERT TO authenticated
  WITH CHECK (
    lower(TRIM(BOTH FROM COALESCE((auth.jwt() ->> 'email'::text), ''::text)))
      = 'consultantacrypto.ro@gmail.com'::text
  );

CREATE POLICY admin_risk_resolutions_select_hq_email
  ON public.admin_risk_resolutions FOR SELECT TO authenticated
  USING (
    lower(TRIM(BOTH FROM COALESCE((auth.jwt() ->> 'email'::text), ''::text)))
      = 'consultantacrypto.ro@gmail.com'::text
  );

-- leads / valuation / cache / assets: ENABLE RLS, no client policies (deny-by-default)
-- (matches Production: RLS on, zero policies for several tables)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
        AND tablename = 'negotiation_messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.negotiation_messages;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
        AND tablename = 'negotiation_rooms'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.negotiation_rooms;
    END IF;
  END IF;
END $$;

COMMIT;
