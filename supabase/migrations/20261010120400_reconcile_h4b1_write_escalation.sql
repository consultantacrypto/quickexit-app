-- =============================================================================
-- H4B.1 — canonical write-escalation hardening (Production-applied 2026-10-10)
-- Source: docs/internal/sql/h4b-proposed/h4b-1-write-escalation-hardening.sql
-- Idempotent. Demands.suspended intentionally unchanged.
-- Rollback artifact: docs/internal/sql/h4b-proposed/h4b-1-write-escalation-hardening.ROLLBACK.sql
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.profiles_protect_kyc_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.kyc_status IS DISTINCT FROM OLD.kyc_status
     AND coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'kyc_status is server-controlled'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.profiles_protect_kyc_status() IS
  'H4B.1: reject non-service-role changes to profiles.kyc_status';

DROP TRIGGER IF EXISTS profiles_protect_kyc_status ON public.profiles;
CREATE TRIGGER profiles_protect_kyc_status
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_protect_kyc_status();

CREATE OR REPLACE FUNCTION public.listings_protect_moderation_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status = 'admin_removed'
     AND coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'listings.status admin_removed is moderation-only'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.listings_protect_moderation_status() IS
  'H4B.1: reject non-service-role transition to listings.status = admin_removed';

DROP TRIGGER IF EXISTS listings_protect_moderation_status ON public.listings;
CREATE TRIGGER listings_protect_moderation_status
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.listings_protect_moderation_status();

COMMIT;
