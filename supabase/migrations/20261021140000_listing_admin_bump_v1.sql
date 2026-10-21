-- =============================================================================
-- Listing Admin Bump V1
-- Adds temporary HQ ranking via listings.bumped_at + effective_sort_at.
-- Durable audit: public.listing_bump_events.
-- JWT roles cannot mutate bumped_at (trigger). Service role / HQ path only.
--
-- ROLLBACK (manual, reviewed):
--   DROP TRIGGER IF EXISTS listings_protect_rank_columns ON public.listings;
--   DROP FUNCTION IF EXISTS public.listings_protect_rank_columns();
--   DROP FUNCTION IF EXISTS public.hq_bump_listing(uuid, uuid, text);
--   DROP TABLE IF EXISTS public.listing_bump_events;
--   DROP INDEX IF EXISTS public.listings_public_effective_sort_idx;
--   ALTER TABLE public.listings DROP COLUMN IF EXISTS effective_sort_at;
--   ALTER TABLE public.listings DROP COLUMN IF EXISTS bumped_at;
-- =============================================================================

BEGIN;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS bumped_at timestamptz;

-- Generated sort key: newest of created_at / bumped_at (bumped_at null → created_at)
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS effective_sort_at timestamptz
  GENERATED ALWAYS AS (
    GREATEST(created_at, COALESCE(bumped_at, created_at))
  ) STORED;

CREATE INDEX IF NOT EXISTS listings_public_effective_sort_idx
  ON public.listings (effective_sort_at DESC, id DESC)
  WHERE status = 'active' AND COALESCE(is_seed, false) = false;

CREATE TABLE IF NOT EXISTS public.listing_bump_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings (id) ON DELETE RESTRICT,
  actor_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  actor_email text,
  bumped_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listing_bump_events_listing_id_idx
  ON public.listing_bump_events (listing_id, created_at DESC);

CREATE INDEX IF NOT EXISTS listing_bump_events_created_at_idx
  ON public.listing_bump_events (created_at DESC);

ALTER TABLE public.listing_bump_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_bump_events FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.listing_bump_events FROM PUBLIC;
REVOKE ALL ON public.listing_bump_events FROM anon;
REVOKE ALL ON public.listing_bump_events FROM authenticated;

-- Block authenticated/anon from changing bumped_at (service_role bypasses jwt role check)
CREATE OR REPLACE FUNCTION public.listings_protect_rank_columns()
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

  IF TG_OP = 'UPDATE' AND NEW.bumped_at IS DISTINCT FROM OLD.bumped_at THEN
    RAISE EXCEPTION 'QEX:rank_forbidden' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'INSERT' AND NEW.bumped_at IS NOT NULL THEN
    RAISE EXCEPTION 'QEX:rank_forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listings_protect_rank_columns ON public.listings;
CREATE TRIGGER listings_protect_rank_columns
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.listings_protect_rank_columns();

COMMENT ON FUNCTION public.listings_protect_rank_columns() IS
  'Blocks authenticated/anon from writing listings.bumped_at. HQ uses service_role.';

-- Atomic bump + audit (service_role only)
CREATE OR REPLACE FUNCTION public.hq_bump_listing(
  p_listing_id uuid,
  p_actor_user_id uuid,
  p_actor_email text DEFAULT NULL
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  listing_status text;
  listing_is_seed boolean;
  listing_availability text;
  new_bumped_at timestamptz;
BEGIN
  IF p_listing_id IS NULL OR p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'QEX:bump_invalid_args' USING ERRCODE = 'P0001';
  END IF;

  SELECT l.status, l.is_seed, l.availability_status
    INTO listing_status, listing_is_seed, listing_availability
    FROM public.listings l
   WHERE l.id = p_listing_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'QEX:bump_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF listing_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'QEX:bump_not_eligible' USING ERRCODE = 'P0001';
  END IF;

  IF COALESCE(listing_is_seed, false) IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'QEX:bump_not_eligible' USING ERRCODE = 'P0001';
  END IF;

  IF COALESCE(listing_availability, '') NOT IN ('available', 'needs_confirmation') THEN
    RAISE EXCEPTION 'QEX:bump_not_eligible' USING ERRCODE = 'P0001';
  END IF;

  new_bumped_at := now();

  UPDATE public.listings
     SET bumped_at = new_bumped_at
   WHERE id = p_listing_id;

  INSERT INTO public.listing_bump_events (
    listing_id,
    actor_user_id,
    actor_email,
    bumped_at
  ) VALUES (
    p_listing_id,
    p_actor_user_id,
    NULLIF(trim(p_actor_email), ''),
    new_bumped_at
  );

  RETURN new_bumped_at;
END;
$$;

REVOKE ALL ON FUNCTION public.hq_bump_listing(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_bump_listing(uuid, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.hq_bump_listing(uuid, uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.hq_bump_listing(uuid, uuid, text) TO service_role;

COMMENT ON FUNCTION public.hq_bump_listing(uuid, uuid, text) IS
  'HQ-only atomic bump: sets listings.bumped_at and inserts listing_bump_events.';

COMMIT;
