-- Anonymous Shorts / UTM listing visits and later conversions.
-- Append-only. No IP and no PII.
-- Apply manually after review. This migration is not applied by the app deploy.
-- service_role (BYPASSRLS) is the only writer. anon and authenticated have no policies.

BEGIN;

CREATE TABLE IF NOT EXISTS public.listing_traffic_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  conversion text,
  session_id text NOT NULL,
  path text NOT NULL,
  listing_id text NOT NULL,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listing_traffic_events_event_type_check
    CHECK (event_type IN ('pageview', 'lead')),
  CONSTRAINT listing_traffic_events_conversion_check
    CHECK (
      (event_type = 'pageview' AND conversion IS NULL)
      OR (event_type = 'lead' AND conversion IN ('offer', 'inquiry', 'financing'))
    ),
  CONSTRAINT listing_traffic_events_session_id_check
    CHECK (
      session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    ),
  CONSTRAINT listing_traffic_events_path_check
    CHECK (path ~ '^/(ro|en)/anunt/[A-Za-z0-9_-]{1,80}$'),
  CONSTRAINT listing_traffic_events_listing_id_check
    CHECK (
      char_length(listing_id) BETWEEN 1 AND 80
      AND listing_id ~ '^[A-Za-z0-9_-]+$'
    ),
  CONSTRAINT listing_traffic_events_utm_len_check
    CHECK (
      (utm_source IS NULL OR char_length(utm_source) <= 120)
      AND (utm_medium IS NULL OR char_length(utm_medium) <= 120)
      AND (utm_campaign IS NULL OR char_length(utm_campaign) <= 120)
      AND (utm_content IS NULL OR char_length(utm_content) <= 120)
      AND (utm_term IS NULL OR char_length(utm_term) <= 120)
    ),
  CONSTRAINT listing_traffic_events_referrer_len_check
    CHECK (referrer IS NULL OR char_length(referrer) <= 200)
);

COMMENT ON TABLE public.listing_traffic_events IS
  'Append-only anonymous listing visits and conversions from utm landing pages. No IP and no PII.';

CREATE INDEX IF NOT EXISTS listing_traffic_events_dedup_idx
  ON public.listing_traffic_events (session_id, path, event_type, conversion, created_at DESC);

CREATE INDEX IF NOT EXISTS listing_traffic_events_created_at_idx
  ON public.listing_traffic_events (created_at DESC);

ALTER TABLE public.listing_traffic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_traffic_events FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.listing_traffic_events FROM PUBLIC;
REVOKE ALL ON TABLE public.listing_traffic_events FROM anon;
REVOKE ALL ON TABLE public.listing_traffic_events FROM authenticated;

GRANT SELECT, INSERT ON TABLE public.listing_traffic_events TO service_role;

COMMIT;
