-- =============================================================================
-- Listing offer stats trigger — exact Production bodies (exported 2026-10-14)
-- Functions: recalculate_listing_offer_stats, trg_listing_offers_refresh_stats
-- Trigger: listing_offers_stats_refresh AFTER INSERT OR DELETE OR UPDATE
-- Idempotent. FRESH_DATABASE + EXISTING_PRODUCTION safe (CREATE OR REPLACE).
-- Source: Phase 4B.2 read-only Production catalog export.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.recalculate_listing_offer_stats(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
  v_max numeric;
  v_last timestamptz;
BEGIN
  SELECT
    COUNT(*)::integer,
    MAX(lo.offer_price),
    MAX(lo.created_at)
  INTO v_count, v_max, v_last
  FROM public.listing_offers AS lo
  WHERE lo.listing_id = p_listing_id
    AND lo.status IN ('new', 'accepted', 'accepted_exit_price');

  UPDATE public.listings AS l
  SET
    offer_count = COALESCE(v_count, 0),
    highest_offer = v_max,
    last_offer_at = v_last
  WHERE l.id = p_listing_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_listing_offers_refresh_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_listing_offer_stats(OLD.listing_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.listing_id IS DISTINCT FROM NEW.listing_id THEN
      PERFORM public.recalculate_listing_offer_stats(OLD.listing_id);
      PERFORM public.recalculate_listing_offer_stats(NEW.listing_id);
    ELSE
      PERFORM public.recalculate_listing_offer_stats(NEW.listing_id);
    END IF;
    RETURN NEW;
  ELSE
    PERFORM public.recalculate_listing_offer_stats(NEW.listing_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS listing_offers_stats_refresh ON public.listing_offers;
CREATE TRIGGER listing_offers_stats_refresh
  AFTER INSERT OR DELETE OR UPDATE ON public.listing_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_listing_offers_refresh_stats();

COMMIT;
