-- =============================================================================
-- NOT APPLIED.
-- Do not run this file against production or staging.
-- No INSERT. No seed. No remote write is performed by this pull request.
-- The preview catalog is the typed file lib/walletCatalog.ts.
-- Apply only after a separate publication GO, and never as part of this PR.
-- Production project quickexit-db (geywuzwbzecknokvnins) must not receive it
-- from this change. Preview may point at that database; this file is review-only.
-- =============================================================================
--
-- wallet_products: recommendation catalog. Not listings. Quick Exit does not
-- hold stock and does not sell the devices.
-- wallet_affiliate_events: append-only, no IP, no email, no user id.
-- service_role is the only writer. anon and authenticated have no policies.

BEGIN;

CREATE TABLE IF NOT EXISTS public.wallet_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  brand text NOT NULL,
  model text NOT NULL,
  device_type text NOT NULL,
  tier text NOT NULL,
  list_price numeric,
  list_price_max numeric,
  price_is_from boolean NOT NULL DEFAULT false,
  compare_at_price numeric,
  currency char(3),
  secondary_amount numeric,
  secondary_currency char(3),
  price_checked_at date,
  price_source_url text,
  price_status text NOT NULL,
  official_url text NOT NULL,
  image_url text,
  image_license_note text,
  affiliate_url text,
  affiliate_code text,
  checkout_code_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wallet_products_device_type_check
    CHECK (device_type IN ('card', 'device', 'airgap')),
  CONSTRAINT wallet_products_tier_check
    CHECK (tier IN ('entry', 'mid', 'premium')),
  CONSTRAINT wallet_products_price_status_check
    CHECK (price_status IN ('verified', 'unverified')),
  CONSTRAINT wallet_products_currency_check
    CHECK (currency IS NULL OR currency IN ('EUR', 'USD', 'RON')),
  CONSTRAINT wallet_products_secondary_currency_check
    CHECK (secondary_currency IS NULL OR secondary_currency IN ('EUR', 'USD', 'RON')),
  CONSTRAINT wallet_products_verified_price_check
    CHECK (
      (price_status = 'unverified' AND list_price IS NULL AND list_price_max IS NULL AND compare_at_price IS NULL)
      OR (price_status = 'verified' AND list_price IS NOT NULL AND currency IS NOT NULL)
    ),
  CONSTRAINT wallet_products_price_bounds_check
    CHECK (
      (list_price IS NULL OR list_price >= 0)
      AND (compare_at_price IS NULL OR compare_at_price >= 0)
      AND (
        list_price_max IS NULL
        OR (list_price IS NOT NULL AND list_price_max >= list_price)
      )
    ),
  CONSTRAINT wallet_products_slug_check
    CHECK (slug ~ '^[a-z0-9-]{1,80}$'),
  CONSTRAINT wallet_products_official_url_check
    CHECK (official_url ~ '^https://'),
  CONSTRAINT wallet_products_affiliate_url_check
    CHECK (
      affiliate_url IS NULL
      OR affiliate_url = 'TANGEM_PARTNER_LINK'
      OR affiliate_url ~ '^PENDING:[a-z0-9-]{1,40}$'
      OR affiliate_url ~ '^https://[^[:space:]]+$'
    ),
  CONSTRAINT wallet_products_affiliate_code_check
    CHECK (affiliate_code IS NULL OR char_length(affiliate_code) BETWEEN 1 AND 64)
);

COMMENT ON TABLE public.wallet_products IS
  'Hardware-wallet recommendation catalog. Not listings. Unpublished until a separate GO. NOT APPLIED by this PR.';

CREATE INDEX IF NOT EXISTS wallet_products_sort_idx
  ON public.wallet_products (published, sort_order);

ALTER TABLE public.wallet_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_products FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.wallet_products FROM PUBLIC;
REVOKE ALL ON TABLE public.wallet_products FROM anon;
REVOKE ALL ON TABLE public.wallet_products FROM authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.wallet_products TO service_role;

CREATE TABLE IF NOT EXISTS public.wallet_affiliate_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  session_id text NOT NULL,
  path text NOT NULL,
  brand text,
  product_slug text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wallet_affiliate_events_event_type_check
    CHECK (event_type IN ('pageview', 'click')),
  CONSTRAINT wallet_affiliate_events_session_id_check
    CHECK (
      session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    ),
  CONSTRAINT wallet_affiliate_events_path_check
    CHECK (path ~ '^/(ro|en)/wallets(/[a-z0-9-]{1,80})?$'),
  CONSTRAINT wallet_affiliate_events_brand_check
    CHECK (brand IS NULL OR brand ~ '^[a-z0-9-]{1,40}$'),
  CONSTRAINT wallet_affiliate_events_product_slug_check
    CHECK (product_slug IS NULL OR product_slug ~ '^[a-z0-9-]{1,80}$'),
  CONSTRAINT wallet_affiliate_events_shape_check
    CHECK (
      event_type = 'pageview'
      OR (
        event_type = 'click'
        AND brand IS NOT NULL
        AND product_slug IS NOT NULL
      )
    ),
  CONSTRAINT wallet_affiliate_events_utm_len_check
    CHECK (
      (utm_source IS NULL OR char_length(utm_source) <= 120)
      AND (utm_medium IS NULL OR char_length(utm_medium) <= 120)
      AND (utm_campaign IS NULL OR char_length(utm_campaign) <= 120)
      AND (utm_content IS NULL OR char_length(utm_content) <= 120)
      AND (utm_term IS NULL OR char_length(utm_term) <= 120)
    ),
  CONSTRAINT wallet_affiliate_events_referrer_len_check
    CHECK (referrer IS NULL OR char_length(referrer) <= 200)
);

COMMENT ON TABLE public.wallet_affiliate_events IS
  'Append-only anonymous wallet catalog pageviews and outbound clicks. No IP and no PII. Destination URL is not stored. NOT APPLIED by this PR.';

CREATE INDEX IF NOT EXISTS wallet_affiliate_events_dedup_idx
  ON public.wallet_affiliate_events (session_id, path, event_type, brand, product_slug, created_at DESC);

CREATE INDEX IF NOT EXISTS wallet_affiliate_events_created_at_idx
  ON public.wallet_affiliate_events (created_at DESC);

ALTER TABLE public.wallet_affiliate_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_affiliate_events FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.wallet_affiliate_events FROM PUBLIC;
REVOKE ALL ON TABLE public.wallet_affiliate_events FROM anon;
REVOKE ALL ON TABLE public.wallet_affiliate_events FROM authenticated;

GRANT SELECT, INSERT ON TABLE public.wallet_affiliate_events TO service_role;

COMMIT;
