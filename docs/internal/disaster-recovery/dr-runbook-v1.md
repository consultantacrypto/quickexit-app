# QuickExit DR Runbook v1

**Scope:** Production Supabase `geywuzwbzecknokvnins` + app on `www.quickexit.ro`  
**Companion:** `dr-phase3a-audit-2026-10-13.md`  
**Rule zero:** **NEVER RESTORE PRODUCTION IMPULSIVELY**

---

## Severity

| Level | Meaning |
|---|---|
| **SEV1** | Production unavailable, data destruction, sustained payment pipeline outage |
| **SEV2** | Degraded critical path (checkout/webhook/auth/HQ/KYC) without total outage |
| **SEV3** | Staging / tooling / non-customer-facing |

---

## SEV1 — DATABASE INCIDENT

### 1. Freeze writes / maintenance mode (if needed)

- Prefer feature flags / disable mutating flows over silent data loss.  
- Communicate maintenance if site remains up but DB is unsafe.  
- Do **not** run ad-hoc SQL “fixes” without evidence and a restore plan.

### 2. Determine incident timestamp

- Approximate UTC time of first bad change (deploy, script, Dashboard edit, user report).  
- Capture Better Stack / Sentry / Vercel / Stripe Workbench screenshots (no secrets).

### 3. Establish latest safe restore point

- Supabase Dashboard → **Database → Backups** / **Point in Time**.  
- Choose the **latest backup/PITR point before** the incident.  
- Record: plan tier, PITR yes/no, chosen timestamp.

### 4. Preserve evidence

- Export metadata/logs needed for postmortem (counts, error samples).  
- Do **not** delete Production project.  
- Do **not** wipe Storage to “clean up” mid-incident.

### 5. Restore into isolated environment **first**

Preferred:

- Dashboard → source project → **Database → Backups → Restore to a New Project**  
  (select daily physical backup; PITR currently **not** enabled on Production)  
- Disposable temporary project — **never** overwrite Production as first action.

**Forbidden:**

- CLI `supabase backups restore --project-ref <production>` (this is **in-place PITR**, not clone)  
- Management API restore-pitr / project restore against Production  
- In-place Production restore without isolated validation  
- Restoring into Staging that still holds needed evidence without snapshot plan

Phase 3B rehearsal notes:

- `dr-phase3b-restore-drill-2026-10-13.md` (initial STOP — CLI cannot clone)
- `dr-phase3b-restore-drill-2026-10-14.md` (**VALIDATED** — DR `mbesoaeqatobmfssegsh`)
- Pre-drill baseline: `dr-phase3b-pre-drill-baseline-2026-10-14.json`
- Post-restore validation: `dr-phase3b-post-restore-validation-2026-10-14.json`

**Observed facts (Phase 3B restore drill, 2026-10-14):**

- Mechanism: Dashboard **Restore to a New Project** only (CLI cannot clone)
- Source backup: id `1950425082` @ **2026-10-13T05:58:16.920Z** from Production
- DR project: `quickexit-dr-drill-20261014` / `mbesoaeqatobmfssegsh` / `eu-west-1` / **ACTIVE_HEALTHY** by **2026-10-14T07:04:46Z**
- Schema / H4 security / critical counts: **100% parity** vs baseline + `production-truth/`
- Auth: users **26**, identities **27** restored; **SESSIONS_REQUIRE_REAUTH = YES**
- Storage metadata: **YES** (1 bucket, 513 objects); Storage **file bytes: NO** → **STORAGE_DR_GAP_CONFIRMED**
- External config (Auth redirects, Edge, secrets, Stripe, Didit, Vercel, SMTP): **NOT_RESTORED / RECONFIG_REQUIRED**
- Production + Staging: **ACTIVE_HEALTHY**, drill non-impact **PASS**
- Risk rating after drill: **GREEN_WITH_CONDITIONS** (bytes gap + PITR off + config rewire)
- PITR **OFF** → observed RPO ~25h at restore point age / model up to ~24h daily
- Never use CLI `supabase backups restore` on Production (in-place PITR)

### 6. Validate (isolated project)

Use checklist from Phase 3A audit + Phase 3B scripts:

- Critical table counts (`dr-phase3b-post-restore-validate.ts`)  
- Auth user/identity counts (aggregate only)  
- RLS / triggers / H4 objects vs `production-truth/` + `h4-must-present.json`  
- Sample listing read (anon REST)  
- Storage: **confirm metadata present and file-byte download fails** until off-site object backup exists  
- Synthetic security probes **only** on DR; never mutate restored customer rows  
- Boundary: DR ref ≠ Production ≠ Staging; Stripe Live / Didit / email off  
- `/api/health` if a throwaway app env is pointed at the clone (optional)

### 7. Decide Production recovery path

