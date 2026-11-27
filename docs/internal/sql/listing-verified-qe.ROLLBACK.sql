-- Manual rollback for 20261127120000_listing_verified_qe.sql
-- Review before running. Drops the badge columns and the HQ writer.
-- Does not delete listing rows.

DROP TRIGGER IF EXISTS listings_protect_verified_qe_columns ON public.listings;
DROP FUNCTION IF EXISTS public.listings_protect_verified_qe_columns();
DROP FUNCTION IF EXISTS public.hq_set_listing_verified_qe(uuid, uuid, boolean, boolean, boolean, boolean);
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_verified_qe_complete;
DROP INDEX IF EXISTS public.listings_verified_qe_true_idx;
ALTER TABLE public.listings
  DROP COLUMN IF EXISTS verified_photos,
  DROP COLUMN IF EXISTS verified_vin,
  DROP COLUMN IF EXISTS verified_docs,
  DROP COLUMN IF EXISTS verified_by,
  DROP COLUMN IF EXISTS verified_at,
  DROP COLUMN IF EXISTS verified_qe;
