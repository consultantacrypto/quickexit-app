# QuickExit Production Release Checklist

**Use before every Production promote.**  
**Policy:** `docs/internal/engineering/production-deployment-policy.md`

---

## Pre-promote

1. **Clean git (local)**
   - `git status` shows no unintended dirty files for the release SHA
   - Do **not** promote from a dirty worktree / local-only tree

2. **Commit SHA pushed**
   - Candidate SHA exists on `origin/main`
   - `git rev-parse HEAD` == `git rev-parse origin/main` for the release commit

3. **CI green**
   - GitHub Actions `ci.yml` green on that SHA
   - Required asserts for touched surfaces green (see policy §6)

4. **Staging smoke** (when auth/schema/payments/media change)
   - `https://quickexit-staging.vercel.app/api/health` → 200
   - Feature smoke on Staging as applicable

5. **Migrations reviewed / applied**
   - Migration files reviewed
   - Applied on Staging when schema changes
   - Production DB migrate is a **separate** approved step (never coupled to alias promote)

6. **Env verified**
   - Production env vars expected for this release
   - No Preview/Staging secrets accidentally required by Production path

7. **Deployment candidate READY**
   - Vercel Production deploy for the SHA is **Ready** and **Staged** (not Current)
   - Record deployment id / URL

8. **Candidate `/api/health`**
   - Hit the deployment URL `/api/health` → 200
   - Confirm response looks like Production env (not Preview mis-target)

---

## Promote

9. **Explicit promote**
   - Dashboard: Deployments → `…` → **Promote**  
   - or: `npx vercel promote <deployment-url-or-id> --yes`
   - Confirm Auto-assign Custom Production Domains remains **Disabled** after CLI promote

---

## Post-promote

10. **www health**
    - `curl -fsS https://www.quickexit.ro/api/health` → 200
    - Apex `https://quickexit.ro/api/health` → 200 (or expected redirect to www)

11. **Logs / Sentry / Better Stack**
    - No spike in 5xx / health probe failures
    - Spot-check critical paths for this release

12. **Rollback reference recorded**
    - Previous Current deployment id (instant rollback target)
    - New Current deployment id
    - Timestamp + operator

---

## Rollback (if needed)

```bash
npx vercel rollback <previous-deployment-url-or-id> --yes
curl -fsS https://www.quickexit.ro/api/health
```

App rollback does **not** undo DB migrations.
