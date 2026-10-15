-- Rollback for supabase/migrations/20261015200000_wallet_identity_bind.sql
-- MANUAL ONLY. Drops Phase 1C wallet bind tables/policies.
-- Does NOT touch auth.users, profiles, KYC, ownership tables.

BEGIN;

DROP POLICY IF EXISTS wallet_addresses_select_own ON public.wallet_addresses;

DROP TABLE IF EXISTS public.wallet_nonces;
DROP TABLE IF EXISTS public.wallet_addresses;

COMMIT;
