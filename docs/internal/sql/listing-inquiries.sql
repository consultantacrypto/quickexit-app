-- QuickExit listing inquiries + private seller contacts
-- LOCAL / STAGING FIRST. Do not apply to Production from an unverified session.
-- Independent from Stripe and listing activation.
-- Application UI is not production-safe until this file has been applied.
--
-- Authoritative duplicate/rate protection is in listing_inquiries_assign_ownership
-- (transaction-scoped advisory locks + rolling window counts). The unique index
-- is a supplemental bucket defense, not the rolling-window source of truth.
--
-- Keep LISTING_INQUIRY_CONSENT_VERSION in lib/listingInquiry.ts equal to the
-- consent_version assigned in listing_inquiries_assign_ownership (2026-08).
--
-- Transactional: run the entire file in one session (BEGIN … COMMIT).
-- Repeatable: IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS.
-- Destructive ops: none (no DROP TABLE of existing product tables, no TRUNCATE).
--
-- Rollback (manual, after this file has been applied):
--   BEGIN;
--   DROP FUNCTION IF EXISTS public.listing_inquiries_seller_set_status(uuid, text);
--   DROP TABLE IF EXISTS public.listing_inquiries CASCADE;
--   DROP TABLE IF EXISTS public.seller_contacts CASCADE;
--   DROP FUNCTION IF EXISTS public.listing_inquiries_set_updated_at();
--   DROP FUNCTION IF EXISTS public.listing_inquiries_assign_ownership();
--   DROP FUNCTION IF EXISTS public.seller_contacts_set_updated_at();
--   COMMIT;
-- profiles is unchanged; phone is NOT added to profiles.

BEGIN;

-- ---------------------------------------------------------------------------
-- seller_contacts — private owner-only phone. Not on profiles.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.seller_contacts (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  phone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seller_contacts_phone_len
    CHECK (char_length(phone) BETWEEN 8 AND 20)
);

CREATE OR REPLACE FUNCTION public.seller_contacts_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'QEX:auth_required' USING ERRCODE = '42501';
  END IF;
  NEW.updated_at = now();
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seller_contacts_updated_at_trigger ON public.seller_contacts;
CREATE TRIGGER seller_contacts_updated_at_trigger
  BEFORE INSERT OR UPDATE ON public.seller_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.seller_contacts_set_updated_at();

ALTER TABLE public.seller_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_contacts FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.seller_contacts FROM PUBLIC;
REVOKE ALL ON public.seller_contacts FROM anon;
REVOKE ALL ON public.seller_contacts FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.seller_contacts TO authenticated;

DROP POLICY IF EXISTS seller_contacts_select_own ON public.seller_contacts;
CREATE POLICY seller_contacts_select_own
  ON public.seller_contacts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS seller_contacts_insert_own ON public.seller_contacts;
CREATE POLICY seller_contacts_insert_own
  ON public.seller_contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS seller_contacts_update_own ON public.seller_contacts;
CREATE POLICY seller_contacts_update_own
  ON public.seller_contacts
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- listing_inquiries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listing_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  buyer_phone text NOT NULL,
  message text,
  consent_version text NOT NULL,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'seen', 'closed', 'hq_handling')),
  notification_status text NOT NULL DEFAULT 'pending'
    CHECK (
      notification_status IN (
        'pending',
        'sending',
        'sent',
        'failed',
        'skipped_no_provider',
        'skipped_disabled',
        'skipped_missing_recipient'
      )
    ),
  notification_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listing_inquiries_buyer_phone_len
    CHECK (char_length(buyer_phone) BETWEEN 8 AND 20),
  CONSTRAINT listing_inquiries_message_len
    CHECK (message IS NULL OR char_length(message) <= 2000),
  CONSTRAINT listing_inquiries_error_code_len
    CHECK (notification_error_code IS NULL OR char_length(notification_error_code) <= 64),
  CONSTRAINT listing_inquiries_consent_version_len
    CHECK (char_length(consent_version) BETWEEN 4 AND 32),
  CONSTRAINT listing_inquiries_consent_version_value
    CHECK (consent_version = '2026-08'),
  CONSTRAINT listing_inquiries_not_self
    CHECK (buyer_id <> seller_id)
);

