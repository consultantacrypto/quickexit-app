-- QuickExit AI Lead Agent V0 — database schema
-- Run manually in Supabase SQL Editor. Do not commit service role keys.
-- Access: service-role only via admin-gated API routes (app/api/hq/leads).

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_type text NOT NULL CHECK (lead_type IN ('seller', 'buyer', 'connector')),
  campaign_key text,
  language text NOT NULL DEFAULT 'ro',
  preferred_channel text,
  full_name text,
  company text,
  phone text,
  email text,
  linkedin_url text,
  source text NOT NULL DEFAULT 'manual',
  source_url text,
  data_source_note text,
  legal_basis text NOT NULL DEFAULT 'legitimate_interest',
  category text,
  asset_summary text,
  asset_location text,
  est_value_eur numeric,
  status text NOT NULL DEFAULT 'new' CHECK (
    status IN (
      'new',
      'reviewed',
      'contacted',
      'responded',
      'qualified',
      'call_scheduled',
      'converted',
      'lost',
      'archived'
    )
  ),
  ai_score int CHECK (ai_score IS NULL OR (ai_score >= 0 AND ai_score <= 100)),
  ai_score_reason text,
  next_action text,
  next_action_at timestamptz,
  notes text,
  owner_email text,
  delete_requested boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_status_idx ON public.leads (status);
CREATE INDEX IF NOT EXISTS leads_campaign_key_idx ON public.leads (campaign_key);
CREATE INDEX IF NOT EXISTS leads_lead_type_idx ON public.leads (lead_type);
CREATE INDEX IF NOT EXISTS leads_category_idx ON public.leads (category);
CREATE INDEX IF NOT EXISTS leads_next_action_at_idx ON public.leads (next_action_at);

-- ---------------------------------------------------------------------------
-- lead_messages (V0: manual entries only; AI generation in Phase 3)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads (id) ON DELETE CASCADE,
  channel text NOT NULL,
  direction text NOT NULL DEFAULT 'outbound',
  body text NOT NULL,
  generated_by_ai boolean NOT NULL DEFAULT false,
  model text,
  approved_by text,
  copied_at timestamptz,
  sent_manually_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_messages_lead_id_idx ON public.lead_messages (lead_id);

-- ---------------------------------------------------------------------------
-- lead_events (activity log)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb,
  actor_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_events_lead_id_created_at_idx
  ON public.lead_events (lead_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- updated_at trigger for leads
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.leads_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_updated_at_trigger ON public.leads;
CREATE TRIGGER leads_updated_at_trigger
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.leads_set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — deny all for anon + authenticated
-- Service role bypasses RLS; all app access goes through admin API routes.
-- ---------------------------------------------------------------------------
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;

-- Intentionally no policies: anon/authenticated cannot SELECT/INSERT/UPDATE/DELETE.
-- Verify after apply: anon client .from('leads').select() must return permission error.
