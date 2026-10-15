-- =============================================================================
-- Phase 1A — Identity Foundation: auto-provision public.profiles on auth.users
-- Idempotent. Does NOT set KYC verified, HQ, or any privileged defaults.
-- Rollback: docs/internal/sql/h4b-proposed/auth-profile-auto-provision.ROLLBACK.sql
-- =============================================================================

BEGIN;

-- Insert only id (+ table defaults). Never overwrite existing profile rows.
-- SECURITY DEFINER required so the auth.users trigger can insert into public.profiles
-- under RLS. Fixed search_path prevents privilege escalation via search_path hijack.
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user_profile() IS
  'Phase 1A: idempotent profiles row for each auth.users insert; no KYC/HQ elevation';

REVOKE ALL ON FUNCTION public.handle_new_user_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user_profile() TO postgres, service_role;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

COMMIT;
