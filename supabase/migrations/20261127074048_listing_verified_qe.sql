-- =============================================================================
-- Listing "Verificat QE" badge
-- Manual HQ verification only. No cron, webhook, or payment path sets these
-- columns. Existing rows stay unverified (boolean defaults are false).
--
-- Checklist columns are separate booleans, not jsonb: the CHECK below can
-- require all three flags plus verified_at / verified_by without a JSON shape
-- that PostgREST would not enforce. verified_by is uuid (auth.users id), the
-- same actor identity as listing_bump_events.actor_user_id and
-- admin_risk_resolutions.resolved_by. HQ admission is still the email
-- allowlist; the email itself is not stored on the public listings row.
-- No FK to auth.users: dropping an admin must not rewrite history, and this
-- migration must not add a new constraint on auth.
--
-- Writers: jwt roles anon and authenticated cannot change these columns
-- (trigger). service_role calls public.hq_set_listing_verified_qe. Table
-- SELECT already granted to anon/authenticated covers the new columns, so
-- the badge is readable. A column-level REVOKE does not override that table
-- GRANT in Postgres, so the trigger is the write barrier (same pattern as
-- listings.bumped_at).
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, constraint/index/trigger guards,
-- CREATE OR REPLACE, GRANT/REVOKE safe to repeat.
--
-- ROLLBACK (manual, reviewed) — also docs/internal/sql/listing-verified-qe.ROLLBACK.sql:
--   DROP TRIGGER IF EXISTS listings_protect_verified_qe_columns ON public.listings;
--   DROP FUNCTION IF EXISTS public.listings_protect_verified_qe_columns();
--   DROP FUNCTION IF EXISTS public.hq_set_listing_verified_qe(uuid, uuid, boolean, boolean, boolean, boolean);
--   ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_verified_qe_complete;
--   DROP INDEX IF EXISTS public.listings_verified_qe_true_idx;
--   ALTER TABLE public.listings
--     DROP COLUMN IF EXISTS verified_photos,
--     DROP COLUMN IF EXISTS verified_vin,
--     DROP COLUMN IF EXISTS verified_docs,
--     DROP COLUMN IF EXISTS verified_by,
--     DROP COLUMN IF EXISTS verified_at,
--     DROP COLUMN IF EXISTS verified_qe;
-- =============================================================================

BEGIN;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS verified_docs boolean NOT NULL DEFAULT false;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS verified_vin boolean NOT NULL DEFAULT false;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS verified_photos boolean NOT NULL DEFAULT false;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS verified_qe boolean NOT NULL DEFAULT false;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS verified_by uuid;

UPDATE public.listings SET verified_docs = false WHERE verified_docs IS NULL;
UPDATE public.listings SET verified_vin = false WHERE verified_vin IS NULL;
UPDATE public.listings SET verified_photos = false WHERE verified_photos IS NULL;
UPDATE public.listings SET verified_qe = false WHERE verified_qe IS NULL;