ALTER TABLE public.listing_inquiries
  ADD COLUMN IF NOT EXISTS consent_version text;
UPDATE public.listing_inquiries
   SET consent_version = '2026-08'
 WHERE consent_version IS NULL;
ALTER TABLE public.listing_inquiries
  ALTER COLUMN consent_version SET NOT NULL;
ALTER TABLE public.listing_inquiries
  DROP CONSTRAINT IF EXISTS listing_inquiries_consent_version_value;
ALTER TABLE public.listing_inquiries
  ADD CONSTRAINT listing_inquiries_consent_version_value
  CHECK (consent_version = '2026-08');

CREATE INDEX IF NOT EXISTS listing_inquiries_seller_id_created_idx
  ON public.listing_inquiries (seller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS listing_inquiries_listing_id_created_idx
  ON public.listing_inquiries (listing_id, created_at DESC);

CREATE INDEX IF NOT EXISTS listing_inquiries_status_created_idx
  ON public.listing_inquiries (status, created_at DESC);

CREATE INDEX IF NOT EXISTS listing_inquiries_created_at_idx
  ON public.listing_inquiries (created_at DESC);

CREATE INDEX IF NOT EXISTS listing_inquiries_notification_status_idx
  ON public.listing_inquiries (notification_status, created_at DESC);

CREATE INDEX IF NOT EXISTS listing_inquiries_buyer_listing_created_idx
  ON public.listing_inquiries (buyer_id, listing_id, created_at DESC);

CREATE INDEX IF NOT EXISTS listing_inquiries_buyer_created_idx
  ON public.listing_inquiries (buyer_id, created_at DESC);

-- Supplemental (non-rolling) 900s epoch unique defense. Rolling 15-minute
-- duplicate checks run inside listing_inquiries_assign_ownership.
CREATE UNIQUE INDEX IF NOT EXISTS listing_inquiries_buyer_listing_window_uidx
  ON public.listing_inquiries (
    buyer_id,
    listing_id,
    (floor(extract(epoch FROM (created_at AT TIME ZONE 'UTC')) / 900)::bigint)
  );

CREATE OR REPLACE FUNCTION public.listing_inquiries_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listing_inquiries_updated_at_trigger ON public.listing_inquiries;
CREATE TRIGGER listing_inquiries_updated_at_trigger
  BEFORE UPDATE ON public.listing_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.listing_inquiries_set_updated_at();

CREATE OR REPLACE FUNCTION public.listing_inquiries_assign_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  listing_owner uuid;
  listing_status text;
  listing_is_seed boolean;
  listing_expires timestamptz;
  recent_count integer;
  hourly_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'QEX:auth_required' USING ERRCODE = '42501';
  END IF;

  NEW.buyer_id := auth.uid();

  SELECT l.user_id, l.status, l.is_seed, l.expires_at
    INTO listing_owner, listing_status, listing_is_seed, listing_expires
    FROM public.listings l
   WHERE l.id = NEW.listing_id;

  IF listing_owner IS NULL THEN
    RAISE EXCEPTION 'QEX:listing_unavailable' USING ERRCODE = 'P0001';
  END IF;

  IF listing_status IS DISTINCT FROM 'active'
     OR listing_is_seed IS DISTINCT FROM false
     OR (listing_expires IS NOT NULL AND listing_expires <= now()) THEN
    RAISE EXCEPTION 'QEX:listing_unavailable' USING ERRCODE = 'P0001';
  END IF;

  NEW.seller_id := listing_owner;

  IF NEW.buyer_id = NEW.seller_id THEN
    RAISE EXCEPTION 'QEX:own_listing' USING ERRCODE = 'P0001';
  END IF;

  NEW.consent_version := '2026-08';
  NEW.status := 'new';
  NEW.notification_status := 'pending';
  NEW.notification_error_code := NULL;

  -- Namespace 871001: per buyer+listing duplicate; 871002: per-buyer hourly cap.
  PERFORM pg_advisory_xact_lock(
    871001,
    hashtext(NEW.buyer_id::text || ':' || NEW.listing_id::text)
  );
  PERFORM pg_advisory_xact_lock(
    871002,
    hashtext(NEW.buyer_id::text)
  );

  SELECT count(*)::integer
    INTO recent_count
    FROM public.listing_inquiries i
   WHERE i.buyer_id = NEW.buyer_id
     AND i.listing_id = NEW.listing_id
     AND i.created_at > now() - interval '15 minutes';

  IF recent_count > 0 THEN
    RAISE EXCEPTION 'QEX:duplicate_inquiry' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*)::integer
    INTO hourly_count
    FROM public.listing_inquiries i
   WHERE i.buyer_id = NEW.buyer_id
     AND i.created_at > now() - interval '1 hour';

  IF hourly_count >= 5 THEN
    RAISE EXCEPTION 'QEX:rate_limited' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listing_inquiries_assign_ownership_trigger ON public.listing_inquiries;
