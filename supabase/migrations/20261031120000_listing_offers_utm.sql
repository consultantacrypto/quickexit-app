-- Listing offer UTM attribution (Shorts → offer).
-- Nullable jsonb. Existing INSERT policies only check buyer_user_id
-- (anon: IS NULL, authenticated: = auth.uid()), so this column does not
-- require a policy change and anon insert remains allowed.
-- Idempotent. Safe if the column is already present.

BEGIN;

ALTER TABLE public.listing_offers
  ADD COLUMN IF NOT EXISTS utm jsonb;

COMMENT ON COLUMN public.listing_offers.utm IS
  'Optional marketing attribution captured at offer submit. Keys: utm_source, utm_medium, utm_campaign, utm_content, utm_term.';

COMMIT;
