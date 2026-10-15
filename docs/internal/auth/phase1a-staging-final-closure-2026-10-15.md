# Phase 1A Final Staging Closure — 2026-10-15

## Migration

- Applied via temp `supabase link` + `db query --linked` (no STAGING_DB_URL)
- Target: `nlnzlswjjplofpkhoxtr` only
- Version: `20261015180000`
- Function: `public.handle_new_user_profile` (SECURITY DEFINER, `search_path=public`)
- Trigger: `on_auth_user_created_profile` on `auth.users`
- Artifact: `docs/internal/auth/phase1a-staging-ddl-2026-10-15.json`

## Synthetic invariant

- New auth user → exactly 1 profile
- Retry insert → still 1 (unique violation 23505)
- KYC not escalated (`unverified`)
- Cleanup OK
- Artifact: `docs/internal/auth/phase1a-staging-synthetic-proof-2026-10-15.json`

## Deploys (Staging alias only)

| Field | Value |
|-------|--------|
| Final deployment | `dpl_J68vcmADdabUTHVHY6U5vFK6mCW8` |
| Prior deploy (pre hash-bounce fix) | `dpl_4Yx9SZ8fuw8mAz3Vm79uZQiVKmcb` |
| Alias | `https://quickexit-staging.vercel.app` |
| Production alias moved | **false** |
| Working-tree SHA recorded by deploy script | `09ac1cf` (HEAD; deploy includes uncommitted Phase 1A files) |

## Auth smoke

| Check | Result |
|-------|--------|
| Google OAuth start (PKCE authorize URL → Staging callback) | PASS |
| Google full account consent | PARTIAL — requires human Google account (authorize URL proven) |
| Email session (verifyOtp) | PASS |
| Email magic-link callback hash bounce (200 HTML preserves fragment) | PASS |
| UX: Continuă cu Google primary; no wallet CTA | PASS (browser) |
| Identity conflict banner | PASS |
| Ownership counts unchanged | PASS |
| KYC verified count unchanged | PASS |
| Profiles MATCH 12/12 after cleanup | PASS |

## Production non-impact

- Production migration history does **not** include `20261015180000`
- Production `/api/health` = 200
- No Production deploy / auth config change
- Artifact: `docs/internal/auth/phase1a-production-non-impact-2026-10-15.json`

## Follow-up (non-blocking)

- Complete human Google sign-in once on Staging to capture dashboard cookie session screenshot
- Commit Phase 1A working tree when ready
