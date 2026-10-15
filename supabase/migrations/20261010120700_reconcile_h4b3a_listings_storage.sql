-- =============================================================================
-- H4B.3a — canonical Storage listings write hardening (Production-applied 2026-10-10)
-- Keeps Public Read Listings. No DELETE policy. No unnecessary bucket flag flip.
-- Source: docs/internal/sql/h4b-proposed/h4b-3a-listings-storage-write-hardening.sql
--         + production-truth storage-policies / storage-buckets
-- Rollback: docs/internal/sql/h4b-proposed/h4b-3a-listings-storage-write-hardening.ROLLBACK.sql
-- =============================================================================

BEGIN;

-- Ensure listings bucket exists; public=true matches Production truth.
-- On EXISTING_PRODUCTION: only insert if missing (do not flip private→public).
INSERT INTO storage.buckets (id, name, public)
VALUES ('listings', 'listings', true)
ON CONFLICT (id) DO NOTHING;

-- Public SELECT (create if absent; do not drop/recreate if already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public Read Listings'
  ) THEN
    CREATE POLICY "Public Read Listings"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'listings');
  END IF;
END $$;

-- Remove superseded broad write policies if present (H4B.3a apply set)
DROP POLICY IF EXISTS "Give users authenticated access to folder m9jfjj_0"
  ON storage.objects;
DROP POLICY IF EXISTS "Public Insert Listings"
  ON storage.objects;
DROP POLICY IF EXISTS "Public Update Listings"
  ON storage.objects;

DROP POLICY IF EXISTS "listings_storage_insert_owner_prefix" ON storage.objects;
CREATE POLICY "listings_storage_insert_owner_prefix"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'listings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "listings_storage_update_owner_prefix" ON storage.objects;
CREATE POLICY "listings_storage_update_owner_prefix"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'listings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'listings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

COMMIT;
