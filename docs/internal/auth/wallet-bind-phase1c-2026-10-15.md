# Auth Phase 1C — Wallet Bind / SIWE (Staging First)

**Date:** 2026-10-15  
**Scope:** Staging only (`nlnzlswjjplofpkhoxtr` + `quickexit-staging.vercel.app`)  
**Status:** **CLOSED on Staging + CANONICALIZED for commit** — Production wallet NOT enabled  
**Apple UI:** gated OFF (`APPLE_IDENTITY_UI_ENABLED = false`) — Email + Google + Wallet only  

**Staging deploy:** `dpl_EBBvPBAZaRrLFym6QRNBKbHSjkPs` → READY → alias `https://quickexit-staging.vercel.app`  
**Working tree SHA at deploy record:** `3346940` (preview deploy from local tree; Production aliases unchanged)

**NON-GOALS (honored):** Production wallet enable, wallet-only login, KYC changes, HQ changes, Bybit/OKX/Binance, ownership remapping, Solana, verified capital.

---

## A. Existing wallet dependencies

| Package | Present | Role |
|---------|---------|------|
| `viem` ^2.48.11 | Yes | SIWE create/parse/validate + `verifyMessage` + EIP-55 checksum |
| `wagmi` | No | Not added |
| `@walletconnect/*` | No | Deferred |
| `siwe` standalone | No | Covered by `viem/siwe` |
| `ethers` | No | — |

Existing code: HQ `bmk-lab` uses injected `window.ethereum` + viem (unrelated to identity bind). Global `Window.ethereum` augmentation removed there to avoid conflict with viem’s EIP1193 types.

**Library choice:** viem only + desktop injected provider (MetaMask). No wagmi / WalletConnect in Phase 1C.

---

## B. Data model

Additive tables:

- `public.wallet_addresses` — bound EVM wallets (`user_id` → `auth.users.id`)
- `public.wallet_nonces` — one-time SIWE challenges

Address strategy: EIP-55 checksummed storage; uniqueness on `(chain_family, lower(address))`.  
Optional `last_seen_chain_id` for SIWE integrity audit — not a funds requirement.

Migration: `supabase/migrations/20261015200000_wallet_identity_bind.sql`  
Rollback: `docs/internal/sql/h4b-proposed/wallet-identity-bind.ROLLBACK.sql`  
DDL artifact: `docs/internal/auth/phase1c-staging-ddl-2026-10-15.json`

---

## C. RLS model

- RLS enabled on both tables
- `authenticated` **SELECT** own `wallet_addresses` only
- No client INSERT / UPDATE / DELETE policies
- `wallet_nonces` not client-readable
- Mutations via service role **after** Bearer session auth

---

## D. Nonce model

- 16-byte hex via `crypto.getRandomValues`
- TTL 10 minutes
- Bound to `user_id` + address + domain + uri + chain_id
- Single-use (`consumed_at`); replay / expiry / session-mismatch denied
- Never in analytics; redaction treats `nonce` / `signature` as sensitive

---

## E. SIWE message design

EIP-4361 fields: domain, address, statement, URI, version `1`, chainId, nonce, issuedAt, expirationTime.

Statement:  
`Sign this message to connect your wallet to your QuickExit account.`

Server returns the exact message; client `personal_sign` only (no tx / gas / approvals).

---

