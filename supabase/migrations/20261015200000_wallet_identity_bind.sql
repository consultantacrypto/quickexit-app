-- =============================================================================
-- Phase 1C — Wallet bind / SIWE identity (EVM address ownership proof)
-- Additive only. Does NOT touch KYC, HQ, ownership FKs, or auth.users login.
-- Address normalization: store EIP-55 checksummed; uniqueness on lower(address).
-- Rollback: docs/internal/sql/h4b-proposed/wallet-identity-bind.ROLLBACK.sql
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- wallet_addresses — connected EVM wallets bound to auth.users.id
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallet_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  address text NOT NULL,
  chain_family text NOT NULL DEFAULT 'evm',
  last_seen_chain_id integer NULL,
  verified_at timestamptz NOT NULL,
  last_proof_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wallet_addresses_chain_family_check CHECK (chain_family = 'evm'),
  CONSTRAINT wallet_addresses_address_format CHECK (address ~ '^0x[0-9a-fA-F]{40}$')
);

COMMENT ON TABLE public.wallet_addresses IS
  'Phase 1C: EVM wallet ownership proof bound to QuickExit UUID. Not login, KYC, or POF.';

COMMENT ON COLUMN public.wallet_addresses.address IS
  'EIP-55 checksummed; uniqueness enforced via lower(address) unique index.';

CREATE UNIQUE INDEX IF NOT EXISTS wallet_addresses_chain_family_address_uidx
  ON public.wallet_addresses (chain_family, lower(address));

CREATE INDEX IF NOT EXISTS wallet_addresses_user_id_idx
  ON public.wallet_addresses (user_id);

-- ---------------------------------------------------------------------------
-- wallet_nonces — one-time SIWE challenges (short TTL, single use)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallet_nonces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  address text NOT NULL,
  chain_family text NOT NULL DEFAULT 'evm',
  nonce text NOT NULL,
  domain text NOT NULL,
  uri text NOT NULL,
  chain_id integer NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wallet_nonces_chain_family_check CHECK (chain_family = 'evm'),
  CONSTRAINT wallet_nonces_address_format CHECK (address ~ '^0x[0-9a-fA-F]{40}$'),
  CONSTRAINT wallet_nonces_nonce_len CHECK (char_length(nonce) >= 8 AND char_length(nonce) <= 64)
);

COMMENT ON TABLE public.wallet_nonces IS
  'Phase 1C: one-time SIWE nonces bound to authenticated user + address. Never log nonce.';

CREATE UNIQUE INDEX IF NOT EXISTS wallet_nonces_nonce_uidx
  ON public.wallet_nonces (nonce);

CREATE INDEX IF NOT EXISTS wallet_nonces_user_id_idx
  ON public.wallet_nonces (user_id);

CREATE INDEX IF NOT EXISTS wallet_nonces_expires_at_idx
  ON public.wallet_nonces (expires_at);

-- ---------------------------------------------------------------------------
-- RLS — users may read own wallets; all mutations via service role after auth
-- ---------------------------------------------------------------------------
ALTER TABLE public.wallet_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_nonces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wallet_addresses_select_own ON public.wallet_addresses;
CREATE POLICY wallet_addresses_select_own
  ON public.wallet_addresses
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- No INSERT / UPDATE / DELETE policies for authenticated or anon.
-- Nonces are never client-readable.
DROP POLICY IF EXISTS wallet_nonces_deny_all ON public.wallet_nonces;
-- Explicit: no policies → authenticated/anon cannot access under RLS.
-- service_role bypasses RLS for server routes after session auth.

REVOKE ALL ON public.wallet_addresses FROM PUBLIC;
REVOKE ALL ON public.wallet_nonces FROM PUBLIC;
GRANT SELECT ON public.wallet_addresses TO authenticated;
GRANT ALL ON public.wallet_addresses TO service_role;
GRANT ALL ON public.wallet_nonces TO service_role;

COMMIT;
