-- ROLLBACK for supabase/migrations/20261024180000_listings_protect_publication_fields.sql
-- Apply only with explicit approval.
-- NOTE: Does not restore a prior column DEFAULT for listings.status (was 'active' on
-- Production historically). Re-set explicitly if required after rollback:
--   ALTER TABLE public.listings ALTER COLUMN status SET DEFAULT 'active';

BEGIN;

DROP TRIGGER IF EXISTS listings_protect_publication_fields ON public.listings;
DROP FUNCTION IF EXISTS public.listings_protect_publication_fields();

COMMIT;
