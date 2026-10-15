# QuickExit CI Gates

**Effective:** 2026-10-14 (Phase 4B.1)  
**Implementation:** active

---

## Workflows

| Workflow | Role |
|---|---|
| `ci.yml` | PR + `push` to `main` — static gates |
| `ci-local-supabase-nightly.yml` | Nightly / `workflow_dispatch` — local Supabase migrate + H4 matrices |
| `storage-backup-daily.yml` | Nightly / manual R2 Storage backup (Phase 3C) |

**Decision:** Local Supabase + H4 matrices are **nightly**, not PR-blocking — Docker/start/matrix latency exceeds a reasonable PR threshold. PR still enforces migration discipline statically.

---

## Required PR merge gates (`ci.yml`)

| # | Gate | Command |
|---|---|---|
| 1 | Install | `npm ci` |
| 2 | Typecheck | `npm run typecheck` |
| 3 | Lint | `npm run lint` |
| 4 | Production build | stub env; no live secrets |
| 5 | Preview boundary | `npm run assert:boundary` |
| 6 | Zero-image guard | `npm run assert:zero-image` |
| 7 | Redaction smoke | `npm run assert:redaction` |
| 8 | Migration discipline | `npm run assert:migration-discipline` |
| 9 | Secret / forbidden-file guard | `npm run assert:no-secrets` |

No Production/Staging secrets required for PR CI.

---

## Production deploy gate

| Rule | Detail |
|---|---|
| Source | Reviewed `main` only |
| CI | Must be green on the commit being promoted |
| Working tree | No Production promote from dirty/uncommitted local tree |
| Candidate build | `main` push may create a **Staged** Production deployment automatically |
| Live aliases | `www.quickexit.ro` / `quickexit.ro` move **only** on explicit promote (Auto-assign Custom Production Domains = Disabled) |
| Migrations | Schema/security changes reviewed; Staging validated when migrate path available; DB migrate separate from alias promote |
| Preview boundary | Preview must not silently share Production data plane after cutover |
| Emergency rollback | Alias rollback / `vercel rollback`; post-incident migration policy applies |

See `production-deployment-policy.md` and `production-release-checklist.md`. Do not bypass CI for schema/security changes.

---

## Migration guard

`scripts/assert-migration-discipline.ts`

- Ordered unique migration filenames  
- Blocks DO_NOT_RUN snippets in `supabase/migrations`  
- Requires H4 objects + media_orders orphan reconciliation markers  
- Requires H4 rollback artifacts  
- Requires staging-bootstrap README marked non-canonical  

## Secret guard

`scripts/assert-no-secrets-tracked.ts`

- Fails if `.env*.local` (or similar) is git-tracked  
- Fails on live-looking Stripe/R2/Sentry/service-role/DB password patterns in tracked files  
