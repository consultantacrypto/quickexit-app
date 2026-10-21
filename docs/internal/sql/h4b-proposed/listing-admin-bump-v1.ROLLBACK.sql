-- ROLLBACK for supabase/migrations/20261021140000_listing_admin_bump_v1.sql
-- Apply only with explicit approval. Does not restore historical bump events once dropped.

BEGIN;

DROP TRIGGER IF EXISTS listings_protect_rank_columns ON public.listings;
DROP FUNCTION IF EXISTS public.listings_protect_rank_columns();
DROP FUNCTION IF EXISTS public.hq_bump_listing(uuid, uuid, text);
DROP TABLE IF EXISTS public.listing_bump_events;
DROP INDEX IF EXISTS public.listings_public_effective_sort_idx;
ALTER TABLE public.listings DROP COLUMN IF EXISTS effective_sort_at;
ALTER TABLE public.listings DROP COLUMN IF EXISTS bumped_at;

COMMIT;
