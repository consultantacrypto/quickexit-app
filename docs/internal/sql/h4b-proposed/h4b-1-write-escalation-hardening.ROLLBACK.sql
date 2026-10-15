-- =============================================================================
-- H4B.1 ROLLBACK (MANUAL ONLY — DO NOT AUTO-RUN)
-- Restores pre-H4B.1 behavior by removing the two write-escalation guards.
-- NOT YET APPLIED TO PRODUCTION
--
-- Reverts:
--   - trigger + function profiles_protect_kyc_status
--   - trigger + function listings_protect_moderation_status
--
-- Does NOT:
--   - mutate row data
--   - restore any other policies
--   - affect offers/negotiations/Storage/leads/media/inquiries
--
-- Impact of rollback:
--   Authenticated owners can again self-set kyc_status and listings.admin_removed
--   if underlying RLS owner UPDATE policies remain permissive (pre-H4B.1 surface).
--
-- Data migration: none
-- =============================================================================

BEGIN;

DROP TRIGGER IF EXISTS profiles_protect_kyc_status ON public.profiles;
DROP FUNCTION IF EXISTS public.profiles_protect_kyc_status();

DROP TRIGGER IF EXISTS listings_protect_moderation_status ON public.listings;
DROP FUNCTION IF EXISTS public.listings_protect_moderation_status();

COMMIT;
