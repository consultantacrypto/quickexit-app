-- =============================================================================
-- DO_NOT_RUN — superseded draft (includes authenticated SELECT + DELETE policies)
-- Canonical migration:
--   supabase/migrations/20261015120000_h4b3b_private_demand_offer_media.sql
-- Rollback:
--   docs/internal/sql/h4b-proposed/h4b-3b-private-offer-media.ROLLBACK.sql
-- Prefer: no client SELECT; signed URLs via server; no authenticated DELETE.
-- =============================================================================
-- H4B.3b (historical draft — evidence only)
-- Scope: PRIVATE commercial demand-offer media (separate bucket + signed URLs).
-- REQUIRES APP CHANGES (uploader + viewer) — do not apply SQL alone.
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
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS h4b3b_demand_offers_select_participants ON storage.objects;
DROP POLICY IF EXISTS h4b3b_demand_offers_insert_creator ON storage.objects;
DROP POLICY IF EXISTS h4b3b_demand_offers_delete_creator ON storage.objects;

-- Path convention (app must match):
--   {seller_user_id}/{demand_id}/{filename}
-- SELECT: creator OR demand owner (via public.demands.buyer_id)
CREATE POLICY h4b3b_demand_offers_select_participants
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'demand-offers'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1
        FROM public.demands d
        WHERE d.id::text = (storage.foldername(name))[2]
          AND d.buyer_id = auth.uid()
      )
    )
  );

CREATE POLICY h4b3b_demand_offers_insert_creator
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'demand-offers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY h4b3b_demand_offers_delete_creator
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'demand-offers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- No anon policies. No public=true.

COMMIT;
