-- Inquiry-specific listings fixture for disposable local Supabase only.
-- This is NOT a production listings schema. It exists so listing_inquiries
-- foreign keys and eligibility checks can run against Auth users.
-- Columns: id, user_id, title, status, is_seed, expires_at, created_at.

CREATE TABLE IF NOT EXISTS public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  title text NOT NULL,
  status text NOT NULL,
  is_seed boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.listings IS
  'Inquiry local-test fixture only; not the production listings contract.';