| Path | When |
|---|---|
| **Surgical copy** from clone → Production | Row/table-level loss |
| **In-place Production restore** | Total corruption; accept downtime |
| **App-only rollback** | Bad deploy, DB intact |

Document decision + approver.

### 8. Verify Stripe / webhook / Auth / HQ

- Stripe Live webhook: `https://www.quickexit.ro/api/stripe/webhook` — deliveries 2xx after recovery.  
- Do **not** change webhook URL casually.  
- Expect users may need **re-login** after Auth-impacting restore.  
- HQ allowlist still works.  
- Run boundary awareness: Production stays `geywuzwbzecknokvnins`.

### 9. Reopen writes

- Re-enable mutating features.  
- Watch Sentry + Better Stack for 30–60 minutes.

### 10. Post-incident review

- Timeline, RPO/RTO achieved, Storage impact, bus-factor gaps.  
- Schedule Storage backup / Phase 3B improvements if missing.

---

## SEV1 — STORAGE FILE LOSS

1. Confirm whether `storage.objects` still references missing keys.  
2. DB restore **will not** bring files back.  
3. Recover from **off-site object backup** (Cloudflare R2 / S3-compatible) if available; else re-upload / accept loss.  
4. Do not PITR Production solely to “fix images” unless metadata itself is wrong.

### Storage restore procedure (Phase 3C)

**Never restore straight to Production as first action.**

A. Detect missing object(s) (broken images, HQ report, inventory vs live).  
B. Identify backup date/version via `docs/internal/disaster-recovery/storage-backup/manifest-*.json` or R2 object versions.  
C. Restore selected keys to an **isolated** target first (`backup.ts restore-sample` → `.tmp/storage-backup/` or a temp R2 prefix).  
D. Verify bytes (size + sha256) and that images open.  
E. Restore to Production **only after explicit operator approval** (manual upload or approved script path).  
F. Verify public URL / object accessibility.  
G. Write incident note (no secrets / no unnecessary paths).

**Mass loss:** compare manifests; never bulk-restore blindly.

### Daily off-site backup (Phase 3C)

- Tooling: `scripts/storage-backup/` (`dry-run` / `backup` / `verify` / `restore-sample` / `synthetic-drill`)  
- Destination (recommended): **Cloudflare R2** private bucket, versioning ON, **copy-only** (no delete mirror)  
- Schedule: GitHub Actions `.github/workflows/storage-backup-daily.yml` @ **07:30 UTC**  
- Secrets: `.env.storage-backup.local` (local) + GitHub Actions secrets — never Vercel client  
- Docs: `storage-backup-phase3c-2026-10-14.md`  
- R2 bucket: `quickexit-storage-backup` · private · Public URL disabled · Bucket Lock **30 days**  
- Local env: `.env.storage-backup.local` (gitignored); `npm run storage:wire-env`  
- **Phase 3C FULLY CLOSED (2026-10-14):** local proof **513/513** + GitHub Actions automation active  
- Workflow: `storage-backup-daily` · cron **07:30 UTC** · copy-only · secrets present (names only in docs)  
- Manual dispatch proof: run **38588567872** success; `last-successful-backup` updated; prior manifests retained on R2  
- Failure visibility proven via failed run **38587835473** (npm ci lock sync; fixed; no Production impact)

---

## SEV1 / SEV2 — STRIPE WEBHOOK OUTAGE

1. Stripe Workbench → endpoint deliveries.  
2. Vercel logs + Sentry `stripe_webhook`.  
3. Fix config/code; replay failed events from Stripe.  
4. No Supabase restore unless fulfillment data is also corrupted.

---

## SEV2 — BAD MIGRATION / RLS

1. Stop further migrations.  
2. Rollback app deploy if needed.  
3. Re-apply known-good SQL from `production-truth` / H4B packs on **Staging first**.  
4. Use isolated DB restore only if schema cannot be repaired forward.

---

## Contacts / access (fill privately — do not commit secrets)

| System | Primary access | Break-glass |
|---|---|---|
| Supabase | _operator_ | _tbd_ |
| Vercel | _operator_ | _tbd_ |
| Stripe | _operator_ | _tbd_ |
| DNS | _operator_ | _tbd_ |
| Sentry / Better Stack | _operator_ | _tbd_ |

---

## Explicit prohibitions

- NEVER restore Production as the first diagnostic step.  
- NEVER delete the Production project to “start clean.”  
- NEVER copy Staging secrets into Production or vice versa.  
- NEVER expose DB passwords, service-role keys, or customer PII in tickets/chat.  
- NEVER assume Storage files returned after a DB restore.

---

## Related docs

- `dr-phase3a-audit-2026-10-13.md`  
- `docs/internal/staging-bootstrap/production-truth/`  
- Observability Phase 2 runbook (uptime / Sentry / Stripe visibility)  
