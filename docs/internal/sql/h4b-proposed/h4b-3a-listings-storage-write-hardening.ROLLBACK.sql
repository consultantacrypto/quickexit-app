-- =============================================================================
-- H4B.3a ROLLBACK — restore exact Production WRITE policies prior to apply
-- MANUAL ONLY — do not run unless reverting H4B.3a
-- Does NOT touch "Public Read Listings", bucket public flag, or objects.
-- =============================================================================

BEGIN;

DROP POLICY IF EXISTS "listings_storage_insert_owner_prefix"
  ON storage.objects;

DROP POLICY IF EXISTS "listings_storage_update_owner_prefix"
  ON storage.objects;

CREATE POLICY "Give users authenticated access to folder m9jfjj_0"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'listings');

CREATE POLICY "Public Insert Listings"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'listings');

CREATE POLICY "Public Update Listings"
  ON storage.objects
  FOR UPDATE
  TO public
  USING (bucket_id = 'listings');

COMMIT;
