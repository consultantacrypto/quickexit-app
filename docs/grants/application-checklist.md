# Quick Exit — Application Checklist

**Sprint:** G2.1 · Grant Execution Pack  
**Applicant:** QuickExit, LLC (Delaware Limited Liability Company)  
**Product:** [www.quickexit.ro](https://www.quickexit.ro)  
**Last updated:** June 2026

---

## 1. Documents we already have (Markdown in repo)

| Document | Path | Status | Use for |
|----------|------|--------|---------|
| One-pager EN | `quick-exit-one-pager-en.md` | ✅ Complete | All international applications |
| One-pager RO | `quick-exit-one-pager-ro.md` | ✅ Complete | Romania / EU regional programs |
| Grant narrative | `grant-narrative.md` | ✅ Complete | Tier A cash, innovation, Web3 |
| Budget $100K | `budget-100k.md` | ✅ Complete | Cash grants, MVB, AWS |
| Web3 / BNB angle | `web3-bnb-chain-angle.md` | ✅ Complete | BNB MVB, Binance, Stellar exploratory |
| Pitch deck outline | `pitch-deck-outline.md` | ✅ Outline only | Source for slide deck — not final deck |
| Target grants list | `target-grants-list.md` | ✅ Complete | Prioritization reference |
| Grant CRM template | `grant-crm-template.md` | ✅ Template | Tracking structure |
| Marketing capital narrative | `marketing-capital-narrative.md` | ✅ Complete | Ad credits, GTM-allowed cash |
| Scoring model | `grant-scoring-model.md` | ✅ Complete | Go/no-go before submit |
| Monthly OS (50 apps) | `monthly-50-grants-operating-system.md` | ✅ Complete | Operations playbook |
| Application calendar | `monthly-application-calendar.md` | ✅ Complete | Weekly execution |
| Grant agent prompts | `grant-agent-daily-prompts.md` | ✅ Complete | Cursor automation |
| **Founder profile** | `founder-profile.md` | ✅ G2.1 | Portals, accelerators |
| **Outreach messages** | `outreach-messages.md` | ✅ G2.1 | Cold email / intro |
| **First 15 CRM** | `first-15-grants-crm.md` | ✅ G2.1 | Sprint execution queue |
| **PDF export checklist** | `pdf-export-checklist.md` | ✅ G2.1 | Pre-submit export |

### Supporting references (outside `docs/grants/`)

| Document | Path | Use for |
|----------|------|---------|
| Company legal facts | `lib/company.ts` | Entity name, LLC type, address — **no EIN in code** |
| GA4 events proof | `docs/analytics-events.md` | Cloud / AI / GTM applications |
| HQ Copilot boundaries | `docs/internal/ai-roles-boundary.md` | AI grant due diligence |

---

## 2. Documents missing (blockers by tier)

| Document | Blocks | Priority |
|----------|--------|----------|
| **One-pager EN PDF** | Most portal uploads | P0 — export first |
| **One-pager RO PDF** | RO/EU programs | P1 |
| **Pitch deck PDF** (12–14 slides) | Google Cloud, BNB MVB, accelerators | P0 for Tier A |
| **Video demo** (60–90s) | Web3, Tier A interviews | P1 |
| **HQ Copilot screenshot** (redacted) | Deck appendix | P2 |
| **Product screenshots** (homepage, listing, dashboard) | Deck slides 4–5 | P0 for deck |
| **Founder CV PDF** (optional section completed) | Accelerators | P1 |
| **Liquidity activation baseline** (GA4 export, no PII) | Marketing grants | P2 — after first campaigns |

### For official applications only (not in git — secure storage)

| Document | Purpose |
|----------|---------|
| **EIN confirmation letter** (61-2350228) | US grant portals |
| **Delaware Certificate of Formation** | Due diligence |
| **Operating Agreement** (redacted) | Some accelerators |
| **Stripe account verification** | Fintech perks |

> See `pdf-export-checklist.md` for export workflow and data room rules.

---

## 3. What must be exported to PDF

| Source Markdown | Output filename | Priority |
|-----------------|-----------------|----------|
| `quick-exit-one-pager-en.md` | `QuickExit_OnePager_EN_2026.pdf` | P0 |
| `quick-exit-one-pager-ro.md` | `QuickExit_OnePager_RO_2026.pdf` | P1 |
| `pitch-deck-outline.md` → slides | `QuickExit_PitchDeck_2026.pdf` | P0 |
| `web3-bnb-chain-angle.md` | `QuickExit_Web3_BNB_Angle_2026.pdf` | P1 |
| `grant-narrative.md` (exec summary pages) | `QuickExit_GrantNarrative_2026.pdf` | P1 |
| `budget-100k.md` | `QuickExit_Budget_100K_2026.pdf` | P1 |
| `founder-profile.md` | `QuickExit_Founder_MihaiDaniel_2026.pdf` | P1 |
| `marketing-capital-narrative.md` (excerpt) | `QuickExit_LiquidityActivation_2026.pdf` | P2 |

Full details: `pdf-export-checklist.md`.

---

## 4. What is safe to send publicly

| Material | Channel |
|----------|---------|
| quickexit.ro URL | All outreach |
| One-pager EN PDF (no EIN on cover if redacted version made) | Email, consultants, ecosystem intros |
| Founder profile (public section only) | LinkedIn, F6S, OpenGrants profile |
| Outreach messages from `outreach-messages.md` | Cold email |
| Web3 angle doc (no internal credentials) | BNB / Binance contacts |
| Pitch deck (no EIN slide optional for public version) | Demo days, scouts |

**Public-safe entity line:**

```
QuickExit, LLC · Delaware Limited Liability Company · quickexit.ro · vip@quickexit.ro
```

---

## 5. Official portals only (never public / never email unless encrypted)

| Material | Portal examples |
|----------|-----------------|
| EIN 61-2350228 | Google Cloud Startup, AWS Activate, IRS-linked forms |
| Certificate of Formation PDF | Government grants, some accelerators |
| Operating Agreement | Accelerator legal review |
| Bank / Stripe verification | Fintech programs |
| Cap table (if ever created) | Dilutive accelerators only |

**Rule:** EIN appears only in forms marked **“for official applications only”** in `founder-profile.md` and portal fields — not on website, not in cold outreach.

---

## 6. Never send

| Item | Reason |
|------|--------|
| `.env`, `.env.local`, API keys | Security |
| `DIDIT_API_KEY`, Stripe secret keys | Security |
| Supabase service role key | Security |
| `HQ_ADMIN_EMAILS` or admin credentials | Security |
| Unredacted user data / KYC records | Privacy / GDPR |
| Fabricated metrics (users, revenue, MAU) | Integrity |
| “Binance OAuth approved” claim | Factual accuracy |
| Internal RLS audit raw reports with PII | Privacy |
| Operating Agreement with personal addresses (unredacted) | Privacy |

---

## 7. Pre-submit checklist (every application)

### All tiers

- [ ] Program scored ≥ 6.0 in `grant-scoring-model.md`
- [ ] CRM row updated in `first-15-grants-crm.md` or batch file
- [ ] Live URL tested: https://www.quickexit.ro
- [ ] Entity described as **Delaware LLC** (not corporation)
- [ ] Binance OAuth phrased **requested / in progress** (if mentioned)
- [ ] No invented traction numbers
- [ ] Correct outreach template selected

### Tier B / A additional

- [ ] One-pager PDF attached
- [ ] Custom 2–3 sentences for program fit
- [ ] Marketing narrative only if `marketing_spend = allowed` or unclear

### Tier A additional

- [ ] Pitch deck PDF attached
- [ ] Budget excerpt if cash grant
- [ ] Web3 doc if BNB/Binance/Stellar
- [ ] Founder profile PDF
- [ ] Demo video link ready (or live screen-share scheduled)
- [ ] EIN entered **only** in official portal field

---

## 8. Checklist by program type

| Type | Required docs | Marketing narrative? |
|------|---------------|---------------------|
| Cloud credits | One-pager EN, URL, deck (Google) | No |
| Hosting (Vercel) | One-pager EN, URL | No |
| DB (Supabase) | One-pager EN, URL | No |
| Web3 ecosystem | One-pager, Web3 angle, deck, budget | Unclear OK |
| Accelerator | Deck, founder profile, narrative | Case by case |
| Marketing / ad credits | One-pager, marketing capital narrative | Yes |
| Discovery (F6S, OpenGrants) | Profile blurb #8 in outreach | N/A |

---

## 9. Sprint G2.1 completion gates

| Gate | Definition of done |
|------|-------------------|
| **G2.1-A** | First 3 Tier C submits (Vercel, Supabase, Microsoft) |
| **G2.1-B** | One-pager EN PDF exported |
| **G2.1-C** | Google Cloud application submitted |
| **G2.1-D** | Pitch deck PDF v1 |
| **G2.1-E** | BNB MVB draft package ready |

---

*QuickExit, LLC · Application checklist v1.0 · Sprint G2.1*
