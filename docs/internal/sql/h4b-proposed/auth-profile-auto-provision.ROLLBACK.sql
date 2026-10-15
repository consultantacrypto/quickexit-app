-- Rollback for supabase/migrations/20261015180000_auth_profile_auto_provision.sql
-- Safe to run: removes trigger + function only. Does NOT delete profiles rows.

BEGIN;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_profile();

COMMIT;