ALTER TABLE public.listings ALTER COLUMN verified_docs SET DEFAULT false;
ALTER TABLE public.listings ALTER COLUMN verified_docs SET NOT NULL;
ALTER TABLE public.listings ALTER COLUMN verified_vin SET DEFAULT false;
ALTER TABLE public.listings ALTER COLUMN verified_vin SET NOT NULL;
ALTER TABLE public.listings ALTER COLUMN verified_photos SET DEFAULT false;
ALTER TABLE public.listings ALTER COLUMN verified_photos SET NOT NULL;
ALTER TABLE public.listings ALTER COLUMN verified_qe SET DEFAULT false;
ALTER TABLE public.listings ALTER COLUMN verified_qe SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'listings_verified_qe_complete'
       AND conrelid = 'public.listings'::regclass
  ) THEN
    ALTER TABLE public.listings
      ADD CONSTRAINT listings_verified_qe_complete
      CHECK (
        verified_qe = false
        OR (
          verified_docs = true
          AND verified_vin = true
          AND verified_photos = true
          AND verified_at IS NOT NULL
          AND verified_by IS NOT NULL
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS listings_verified_qe_true_idx
  ON public.listings (verified_at DESC, id DESC)
  WHERE verified_qe;

COMMENT ON COLUMN public.listings.verified_qe IS
  'Manual HQ badge. True only when docs, VIN, and real photos are checked and verified_at/verified_by are set.';
COMMENT ON COLUMN public.listings.verified_docs IS 'HQ checklist: documents reviewed.';
COMMENT ON COLUMN public.listings.verified_vin IS 'HQ checklist: VIN reviewed.';
COMMENT ON COLUMN public.listings.verified_photos IS 'HQ checklist: real photos reviewed.';
COMMENT ON COLUMN public.listings.verified_at IS 'Server timestamp of the current grant. Null when not verified.';
COMMENT ON COLUMN public.listings.verified_by IS 'auth.users id of the HQ admin who granted the badge. Not an email.';

CREATE OR REPLACE FUNCTION public.listings_protect_verified_qe_columns()
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

  IF TG_OP = 'INSERT' AND (
    NEW.verified_qe IS TRUE
    OR NEW.verified_docs IS TRUE
    OR NEW.verified_vin IS TRUE
    OR NEW.verified_photos IS TRUE
    OR NEW.verified_at IS NOT NULL
    OR NEW.verified_by IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'QEX:verified_qe_forbidden' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE' AND (
    NEW.verified_qe IS DISTINCT FROM OLD.verified_qe
    OR NEW.verified_docs IS DISTINCT FROM OLD.verified_docs
    OR NEW.verified_vin IS DISTINCT FROM OLD.verified_vin
    OR NEW.verified_photos IS DISTINCT FROM OLD.verified_photos
    OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
    OR NEW.verified_by IS DISTINCT FROM OLD.verified_by
  ) THEN
    RAISE EXCEPTION 'QEX:verified_qe_forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listings_protect_verified_qe_columns ON public.listings;
CREATE TRIGGER listings_protect_verified_qe_columns
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.listings_protect_verified_qe_columns();

COMMENT ON FUNCTION public.listings_protect_verified_qe_columns() IS
  'Blocks authenticated/anon from writing Verificat QE columns. HQ uses service_role.';

CREATE OR REPLACE FUNCTION public.hq_set_listing_verified_qe(
  p_listing_id uuid,
  p_actor_user_id uuid,
  p_grant boolean,
  p_docs boolean,
  p_vin boolean,
  p_photos boolean
)
RETURNS TABLE (
  verified_qe boolean,
  verified_docs boolean,
  verified_vin boolean,
  verified_photos boolean,
  verified_at timestamptz,
  verified_by uuid
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_listing_id IS NULL THEN
    RAISE EXCEPTION 'QEX:verified_qe_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF COALESCE(p_grant, false) THEN
    IF p_actor_user_id IS NULL
      OR NOT COALESCE(p_docs, false)
      OR NOT COALESCE(p_vin, false)
      OR NOT COALESCE(p_photos, false) THEN
      RAISE EXCEPTION 'QEX:verified_qe_incomplete' USING ERRCODE = '23514';
    END IF;

    UPDATE public.listings AS l
       SET verified_qe = true,
           verified_docs = true,
           verified_vin = true,
           verified_photos = true,
           verified_at = now(),
           verified_by = p_actor_user_id
     WHERE l.id = p_listing_id
     RETURNING
       l.verified_qe,
       l.verified_docs,
       l.verified_vin,
       l.verified_photos,
       l.verified_at,
       l.verified_by
      INTO
       verified_qe,
       verified_docs,
       verified_vin,
       verified_photos,
       verified_at,
       verified_by;
  ELSE
    UPDATE public.listings AS l
       SET verified_qe = false,
           verified_docs = false,
           verified_vin = false,
           verified_photos = false,
           verified_at = NULL,
           verified_by = NULL
     WHERE l.id = p_listing_id
     RETURNING
       l.verified_qe,
       l.verified_docs,
       l.verified_vin,
       l.verified_photos,
       l.verified_at,
       l.verified_by
      INTO
       verified_qe,
       verified_docs,
       verified_vin,
       verified_photos,
       verified_at,
       verified_by;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'QEX:verified_qe_not_found' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.hq_set_listing_verified_qe(uuid, uuid, boolean, boolean, boolean, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_set_listing_verified_qe(uuid, uuid, boolean, boolean, boolean, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.hq_set_listing_verified_qe(uuid, uuid, boolean, boolean, boolean, boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.hq_set_listing_verified_qe(uuid, uuid, boolean, boolean, boolean, boolean) TO service_role;

-- service_role already has table access on Supabase. Repeat it so RETURNING
-- (needs SELECT) and the badge UPDATE are explicit and idempotent.
GRANT SELECT, UPDATE ON TABLE public.listings TO service_role;

COMMENT ON FUNCTION public.hq_set_listing_verified_qe(uuid, uuid, boolean, boolean, boolean, boolean) IS
  'HQ-only grant or revoke of the Verificat QE badge. verified_at is now() and verified_by is the actor uuid. Incomplete checks cannot grant.';

COMMIT;