## F. Server routes

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/wallet/nonce` | Bearer QuickExit session + same-origin |
| POST | `/api/wallet/verify` | Bearer QuickExit session + same-origin |
| POST | `/api/wallet/unlink` | Bearer QuickExit session + same-origin |

Code: `lib/walletIdentity/*`, `app/api/wallet/*/route.ts`

---

## G. Frontend UX

`ConnectedIdentities`: Email / Google / Apple (status) + Wallet connect/disconnect.

- Abbreviated address when connected
- Proof hint: ownership only
- No “Sign in with wallet”

---

## H. Duplicate-wallet handling

DENY `409 wallet_owned_elsewhere`  
UX: “This wallet is already connected to another QuickExit account.”  
No merge / no ownership remap.

---

## I. Unlink behavior

Own wallet only. Binding row removed. Does not affect `auth.users`, KYC, listings/demands ownership. Wallet ≠ recovery → no lockout risk.

---

## J. KYC invariant

Routes never write `profiles.kyc_status` / `buyer_verified`. Staging E2E **L_kyc_unchanged = PASS**.

---

## K. Ownership invariant

Routes never touch listings / demands / offers / rooms / media_orders / inquiries. Staging E2E **N_ownership_unchanged = PASS**.

---

## L. Badge semantics

EN “Wallet connected” / RO “Wallet conectat” = address ownership proven only.  
See `wallet-identity-semantics.md`.

---

## M. Privacy

Dashboard abbreviated address. No public profile exposure by default. No full address / signature / nonce in analytics.

---

## N. Analytics / observability

Events: `wallet_connect_*`, `wallet_disconnect_*` (`chain_family` only).  
Logs: `component=wallet_identity` — `nonce_issue|signature_verify|wallet_bind|wallet_unbind|wallet_conflict`.  
Unexpected → Sentry; expected denials → structured warn.

---

## O. Threat model

| Control | Result |
|---------|--------|
| Nonce replay | PASS (DENY) |
| Expired nonce | PASS (DENY) |
| Invalid signature | PASS (DENY) |
| Wrong domain/origin | PASS (DENY) |
| Wrong chain (pure) | PASS (DENY) |
| Wallet linked elsewhere | PASS (DENY) |
| Unauthenticated bind | PASS (DENY) |
| Session mismatch (nonce user) | covered in verify |
| Malicious unlink | PASS (DENY) |
| Case-normalization | PASS (unique lower(address)) |
| Signature leakage in logs | PASS (redaction + assert) |

Full matrix: `docs/internal/auth/phase1c-staging-e2e-2026-10-15.json`

---

## P. Chain handling

Any positive EVM `chainId` accepted for SIWE integrity.  
Identity = `chain_family='evm'` + checksummed address (+ optional `last_seen_chain_id`).  
No funds-on-chain requirement.

---

## Q. Library choice

**viem only** (already in repo). Injected desktop wallet. WalletConnect deferred.

---

## R. Migration

Applied to Staging. Fresh migration discipline PASS (`assert:migration-discipline`). Rollback artifact present.

---

## S. Staging apply

`npx tsx scripts/apply-wallet-identity-staging.ts` → **PASS**  
Tables, unique indexes, SELECT-own policy, RLS enabled. Production untouched.

---

## T. Staging deployment

| Field | Value |
|-------|-------|
| Deployment ID | `dpl_EBBvPBAZaRrLFym6QRNBKbHSjkPs` |
| Status | READY |
| Alias | `https://quickexit-staging.vercel.app` |
| Target | preview |
| Production alias moved | **false** |

---

## U. E2E matrix

All required cells PASS/DENY as expected — see `phase1c-staging-e2e-2026-10-15.json`.

---

## V. Mobile

WalletConnect **deferred**. Desktop injected wallet sufficient for Phase 1C.

---

## W. ConnectedIdentities result

Shows Email, Google, Apple (status) + Wallet (connect/disconnect, abbreviated address, ownership-proof copy).

---

## X. CI / assertions

| Check | Result |
|-------|--------|
| `tsc --noEmit` | PASS |
| `assert:wallet-identity` | PASS |
| `assert:auth-identity` | PASS |
| `assert:migration-discipline` | PASS |
| `assert:no-secrets` | PASS |
| `assert:health-route` | PASS |
| `assert:redaction` | PASS |
| publish EN i18n | PASS |
| `assert:boundary` | PASS |

---

## Y. Production non-impact

Artifact: `phase1c-production-non-impact-2026-10-15.json`  
www health 200 · Production DB/env/deploy unchanged · staging alias only.

---

## Z. Verified-capital future note

Documented in `wallet-identity-semantics.md`. **Not implemented.**  
Wallet connection alone is **not** proof of funds.

---

## AA. Remaining blockers

None for Staging Phase 1C closure.

Deferred (intentional):

- WalletConnect / mobile deep-link handoff
- Solana chain family
- Production wallet enable
- Public profile wallet display
- Verified capital / balance bands

---

## AB. Phase 1C CLOSED?

**YES — Staging closed.**  
**NO — Production wallet enable** (explicit non-goal).

---

QUICKEXIT AUTH PHASE 1C WALLET BIND VERIFIED ON STAGING — EVM ADDRESS OWNERSHIP PROVEN — NO KYC/POF IMPLICATION
