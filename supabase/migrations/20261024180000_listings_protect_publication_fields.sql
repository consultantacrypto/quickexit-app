-- =============================================================================
-- Listings publication authorization guard (security hotfix)
-- Blocks ordinary authenticated/anon writers from unpaid public activation and
-- from forging expires_at / is_seed / paid. Trusted HQ + Stripe use service_role
-- (jwt role not in authenticated|anon) and bypass this guard — same pattern as
-- listings_protect_rank_columns / listings_guard_inventory_classification.
--
-- Does NOT use email, paid, or user JWT claims as admin authority.
-- Staging-first. Do not apply to Production until Staging matrix PASS.
--
-- Rollback: docs/internal/sql/h4b-proposed/listings-protect-publication-fields.ROLLBACK.sql
-- =============================================================================

BEGIN;

-- Safer default for inserts that omit status (Production previously defaulted active).
ALTER TABLE public.listings
  ALTER COLUMN status SET DEFAULT 'pending_payment';

CREATE OR REPLACE FUNCTION public.listings_protect_publication_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  jwt_role text;
  new_json jsonb;
  old_json jsonb;
  new_paid boolean;
  old_paid boolean;
BEGIN
  jwt_role := COALESCE(auth.jwt() ->> 'role', '');

  -- service_role / postgres / other trusted roles: allow HQ Force Publish,
  -- Force Activate, Stripe webhook, Admin Bump RPC path, seed scripts.
  IF jwt_role NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  new_json := to_jsonb(NEW);
  IF TG_OP = 'UPDATE' THEN
    old_json := to_jsonb(OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'pending_payment' THEN
      RAISE EXCEPTION 'QEX:publication_forbidden'
        USING ERRCODE = '42501',
              DETAIL = 'authenticated insert status must be pending_payment';
    END IF;

    IF COALESCE(NEW.is_seed, false) IS DISTINCT FROM false THEN
      RAISE EXCEPTION 'QEX:publication_forbidden'
        USING ERRCODE = '42501',
              DETAIL = 'authenticated insert cannot set is_seed';
    END IF;

    IF NEW.expires_at IS NOT NULL THEN
      RAISE EXCEPTION 'QEX:publication_forbidden'
        USING ERRCODE = '42501',
              DETAIL = 'authenticated insert cannot set expires_at';
    END IF;

    IF new_json ? 'paid' THEN
      new_paid := COALESCE((new_json ->> 'paid')::boolean, false);
      IF new_paid IS DISTINCT FROM false THEN
        RAISE EXCEPTION 'QEX:publication_forbidden'
          USING ERRCODE = '42501',
                DETAIL = 'authenticated insert cannot set paid';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- UPDATE: lock commercial / publication fields for ordinary users.
  IF NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
    RAISE EXCEPTION 'QEX:publication_forbidden'
      USING ERRCODE = '42501',
            DETAIL = 'authenticated update cannot change expires_at';
  END IF;

  IF NEW.is_seed IS DISTINCT FROM OLD.is_seed THEN
    RAISE EXCEPTION 'QEX:publication_forbidden'
      USING ERRCODE = '42501',
            DETAIL = 'authenticated update cannot change is_seed';
  END IF;

  IF (new_json ? 'paid') AND (old_json ? 'paid') THEN
    new_paid := (new_json ->> 'paid')::boolean;
    old_paid := (old_json ->> 'paid')::boolean;
    IF new_paid IS DISTINCT FROM old_paid THEN
      RAISE EXCEPTION 'QEX:publication_forbidden'
        USING ERRCODE = '42501',
              DETAIL = 'authenticated update cannot change paid';
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Legitimate pause.
    IF OLD.status = 'active' AND NEW.status = 'suspended' THEN
      RETURN NEW;
    END IF;

    -- Legitimate resume only with an unexpired paid/HQ window already on the row.
    -- Blocks pending_payment → suspended → active (and other unpaid bypasses).
    IF OLD.status = 'suspended' AND NEW.status = 'active' THEN
      IF OLD.expires_at IS NOT NULL AND OLD.expires_at > now() THEN
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'QEX:publication_forbidden'
        USING ERRCODE = '42501',
              DETAIL = 'authenticated resume requires unexpired expires_at';
    END IF;

    -- Owner mark sold.
    IF OLD.status IN ('active', 'suspended') AND NEW.status = 'sold' THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'QEX:publication_forbidden'
      USING ERRCODE = '42501',
            DETAIL = format(
              'authenticated status transition %s → %s forbidden',
              OLD.status,
              NEW.status
            );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.listings_protect_publication_fields() IS
  'Blocks authenticated/anon unpaid publication and forged paid/expiry/seed fields. HQ/Stripe use service_role.';

DROP TRIGGER IF EXISTS listings_protect_publication_fields ON public.listings;
CREATE TRIGGER listings_protect_publication_fields
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.listings_protect_publication_fields();

COMMIT;
