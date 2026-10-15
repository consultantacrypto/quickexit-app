-- =============================================================================
-- Evidenced Production triggers (excluding H4B.1 already in 20261010120400
-- and media_orders_updated_at in 20261010120200).
-- Sources: docs/internal/sql/listing-inquiries.sql, lead-agent-v0.sql,
--          listing-inventory-governance.sql
-- UNRESOLVED (no repo body): trg_listing_offers_refresh_stats
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.seller_contacts_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'QEX:auth_required' USING ERRCODE = '42501';
  END IF;
  NEW.updated_at = now();
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seller_contacts_updated_at_trigger ON public.seller_contacts;
CREATE TRIGGER seller_contacts_updated_at_trigger
  BEFORE INSERT OR UPDATE ON public.seller_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.seller_contacts_set_updated_at();

CREATE OR REPLACE FUNCTION public.listing_inquiries_set_updated_at()
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

DROP TRIGGER IF EXISTS listing_inquiries_updated_at_trigger ON public.listing_inquiries;
CREATE TRIGGER listing_inquiries_updated_at_trigger
  BEFORE UPDATE ON public.listing_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.listing_inquiries_set_updated_at();

CREATE OR REPLACE FUNCTION public.listing_inquiries_assign_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  listing_owner uuid;
  listing_status text;
  listing_is_seed boolean;
  listing_expires timestamptz;
  recent_count integer;
  hourly_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'QEX:auth_required' USING ERRCODE = '42501';
  END IF;

  NEW.buyer_id := auth.uid();

  SELECT l.user_id, l.status, l.is_seed, l.expires_at
    INTO listing_owner, listing_status, listing_is_seed, listing_expires
    FROM public.listings l
   WHERE l.id = NEW.listing_id;

  IF listing_owner IS NULL THEN
    RAISE EXCEPTION 'QEX:listing_unavailable' USING ERRCODE = 'P0001';
  END IF;

  IF listing_status IS DISTINCT FROM 'active'
     OR listing_is_seed IS DISTINCT FROM false
     OR (listing_expires IS NOT NULL AND listing_expires <= now()) THEN
    RAISE EXCEPTION 'QEX:listing_unavailable' USING ERRCODE = 'P0001';
  END IF;

  NEW.seller_id := listing_owner;

  IF NEW.buyer_id = NEW.seller_id THEN
    RAISE EXCEPTION 'QEX:own_listing' USING ERRCODE = 'P0001';
  END IF;

  NEW.consent_version := '2026-08';
  NEW.status := 'new';
  NEW.notification_status := 'pending';
  NEW.notification_error_code := NULL;

  PERFORM pg_advisory_xact_lock(
    871001,
    hashtext(NEW.buyer_id::text || ':' || NEW.listing_id::text)
  );
  PERFORM pg_advisory_xact_lock(
    871002,
    hashtext(NEW.buyer_id::text)
  );

  SELECT count(*)::integer
    INTO recent_count
    FROM public.listing_inquiries i
   WHERE i.buyer_id = NEW.buyer_id
     AND i.listing_id = NEW.listing_id
     AND i.created_at > now() - interval '15 minutes';

  IF recent_count > 0 THEN
    RAISE EXCEPTION 'QEX:duplicate_inquiry' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*)::integer
    INTO hourly_count
    FROM public.listing_inquiries i
   WHERE i.buyer_id = NEW.buyer_id
     AND i.created_at > now() - interval '1 hour';

  IF hourly_count >= 5 THEN
    RAISE EXCEPTION 'QEX:rate_limited' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listing_inquiries_assign_ownership_trigger ON public.listing_inquiries;
CREATE TRIGGER listing_inquiries_assign_ownership_trigger
  BEFORE INSERT ON public.listing_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.listing_inquiries_assign_ownership();

CREATE OR REPLACE FUNCTION public.leads_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_updated_at_trigger ON public.leads;
CREATE TRIGGER leads_updated_at_trigger
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.leads_set_updated_at();

CREATE OR REPLACE FUNCTION public.listings_guard_inventory_classification()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := COALESCE(auth.jwt() ->> 'role', '');

  IF jwt_role NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.listing_kind IS DISTINCT FROM 'specific_asset'
       OR NEW.availability_status IS DISTINCT FROM 'available'
       OR NEW.availability_confirmed_at IS NOT NULL THEN
      RAISE EXCEPTION 'QEX:inventory_forbidden' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.listing_kind IS DISTINCT FROM OLD.listing_kind
     OR NEW.availability_status IS DISTINCT FROM OLD.availability_status
     OR NEW.availability_confirmed_at IS DISTINCT FROM OLD.availability_confirmed_at THEN
    RAISE EXCEPTION 'QEX:inventory_forbidden' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listings_guard_inventory_classification ON public.listings;
CREATE TRIGGER listings_guard_inventory_classification
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.listings_guard_inventory_classification();

COMMIT;