CREATE TRIGGER listing_inquiries_assign_ownership_trigger
  BEFORE INSERT ON public.listing_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.listing_inquiries_assign_ownership();

-- Narrow seller status transitions. No table UPDATE grant to authenticated.
CREATE OR REPLACE FUNCTION public.listing_inquiries_seller_set_status(
  inquiry_id uuid,
  next_status text
)
RETURNS TABLE (id uuid, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_row public.listing_inquiries%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'QEX:auth_required' USING ERRCODE = '42501';
  END IF;

  IF next_status IS DISTINCT FROM 'seen' AND next_status IS DISTINCT FROM 'closed' THEN
    RAISE EXCEPTION 'QEX:invalid_status' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
    INTO current_row
    FROM public.listing_inquiries i
   WHERE i.id = inquiry_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'QEX:not_found' USING ERRCODE = 'P0001';
  END IF;

  IF current_row.seller_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'QEX:forbidden' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.listings l
     WHERE l.id = current_row.listing_id
       AND l.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'QEX:forbidden' USING ERRCODE = '42501';
  END IF;

  IF current_row.status = 'closed' THEN
    RAISE EXCEPTION 'QEX:invalid_status' USING ERRCODE = 'P0001';
  END IF;

  IF next_status = 'seen' AND current_row.status IS DISTINCT FROM 'new' THEN
    RAISE EXCEPTION 'QEX:invalid_status' USING ERRCODE = 'P0001';
  END IF;

  IF next_status = 'closed' AND current_row.status NOT IN ('new', 'seen') THEN
    RAISE EXCEPTION 'QEX:invalid_status' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.listing_inquiries i
     SET status = next_status
   WHERE i.id = current_row.id
     AND i.seller_id = auth.uid()
  RETURNING i.id, i.status
    INTO id, status;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.listing_inquiries_seller_set_status(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.listing_inquiries_seller_set_status(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.listing_inquiries_seller_set_status(uuid, text) TO authenticated;

ALTER TABLE public.listing_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_inquiries FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.listing_inquiries FROM PUBLIC;
REVOKE ALL ON public.listing_inquiries FROM anon;
REVOKE ALL ON public.listing_inquiries FROM authenticated;
GRANT SELECT, INSERT ON public.listing_inquiries TO authenticated;
-- No GRANT UPDATE/DELETE to authenticated.

DROP POLICY IF EXISTS listing_inquiries_buyer_insert ON public.listing_inquiries;
CREATE POLICY listing_inquiries_buyer_insert
  ON public.listing_inquiries
  FOR INSERT
  TO authenticated
  WITH CHECK (buyer_id = auth.uid());

DROP POLICY IF EXISTS listing_inquiries_buyer_select_own ON public.listing_inquiries;
CREATE POLICY listing_inquiries_buyer_select_own
  ON public.listing_inquiries
  FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid());

DROP POLICY IF EXISTS listing_inquiries_seller_select ON public.listing_inquiries;
CREATE POLICY listing_inquiries_seller_select
  ON public.listing_inquiries
  FOR SELECT
  TO authenticated
  USING (
    seller_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.listings l
      WHERE l.id = listing_inquiries.listing_id
        AND l.user_id = auth.uid()
    )
  );

-- No anon policies. No public read. No authenticated UPDATE/DELETE policy.
-- HQ/admin read+manage uses service role (BYPASSRLS).
-- Seller status changes use listing_inquiries_seller_set_status.

COMMIT;
