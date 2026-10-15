# QuickExit Production Deployment Policy

**Effective:** 2026-10-15  
**Mode:** Deployment safety hardening (alias promotion gate)  
**Status:** ACTIVE

---

## 1. Goal

Keep automatic **Production build candidates** on `main`, but **never** move live aliases until an operator explicitly promotes:

- `www.quickexit.ro`
- `quickexit.ro`

Staging remains independent.

---

## 2. Architecture (current)

| Layer | Setting | Behavior |
|---|---|---|
| Git integration | GitHub `consultantacrypto/quickexit-app` → project `quickexit-app` | Push/PR commits create deployments |
| Production Branch | `main` | Every push to `main` creates a **Production** deployment (build with Production env) |
| Auto-assign Custom Production Domains | **Disabled** (as of 2026-10-15) | New Production deploys are **Staged** — domains do **not** auto-attach |
| Preview | All unassigned branches | PR/feature branches → Preview deployments |
| Staging alias | `quickexit-staging.vercel.app` | Manually pointed at a verified Preview/Staging candidate; **not** moved by Production promote |
| Environments | Production / Preview / Development (Pro) | Separate env var scopes |

### Root mechanism (historical incident)

Before hardening, **A + C** together caused live cutover on every `main` push:

1. **A.** Production Branch auto-deploy (`main` → Production target)
2. **C.** Domain auto-alias (`autoAssignCustomDomains = true`) assigned `www` / apex to each Ready Production deploy

Evidence: Vercel Dashboard → Settings → Environments → Production → Branch Tracking showed Enabled auto-assign; push of `830f3bb` created `dpl_5kus35Em3F85ZdveMSTEQ8URgmk5` which briefly took `www`.

---

## 3. Recommended release model (MODEL 4)

**Staged Production + explicit promote**

```
git push origin main
  → Vercel builds Production candidate (Staged)
  → CI gates on GitHub
  → operator verifies candidate URL + staging smoke as needed
  → explicit promote
  → www / apex move only then
```

### Why not the alternatives

| Model | Verdict |
|---|---|
| 1. `release/production` as Production Branch | Extra branch ceremony; OK later if team grows |
| 2. `main` Preview-only + `vercel --prod` | Loses Production env parity on git pushes |
| 3. GitHub Actions-only Production deploy | More CI surface; unnecessary for current team size |
| **4. Manual promote of staged Production** | **Chosen** — smallest change; matches Vercel “staged production” product |

---

## 4. Alias ownership

| Hostname | Owner / when it moves |
|---|---|
| `www.quickexit.ro` | Production only — **explicit promote** or **rollback** |
| `quickexit.ro` | Same as www (always move together) |
| `*.vercel.app` deployment URLs | Auto per deploy; safe for candidate checks |
| `quickexit-staging.vercel.app` | Staging/Preview only — **never** as side-effect of Production promote |
| `quickexit-app-….vercel.app` project alias | May track Current Production; do not use as release authority |

---

## 5. Dirty worktree rule

**NO Production promote from a dirty local working tree.**

Production artifact must map to:

1. A **committed SHA**
2. That SHA on the **remote canonical branch** (`origin/main` for candidates)
3. **Green required gates** for that SHA

Exception: documented incident response only (see §8), with post-incident note.

Local `vercel deploy --prod` from an unclean tree is forbidden for live cutover.

---

## 6. CI gates that block promotion

Must be green on the candidate SHA before promote:

| Gate | Command / source |
|---|---|
| Typecheck | `npm run typecheck` (`tsc --noEmit`) |
| Lint | `npm run lint` (CI) |
| Production build (stub env) | `npm run build` (CI) |
| Preview boundary | `npm run assert:boundary` |
| Zero-image | `npm run assert:zero-image` |
| Redaction | `npm run assert:redaction` |
| Migration discipline | `npm run assert:migration-discipline` |
| No-secrets | `npm run assert:no-secrets` |
| Health route | `npm run assert:health-route` |
| Auth identity foundation | `npm run assert:auth-identity` |
| Media pricing | `npx tsx scripts/assert-media-pricing.ts` |
| Capital Disponibil v2 | `npx tsx scripts/assert-capital-disponibil-v2.ts` |

PR workflow `ci.yml` already covers the static subset. Remaining asserts must be run locally/CI before promote when those surfaces changed (or always for major releases).

Nightly H4 / local Supabase matrices do **not** block every promote, but schema/RLS releases require Staging validation first.

---

## 7. Promotion procedure

### Dashboard (preferred)

1. Deployments → select **Staged** Production deploy for the approved SHA  
2. `…` → **Promote**  
3. Confirm domains include `www.quickexit.ro` and `quickexit.ro`  
4. Verify `/api/health` on www → 200  

### CLI

```bash
# Verify candidate (do NOT promote yet)
npx vercel inspect <deployment-url-or-id>
curl -fsS https://www.quickexit.ro/api/health

# Promote staged Production deploy
npx vercel promote <deployment-url-or-id> --yes

# Immediately re-assert policy setting (known hazard: some promote paths
# have historically flipped autoAssignCustomDomains back to true)
# Dashboard: Settings → Environments → Production → ensure Auto-assign = Disabled
```

If CLI promote is used, **re-check** Auto-assign remains Disabled before the next `main` push.

### Alternate alias pin (incident / surgical)

```bash
npx vercel alias set <deployment-url> www.quickexit.ro
npx vercel alias set <deployment-url> quickexit.ro
```

Prefer `vercel promote` / Dashboard Promote for normal releases; alias set is for recovery when needed.

---

## 8. Rollback model

App rollback is **alias-only**. It does **not** roll back database migrations.

```bash
# Instant rollback to a previous Production deployment that already served traffic
npx vercel rollback <previous-deployment-url-or-id> --yes

# Or pin aliases explicitly
npx vercel alias set <previous-deployment-url> www.quickexit.ro
npx vercel alias set <previous-deployment-url> quickexit.ro

# Verify
curl -fsS https://www.quickexit.ro/api/health
```

Record:

- Previous verified deployment id (rollback target)
- Failed/new deployment id
- Health check timestamp

Incident exception: temporary re-enable of auto-assign is **not** allowed without written incident note; prefer alias pin.

---

## 9. Release branch assessment

A dedicated `release/production` branch is **optional**, not required now.

Current team size is better served by:

`feature → main (candidate) → CI → staging smoke → promote`

Introduce `release/*` only if concurrent unfinished work on `main` regularly forces staged deploys that must never be promote-eligible.

---

## 10. Operator Dashboard steps (config)

Already applied 2026-10-15. Re-apply if drift detected:

1. Vercel → project `quickexit-app`  
2. **Settings → Environments → Production**  
3. Branch Tracking → **Auto-assign Custom Production Domains** → **Disabled**  
4. Save  
5. Confirm banner: “Production deployments will need to be manually promoted.”

API equivalent (requires token; do not commit tokens):

```bash
curl -X PATCH "https://api.vercel.com/v9/projects/prj_JCzIEiPfyp3oQ9NtKgwJdsZQJLiG?teamId=team_rlXgJOGXkWHbHvSMo9UGbywA" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"autoAssignCustomDomains":false}'
```

---

## 11. Related docs

- `docs/internal/engineering/production-release-checklist.md`
- `docs/internal/engineering/ci-gates.md`
- Vercel: [Promoting Deployments](https://vercel.com/docs/deployments/promoting-a-deployment)
