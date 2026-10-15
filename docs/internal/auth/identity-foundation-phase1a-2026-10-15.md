# QuickExit Auth Phase 1A — Identity Foundation

**Date:** 2026-10-15  
**Mode:** Staging-first auth hardening  
**Scope:** Profile auto-provision, linking policy, collision UX, AuthModal cleanup, analytics/observability  
**Out of scope:** Apple, wallet, Bybit/OKX/Binance, Production auth/config/deploy/DB mutations

---

## A. Current auth truth (reconfirmed)

| Piece | Location |
|-------|----------|
| AuthModal | `app/components/AuthModal.tsx` — Google OAuth + email `signInWithOtp` |
| Callback | `app/[locale]/auth/callback/route.ts` — PKCE `exchangeCodeForSession` |
| Browser client | `lib/supabase/client.ts` (`@supabase/ssr` createBrowserClient) |
| Server client | `lib/supabase/server.ts` |
| Middleware refresh | `middleware.ts` + `lib/supabase/middleware.ts` (`getUser`) |
| Redirect safety | `lib/authRedirect.ts` `safeInternalPath` |
| Callback URL | `lib/siteUrl.ts` `getAuthCallbackUrl` |
| Profiles | `public.profiles.id` = `auth.users.id` |
| KYC | `profiles.kyc_status` via `app/api/kyc/start` + webhooks; `lib/kycStartAuth.ts` |
| HQ | `lib/hqAdminAllowlist.ts` + `lib/hqAdminAuth.ts` / `lib/hqAdminPageAuth.ts` |
| Hash cleanup | `app/components/AuthHashCleaner.tsx` |

Local `supabase/config.toml`: `enable_manual_linking = false`; Apple external disabled; passkeys commented; Solana web3 disabled.

---

## B. Profile provisioning solution

**Chosen: A — database trigger on `auth.users` (primary)**  
**Plus: B — server `ensureProfileRow` after successful callback (idempotent belt)**

### Rationale

- DB trigger enforces the invariant for **all** auth paths (email, Google, future Apple), including Admin API user creates used in tests.  
- `INSERT … ON CONFLICT DO NOTHING` is idempotent and never overwrites fields / KYC.  
- `SECURITY DEFINER` + fixed `search_path = public` matches H4B.1 trigger style.  
- Callback ensure covers edge cases if a historical user lacks a row before trigger backfill.

Migration: `supabase/migrations/20261015180000_auth_profile_auto_provision.sql`  
Rollback: `docs/internal/sql/h4b-proposed/auth-profile-auto-provision.ROLLBACK.sql`

---

## C. Existing user audit (Staging — 2026-10-15)

Script: `scripts/audit-auth-profiles.ts` (Staging/local only; Production ref hard-refused).

| Metric | Before backfill | After backfill |
|--------|-----------------|----------------|
| auth_users | 12 | 12 |
| profiles | 10 | 12 |
| MATCH | 10 | 12 |
| MISSING_PROFILE | 2 | 0 |
| ORPHAN_PROFILE | 0 | 0 |

Backfill: `QE_AUTH_PROFILE_BACKFILL=1` inserted **2** rows (`id` only). No KYC mutations. No PII logged.

**DDL trigger migration:** Staging apply via `scripts/apply-auth-profile-provision-staging.ts` requires `STAGING_DB_URL` — **SKIPPED** until postgres URL is provided. Until then, callback `ensureProfileRow` covers new sessions after app deploy.

---

## D–J. Policy / security

See:

- `docs/internal/auth/identity-linking-policy.md`  
- `docs/internal/auth/auth-recovery-policy.md`  
- `lib/authIdentity/*`

Manual linking remains **disabled** in repo `config.toml`. Enabling on Staging requires separate threat-gate approval; Phase 1A does not flip Production or Staging Dashboard flags from this change set alone.

---

## K–L. KYC / HQ invariants

Asserted in `scripts/assert-auth-identity-foundation.ts`:

- Provision/link code paths do not write `kyc_status` / `buyer_verified`  
- HQ allowlist has no coupling to `linkIdentity`  

---

## O–P. UX

- Dashboard: `ConnectedIdentities` (Email + Google status only)  
- AuthModal: wallet/maintenance CTA removed; Google primary; email secondary  
- Collision: `?auth=identity_conflict` banner (`AuthStatusBanner`)

---

## Q. Analytics / observability

Events: `auth_started`, `auth_provider_selected`, `auth_success`, `auth_failed`, `identity_link_*`, `identity_unlink_*`  
Logs: `component=auth_identity` via `lib/authIdentity/log.ts` (denied/conflict → warn; unexpected → error)

---

## Production rollout (design only — NOT executed)

1. Review + merge migration  
2. Staging migrate + audit/backfill missing profiles  
3. Staging Google + email smoke + ownership/KYC/HQ proof  
4. Optional Staging manual-linking flag (separate change)  
5. Production migrate + optional missing-profile backfill (separate approval)  
6. Deploy app  
7. Smoke + monitoring on `auth_identity` logs / auth events  

---

## Apple / Wallet readiness (foundation)

| Target | Status | Blockers |
|--------|--------|----------|
| Apple | Foundation ready for Phase 1B | Apple Developer config; private-relay collision UX already designed; do not enable until Staging smoke |
| Wallet bind | Foundation ready for bind-after-auth design | Need `wallet_addresses` table + SIWE; cold wallet login still DENY |

---

## Phase 1A closed?

Closed when: migration lands, asserts PASS, AuthModal cleaned, docs present, Staging audit run (or explicitly skipped for missing creds), no Production apply.
