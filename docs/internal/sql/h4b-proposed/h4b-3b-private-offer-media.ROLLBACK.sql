-- =============================================================================
-- H4B.3b ROLLBACK (non-destructive)
-- Removes demand-offers Storage policies created by canonical H4B.3b migration.
-- Does NOT delete bucket objects. Does NOT alter listings.
-- Does NOT drop the bucket by default (retain copies for recovery).
-- =============================================================================

BEGIN;

DROP POLICY IF EXISTS h4b3b_demand_offers_select_participants ON storage.objects;
DROP POLICY IF EXISTS h4b3b_demand_offers_insert_creator ON storage.objects;
DROP POLICY IF EXISTS h4b3b_demand_offers_delete_creator ON storage.objects;
DROP POLICY IF EXISTS "demand_offers_storage_insert_owner_prefix" ON storage.objects;

-- Optional: leave bucket in place with public=false for copied objects.
-- To fully remove bucket metadata only (objects must be empty / operator choice):
--   DELETE FROM storage.buckets WHERE id = 'demand-offers';

COMMIT;
