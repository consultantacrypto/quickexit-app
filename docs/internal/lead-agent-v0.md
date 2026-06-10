# QuickExit AI Lead Agent — V0

**Status:** Phase 1 + Phase 2 (manual inbox)  
**Route:** `/hq-admin/lead-agent`  
**API:** `POST|GET|PATCH|DELETE /api/hq/leads`  
**SQL:** `docs/internal/sql/lead-agent-v0.sql` (run manually in Supabase)

---

## Purpose

Internal HQ tool for managing potential **sellers**, **buyers**, and **connectors** before they become platform users. V0 is **manual and human-approved**: operators create/import leads, track status, notes, and next actions. No automated outreach.

Strategic goal: build a lead intelligence foundation that later supports AI scoring and message drafting (Phase 3).

---

## V0 scope (implemented)

| Feature | Status |
|---------|--------|
| Lead Inbox (table + filters) | ✅ |
| Manual lead creation | ✅ |
| Paste import (tab/comma lines) | ✅ |
| Status / notes / next action editing | ✅ |
| Activity log (`lead_events`) | ✅ |
| Copy phone / email / LinkedIn / source URL | ✅ |
| Archive (soft — `status = archived`) | ✅ |
| Admin API gate (Bearer JWT + `HQ_ADMIN_EMAILS`) | ✅ |
| Service-role-only DB access | ✅ |

---

## Deliberately excluded (V0)

- AI scoring (`ai_score` fields exist but unused)
- AI message generation (`lead_messages` table ready, no UI/API yet)
- Scraping / enrichment pipelines
- WhatsApp Business API / automated sending
- Email sending
- Bulk outreach campaigns
- Public-facing lead capture forms
- Browser client direct Supabase access to lead tables

---

## GDPR / privacy notes

1. **Lawful basis:** Default `legal_basis = legitimate_interest` on each lead. Document `data_source_note` when importing from external lists.
2. **Data minimization:** Store only fields needed for outreach (name, contact, asset context). No passwords, no payment data.
3. **Access control:** HQ admin email allowlist + server-side JWT validation. Lead tables have RLS enabled with **no policies** (deny anon/authenticated).
4. **Retention:** Use `status = archived` and `delete_requested = true` instead of hard delete. Define retention policy (e.g. 12 months after `lost`/`converted`) before scaling volume.
5. **Third-party AI (Phase 3):** When enabling Gemini, send only lead fields required for scoring/drafting — never bulk-export unrelated user data.
6. **No analytics:** Lead PII must not be sent to GA4 events.

---

## RLS notes

After running `lead-agent-v0.sql`:

- `leads`, `lead_messages`, `lead_events` → `ENABLE ROW LEVEL SECURITY`
- **No policies** → anon and authenticated roles cannot read/write
- App uses `SUPABASE_SERVICE_ROLE_KEY` only after admin JWT check in `/api/hq/leads`

**Verify:** In Supabase SQL or browser console with anon key, `select * from leads` must fail.

---

## Operating procedure (manual outreach)

1. **Run SQL** in Supabase Dashboard (once per environment).
2. Open `/hq-admin/lead-agent` while logged in as HQ admin.
3. **Create** or **import** leads (seller/buyer/connector).
4. Review lead → set `status` to `reviewed`.
5. Copy phone/email/LinkedIn → contact manually (WhatsApp, email, call).
6. Update `status` → `contacted` / `responded` / `qualified` / `call_scheduled`.
7. Set `next_action` + `next_action_at` for follow-ups.
8. On conversion to platform user → `status = converted` + note with listing/demand link.
9. On dead end → `status = lost`. On cleanup → **Arhivează**.

Import format (one line per lead):

```text
lead_type	full_name	phone	email	category	asset_summary	source
seller	Ion Popescu	+40722111222	ion@example.com	auto	Mercedes E300 2022	linkedin
```

---

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | JWT validation |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Lead CRUD (server only) |
| `HQ_ADMIN_EMAILS` | optional | Comma-separated admin emails (default in code) |

Phase 3 will also use `GEMINI_API_KEY` / `GEMINI_MODEL` (already used by HQ Copilot).

---

## Next phase: AI scoring + message generation

1. `POST /api/hq/leads/ai` with modes `score` | `message`
2. Persist results to `ai_score` / `lead_messages`
3. UI buttons in detail panel + copy-to-clipboard for drafts
4. Human marks `sent_manually_at` after sending externally
5. Pilot with 20–50 real leads before any automation

---

*QuickExit, LLC · Internal ops doc · June 2026*
