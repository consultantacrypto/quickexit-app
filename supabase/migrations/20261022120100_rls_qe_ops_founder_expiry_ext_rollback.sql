-- =============================================================================
-- Lock down public.qe_ops_founder_expiry_ext_20261120_rollback
-- NOT applied by this PR. Do not run it from CI.
--
-- The table was observed with RLS off, so the anon key could read and write it.
-- If the table is unused, prefer dropping it instead of applying this file:
--
--   DROP TABLE IF EXISTS public.qe_ops_founder_expiry_ext_20261120_rollback;
--
-- This migration only runs the lock when the table exists. With RLS enabled and
-- no policies, anon and authenticated lose access. service_role still bypasses RLS.
-- =============================================================================

DO $$
BEGIN
  IF to_regclass('public.qe_ops_founder_expiry_ext_20261120_rollback') IS NULL THEN
    RAISE NOTICE 'qe_ops_founder_expiry_ext_20261120_rollback does not exist; nothing to lock. Drop this migration if the table was never created, or DROP the table if it is unused.';
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE public.qe_ops_founder_expiry_ext_20261120_rollback ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.qe_ops_founder_expiry_ext_20261120_rollback FORCE ROW LEVEL SECURITY';
  EXECUTE 'REVOKE ALL ON TABLE public.qe_ops_founder_expiry_ext_20261120_rollback FROM PUBLIC, anon, authenticated';
END $$;
