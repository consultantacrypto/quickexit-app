-- QuickExit Phase 2A — listing inquiries (local only; do not apply remotely from this stage)
-- Buyer inquiries are private. No public SELECT. Service role bypasses RLS for HQ/notify.

-- ---------------------------------------------------------------------------
-- profiles.phone (private; never selected on public seller context)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text;

-- ---------------------------------------------------------------------------
-- listing_inquiries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listing_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  buyer_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  buyer_phone text NOT NULL,
  message text,
  notification_status text NOT NULL DEFAULT 'pending'
    CHECK (
      notification_status IN (
        'pending',
        'sent',
        'failed',
        'skipped_no_provider',
        'skipped_disabled'
      )
    ),
  notified_at timestamptz,
  hq_fallback_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listing_inquiries_listing_id_idx
  ON public.listing_inquiries (listing_id, created_at DESC);

CREATE INDEX IF NOT EXISTS listing_inquiries_buyer_user_id_idx
  ON public.listing_inquiries (buyer_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS listing_inquiries_notification_status_idx
  ON public.listing_inquiries (notification_status, created_at DESC);

CREATE OR REPLACE FUNCTION public.listing_inquiries_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listing_inquiries_updated_at_trigger ON public.listing_inquiries;
CREATE TRIGGER listing_inquiries_updated_at_trigger
  BEFORE UPDATE ON public.listing_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.listing_inquiries_set_updated_at();

ALTER TABLE public.listing_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS listing_inquiries_buyer_insert ON public.listing_inquiries;
CREATE POLICY listing_inquiries_buyer_insert
  ON public.listing_inquiries
  FOR INSERT
  TO authenticated
  WITH CHECK (buyer_user_id = auth.uid());

DROP POLICY IF EXISTS listing_inquiries_buyer_select_own ON public.listing_inquiries;
CREATE POLICY listing_inquiries_buyer_select_own
  ON public.listing_inquiries
  FOR SELECT
  TO authenticated
  USING (buyer_user_id = auth.uid());

DROP POLICY IF EXISTS listing_inquiries_seller_select ON public.listing_inquiries;
CREATE POLICY listing_inquiries_seller_select
  ON public.listing_inquiries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.listings l
      WHERE l.id = listing_inquiries.listing_id
        AND l.user_id = auth.uid()
    )
  );

-- No anon policies. No public read. HQ uses service role.
