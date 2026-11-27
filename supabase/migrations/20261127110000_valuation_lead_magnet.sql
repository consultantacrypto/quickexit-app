-- Free car valuation lead magnet.
-- NOT APPLIED by this change. Review, then run manually in Supabase.
-- Do not apply from the app, from CI, or against Production as part of the deploy.
--
-- Stores the inputs and the asking-price range. Email is optional and is
-- written only together with consent + a leads row (campaign free_car_valuation).
-- service_role only. No policies: anon and authenticated have no grants.
--
-- Erasure: DELETE the valuation_requests row first (lead_id is ON DELETE
-- RESTRICT), then DELETE the lead. The email is not written anywhere else
-- by this feature.

BEGIN;

CREATE TABLE IF NOT EXISTS public.valuation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  km integer NOT NULL,
  equipment text,
  normalized_make text NOT NULL,
  normalized_model text NOT NULL,
  p25 numeric,
  p50 numeric,
  p75 numeric,
  comparable_count integer NOT NULL,
  tier smallint,
  tier_label text,
  sufficient boolean NOT NULL,
  email text,
  consent boolean NOT NULL DEFAULT false,
  consent_version text,
  consent_at timestamptz,
  lead_id uuid,
  purpose text,
  CONSTRAINT valuation_requests_make_len_check
    CHECK (char_length(make) BETWEEN 1 AND 80),
  CONSTRAINT valuation_requests_model_len_check
    CHECK (char_length(model) BETWEEN 1 AND 80),
  CONSTRAINT valuation_requests_normalized_make_len_check
    CHECK (char_length(normalized_make) BETWEEN 1 AND 80),
  CONSTRAINT valuation_requests_normalized_model_len_check
    CHECK (char_length(normalized_model) BETWEEN 1 AND 80),
  CONSTRAINT valuation_requests_year_check
    CHECK (year BETWEEN 1950 AND 2100),
  CONSTRAINT valuation_requests_km_check
    CHECK (km BETWEEN 0 AND 2000000),
  CONSTRAINT valuation_requests_equipment_len_check
    CHECK (equipment IS NULL OR char_length(equipment) <= 500),
  CONSTRAINT valuation_requests_tier_check
    CHECK (tier IS NULL OR tier IN (1, 2, 3)),
  CONSTRAINT valuation_requests_tier_label_len_check
    CHECK (tier_label IS NULL OR char_length(tier_label) <= 120),
  CONSTRAINT valuation_requests_count_check
    CHECK (comparable_count >= 0),
  CONSTRAINT valuation_requests_email_len_check
    CHECK (email IS NULL OR char_length(email) <= 200),
  CONSTRAINT valuation_requests_consent_version_len_check
    CHECK (consent_version IS NULL OR char_length(consent_version) <= 80),
  CONSTRAINT valuation_requests_purpose_check
    CHECK (purpose IS NULL OR purpose IN ('report', 'notify')),
  CONSTRAINT valuation_requests_prices_check
    CHECK (
      (
        sufficient = false
        AND tier IS NULL
        AND p25 IS NULL
        AND p50 IS NULL
        AND p75 IS NULL
      )
      OR (
        sufficient = true
        AND tier IN (1, 2, 3)
        AND p25 IS NOT NULL
        AND p50 IS NOT NULL
        AND p75 IS NOT NULL
        AND p25 <= p50
        AND p50 <= p75
      )
    ),
  CONSTRAINT valuation_requests_email_consent_check
    CHECK (
      (
        email IS NULL
        AND consent = false
        AND consent_version IS NULL
        AND consent_at IS NULL
        AND lead_id IS NULL
        AND purpose IS NULL
      )
      OR (
        email IS NOT NULL
        AND consent = true
        AND consent_version IS NOT NULL
        AND consent_at IS NOT NULL
        AND lead_id IS NOT NULL
        AND purpose IN ('report', 'notify')
      )
    ),
  CONSTRAINT valuation_requests_lead_id_fkey
    FOREIGN KEY (lead_id) REFERENCES public.leads (id) ON DELETE RESTRICT
);

COMMENT ON TABLE public.valuation_requests IS
  'Free car valuation requests. Asking-price range from QuickExit listings. service_role only. Email is optional and requires consent.';

COMMENT ON COLUMN public.valuation_requests.purpose IS
  'Email purpose chosen with consent: report (send the range) or notify (tell them when enough comparables exist). Null when no email was left.';

CREATE INDEX IF NOT EXISTS valuation_requests_created_at_idx
  ON public.valuation_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS valuation_requests_lead_id_idx
  ON public.valuation_requests (lead_id);

CREATE INDEX IF NOT EXISTS valuation_requests_email_created_at_idx
  ON public.valuation_requests (email, created_at DESC)
  WHERE email IS NOT NULL;

ALTER TABLE public.valuation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valuation_requests FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.valuation_requests FROM PUBLIC;
REVOKE ALL ON TABLE public.valuation_requests FROM anon;
REVOKE ALL ON TABLE public.valuation_requests FROM authenticated;

GRANT SELECT, INSERT, DELETE ON TABLE public.valuation_requests TO service_role;

COMMIT;
