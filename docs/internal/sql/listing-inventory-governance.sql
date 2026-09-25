-- NEEXECUTAT — NU A FOST APLICAT ÎN PRODUCTION
--
-- Additive inventory kind for public.listings.
-- Does not UPDATE existing rows, does not backfill catalog_offer,
-- and does not drop or rewrite existing columns.
-- Existing rows receive the column defaults (specific_asset / available)
-- from ADD COLUMN, not from a data UPDATE.
-- Apply only after review, before the application build that selects these columns.
--
-- Rollback (manual, after this file has been applied):
--   BEGIN;
--   -- restore the previous listing_inquiries_assign_ownership body from
--   -- docs/internal/sql/listing-inquiries.sql before dropping columns.
--   ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_listing_kind_check;
--   ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_availability_status_check;
--   ALTER TABLE public.listings DROP COLUMN IF EXISTS availability_confirmed_at;
--   ALTER TABLE public.listings DROP COLUMN IF EXISTS availability_status;
--   ALTER TABLE public.listings DROP COLUMN IF EXISTS listing_kind;
--   COMMIT;

BEGIN;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS listing_kind text DEFAULT 'specific_asset';

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS availability_status text DEFAULT 'available';

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS availability_confirmed_at timestamptz;

ALTER TABLE public.listings
  ALTER COLUMN listing_kind SET DEFAULT 'specific_asset';

ALTER TABLE public.listings
  ALTER COLUMN listing_kind SET NOT NULL;

ALTER TABLE public.listings
  ALTER COLUMN availability_status SET DEFAULT 'available';

ALTER TABLE public.listings
  ALTER COLUMN availability_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'listings'
      AND c.conname = 'listings_listing_kind_check'
  ) THEN
    ALTER TABLE public.listings
      ADD CONSTRAINT listings_listing_kind_check
      CHECK (listing_kind IN ('specific_asset', 'catalog_offer'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'listings'
      AND c.conname = 'listings_availability_status_check'
  ) THEN
    ALTER TABLE public.listings
      ADD CONSTRAINT listings_availability_status_check
      CHECK (availability_status IN ('available', 'needs_confirmation', 'sold', 'archived'));
  END IF;
END $$;

-- Replaces listing_inquiries_assign_ownership.
-- Every previous guard stays: auth, buyer/seller derivation, own-listing block,
-- seed block, consent version, duplicate window, hourly cap, advisory locks.
-- Only the availability predicate changes.
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
  listing_kind text;
  listing_availability text;
  recent_count integer;
  hourly_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'QEX:auth_required' USING ERRCODE = '42501';
  END IF;

  NEW.buyer_id := auth.uid();

  SELECT l.user_id, l.status, l.is_seed, l.expires_at, l.listing_kind, l.availability_status
    INTO listing_owner, listing_status, listing_is_seed, listing_expires, listing_kind, listing_availability
    FROM public.listings l
   WHERE l.id = NEW.listing_id;

  IF listing_owner IS NULL THEN
    RAISE EXCEPTION 'QEX:listing_unavailable' USING ERRCODE = 'P0001';
  END IF;

  IF listing_status IS DISTINCT FROM 'active'
     OR listing_is_seed IS DISTINCT FROM false
     OR listing_availability IN ('sold', 'archived')
     OR (
       COALESCE(listing_kind, 'specific_asset') IS DISTINCT FROM 'catalog_offer'
       AND COALESCE(listing_availability, 'available') IS DISTINCT FROM 'needs_confirmation'
       AND listing_expires IS NOT NULL
       AND listing_expires <= now()
     ) THEN
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

  -- Namespace 871001: per buyer+listing duplicate; 871002: per-buyer hourly cap.
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

COMMIT;
