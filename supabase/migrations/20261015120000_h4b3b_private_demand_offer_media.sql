-- =============================================================================
-- H4B.3b — private demand-offer media bucket (additive)
-- Staging-first. Safe for FRESH_LOCAL. Do not flip listings public→private.
-- No Storage DELETE policy for authenticated (HQ/server only via service role).
-- No authenticated SELECT — reads go through short-lived signed URLs.
-- Rollback: docs/internal/sql/h4b-proposed/h4b-3b-private-offer-media.ROLLBACK.sql
-- =============================================================================

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'demand-offers',
  'demand-offers',
  false,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = COALESCE(EXCLUDED.file_size_limit, storage.buckets.file_size_limit),
  allowed_mime_types = COALESCE(EXCLUDED.allowed_mime_types, storage.buckets.allowed_mime_types);

-- Drop superseded / proposed SELECT+DELETE policies if present (idempotent)
DROP POLICY IF EXISTS h4b3b_demand_offers_select_participants ON storage.objects;
DROP POLICY IF EXISTS h4b3b_demand_offers_insert_creator ON storage.objects;
DROP POLICY IF EXISTS h4b3b_demand_offers_delete_creator ON storage.objects;
DROP POLICY IF EXISTS "demand_offers_storage_insert_owner_prefix" ON storage.objects;
DROP POLICY IF EXISTS "demand_offers_storage_select_none_public" ON storage.objects;

-- Authenticated INSERT only under own uid prefix:
--   {auth.uid()}/{demand_id}/{uuid}.{ext}
CREATE POLICY "demand_offers_storage_insert_owner_prefix"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'demand-offers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Intentionally NO authenticated/anon SELECT or UPDATE/DELETE policies.
-- Signed URLs are minted server-side with service role after DB authorization.
-- listings bucket policies are untouched.

COMMIT;
