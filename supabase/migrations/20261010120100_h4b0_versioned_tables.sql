-- =============================================================================
-- H4B.0 LOCAL — apply versioned Media / Inquiries / Leads table definitions
-- Sourced from docs/internal/sql/*.sql (project-consistent). NOT Production apply.
-- DO NOT APPLY TO PRODUCTION from this migration path without review.
-- =============================================================================

-- seller_contacts
CREATE TABLE IF NOT EXISTS public.seller_contacts (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  phone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seller_contacts_phone_len
    CHECK (char_length(phone) BETWEEN 8 AND 20)
);

-- listing_inquiries (security-relevant columns from versioned SQL + Prod inventory)
CREATE TABLE IF NOT EXISTS public.listing_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings (id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  buyer_phone text NOT NULL,
  message text,
  consent_version text NOT NULL DEFAULT '2026-08',
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'seen', 'closed', 'hq_handling')),
  notification_status text NOT NULL DEFAULT 'pending',
  notification_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listing_inquiries_not_self CHECK (buyer_id <> seller_id)
);

-- media_orders (from docs/internal/sql/media-orders.sql — column subset for RLS tests)
CREATE TABLE IF NOT EXISTS public.media_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  package text NOT NULL CHECK (package IN ('stories_4', 'stories_8', 'featured')),
  listing_value_eur_snapshot numeric NOT NULL CHECK (listing_value_eur_snapshot > 0),
  value_tier text NOT NULL CHECK (value_tier IN ('under_50k', '50k_100k', '100k_500k', 'over_500k')),
  amount_ron integer NOT NULL CHECK (amount_ron > 0),
  currency text NOT NULL DEFAULT 'ron' CHECK (currency = 'ron'),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  editorial_status text NOT NULL DEFAULT 'queued',
  locale text,
  source text NOT NULL DEFAULT 'publish_checkout'
    CHECK (source IN ('publish_checkout', 'post_publish')),
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  fulfilled_at timestamptz,
  refunded_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- leads / lead_messages / lead_events (from lead-agent-v0.sql — security surface)
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_type text NOT NULL CHECK (lead_type IN ('seller', 'buyer', 'connector')),
  campaign_key text,
  language text NOT NULL DEFAULT 'ro',
  full_name text,
  phone text,
  email text,
  source text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'new',
  notes text,
  owner_email text,
  delete_requested boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lead_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads (id) ON DELETE CASCADE,
  direction text,
  channel text,
  body text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads (id) ON DELETE CASCADE,
  event_type text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
