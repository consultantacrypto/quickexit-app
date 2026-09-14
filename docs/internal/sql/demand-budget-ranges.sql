-- QuickExit demands: declared buyer budget range (EUR major units)
-- LOCAL / STAGING FIRST. Do not apply to Production from an unverified session.
-- Additive only. Does not change listings, demand_offers, Stripe, RLS, or grants.
-- Independent from listing sale prices and checkout activation.
--
-- Transactional: run the entire file in one session (BEGIN … COMMIT).
-- Repeatable: ADD COLUMN IF NOT EXISTS + catalog checks before ADD CONSTRAINT.
-- Destructive ops: none (no DROP, no TRUNCATE, no backfill).
--
-- Rollback (manual, after this file has been applied):
--   BEGIN;
--   ALTER TABLE public.demands DROP CONSTRAINT IF EXISTS demands_budget_min_range;
--   ALTER TABLE public.demands DROP CONSTRAINT IF EXISTS demands_budget_whole_units;
--   ALTER TABLE public.demands DROP CONSTRAINT IF EXISTS demands_budget_ceiling;
--   ALTER TABLE public.demands DROP CONSTRAINT IF EXISTS demands_budget_positive;
--   ALTER TABLE public.demands DROP COLUMN IF EXISTS budget_min;
--   COMMIT;
-- listings, demand_offers, and Stripe objects are unchanged.

BEGIN;

ALTER TABLE public.demands
  ADD COLUMN IF NOT EXISTS budget_min numeric;

COMMENT ON COLUMN public.demands.budget_min IS
  'Minimum declared buyer budget in EUR major units (whole numbers, not cents). NULL on legacy rows. New requests store both budget_min and budget (the existing maximum).';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'demands'
      AND c.conname = 'demands_budget_positive'
  ) THEN
    ALTER TABLE public.demands
      ADD CONSTRAINT demands_budget_positive
      CHECK (budget > 0);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'demands'
      AND c.conname = 'demands_budget_ceiling'
  ) THEN
    ALTER TABLE public.demands
      ADD CONSTRAINT demands_budget_ceiling
      CHECK (budget <= 100000000);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'demands'
      AND c.conname = 'demands_budget_whole_units'
  ) THEN
    ALTER TABLE public.demands
      ADD CONSTRAINT demands_budget_whole_units
      CHECK (budget = trunc(budget));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'demands'
      AND c.conname = 'demands_budget_min_range'
  ) THEN
    ALTER TABLE public.demands
      ADD CONSTRAINT demands_budget_min_range
      CHECK (
        budget_min IS NULL
        OR (
          budget_min > 0
          AND budget_min <= 100000000
          AND budget_min = trunc(budget_min)
          AND budget_min <= budget
        )
      );
  END IF;
END
$$;

COMMIT;
