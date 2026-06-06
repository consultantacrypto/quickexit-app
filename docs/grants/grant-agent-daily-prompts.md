# Quick Exit — Grant Agent Daily Prompts

**Purpose:** Copy-paste prompts for Cursor Grant Agent to execute the Monthly 50 Grants Operating System.  
**Applicant:** QuickExit, LLC · EIN 61-2350228 · [quickexit.ro](https://www.quickexit.ro)  
**Pair with:** `monthly-50-grants-operating-system.md` · `grant-scoring-model.md` · `monthly-application-calendar.md`  
**Last updated:** June 2026

---

## Agent Rules (Always Active)

```
GRANT AGENT RULES — Quick Exit LLC

1. Work only in docs/grants/ unless explicitly asked to export PDFs.
2. Never fabricate user counts, revenue, or approval rates.
3. Never modify app code.
4. Frame all GTM spend as "liquidity activation campaigns" (see marketing-capital-narrative.md).
5. Every opportunity must be scored with grant-scoring-model.md before submission recommendation.
6. Composite < 6.0 → do not recommend submission.
7. Update grant-crm-template.md fields: cash_or_credits, marketing_spend, us_llc_eligible,
   deadline, effort_tier, probability, next_action.
8. Delaware LLC EIN 61-2350228 — product live at www.quickexit.ro.
9. Do not run npm build for markdown-only changes.
10. Report: submissions today, cumulative/month, next actions, blockers.
```

---

## Prompt 1 — Monday Discovery

```
GRANT AGENT — MONDAY DISCOVERY

Task: Find 20 new grant/program opportunities for Quick Exit LLC this month.

Context:
- Delaware LLC, EIN 61-2350228, live platform quickexit.ro
- AI liquidity infrastructure for real-world assets
- Need: cash, cloud credits, Web3 grants, ad credits (Meta/TikTok/Instagram/Google),
  startup programs, innovation grants
- Non-dilutive only (skip equity >10% unless flagged)

Sources to search:
- Google for Startups, AWS Activate, Microsoft Founders, BNB MVB, Binance Labs
- Meta/Google/TikTok startup ad programs
- Vercel, Supabase, Stripe, Didit partner programs
- Grant aggregators, EU SME funding, US economic resilience programs

Output format — table in docs/grants/ (append to monthly batch notes or new file
docs/grants/batches/M50-YYYY-MM-raw.md):

| program_name | url | category | cash_or_credits | marketing_spend | us_llc_eligible | deadline | source |

Find at least:
- 4 cash
- 4 cloud
- 3 web3
- 4 marketing/ad
- 3 innovation
- 2 accelerators

Do not score yet. Do not submit. Report count by category.
```

---

## Prompt 2 — Tuesday Scoring

```
GRANT AGENT — TUESDAY SCORING

Task: Score all unscored opportunities in this month's raw batch using grant-scoring-model.md.

For each opportunity calculate D1–D7 (1–10), composite score, effort tier (A/B/C),
probability (low/medium/high), and next_action.

Output table:

| id | program_name | d1 | d2 | d3 | d4 | d5 | d6 | d7 | composite | tier | marketing_spend | us_llc_eligible | next_action |

Rules:
- Apply marketing boost (+0.5) if marketing_spend=allowed AND category is cash or marketing
- Skip (flag REJECT) if us_llc_eligible=no without partner path
- Skip if composite < 6.0

Sort by composite descending.
Recommend top 50 for monthly quota.
Report: how many REJECTED, how many Tier A/B/C in top 50.
```

---

## Prompt 3 — Wednesday Tier Assignment

```
GRANT AGENT — WEDNESDAY TIER ASSIGNMENT

Task: Finalize the 50-opportunity monthly batch (5A + 15B + 30C).

Read: monthly-application-calendar.md for category minimums.

Verify category floors:
- Cash ≥5, Cloud ≥10, Web3 ≥5, Accelerator ≥3, Marketing ≥15, Innovation ≥5

If short on any category, pull next-highest composite from rejected pool or discover 5 more.

Create CRM entries G-YYYYMM-001 through G-YYYYMM-050 in a new file:
docs/grants/batches/M50-YYYY-MM-crm.md

Include all fields from grant-scoring-model.md Section 3.

Report gaps and promotions (B→A) made.
```

---

## Prompt 4 — Thursday Document Prep

```
GRANT AGENT — THURSDAY DOCUMENT PREP

Task: Prepare submission documents for this week's calendar slots.

Read monthly-application-calendar.md for this week's IDs.

Tier A (customize):
- 2-paragraph fit statement per program
- Budget excerpt from budget-100k.md (adjust liquidity activation line if marketing allowed)
- Pull marketing language from marketing-capital-narrative.md if marketing_spend=allowed

Tier B:
- 3-sentence cover letter per program using quick-exit-one-pager-en.md facts

Tier C:
- Confirm 150-word boilerplate from monthly-50-grants-operating-system.md Section 6

Output: docs/grants/batches/M50-YYYY-MM-drafts.md

Do NOT submit externally. Drafts only.
Report: drafts ready count vs calendar target.
```

---

## Prompt 5 — Friday Week Summary

```
GRANT AGENT — FRIDAY WEEK SUMMARY

Task: Weekly KPI report for grant pipeline.

Read CRM batch file and count:
- Submissions this week (by tier)
- Cumulative this month / 50
- Category distribution vs minimums
- Avg composite of submitted
- Marketing-allowed apps count
- Follow-ups sent
- Responses received
- Blockers

Output: docs/grants/batches/M50-YYYY-MM-week{N}-summary.md

Include:
1. Scoreboard table
2. Top 3 wins
3. Top 3 blockers
4. Next week calendar slots from monthly-application-calendar.md
5. Recommended scoring calibration changes
```

---

## Prompt 6 — Daily Submission (Weekdays Week 2–4)

```
GRANT AGENT — DAILY SUBMISSION ASSIST

Today: [OPERATOR FILLS: Week N, Day name]
Calendar target today: [X] submissions from monthly-application-calendar.md

For each CRM ID scheduled today:
1. Confirm composite ≥ 6.0 and status = To Apply
2. Select correct narrative:
   - marketing_spend=allowed → marketing-capital-narrative.md excerpts
   - marketing_spend=not_allowed → cloud/AI/compliance framing
   - marketing_spend=unclear → Section 11 soft framing
3. List required attachments
4. Draft any remaining custom paragraphs
5. Set next_action = "Operator submit + log date"
6. Prepare follow-up date (+14d for A, +21d for B, +30d for C)

Output submission checklist for operator — do not submit externally.

Report: ready / blocked per ID.
```

---

## Prompt 7 — Wednesday Follow-Up (Week 4 + Rolling)

```
GRANT AGENT — FOLLOW-UP DAY

Task: Process follow-up queue.

Read grant-crm-template.md contact log and all batch CRM files.

Find applications where:
- Tier A and submitted ≥14 days ago → follow-up #1
- Tier A and submitted ≥30 days ago → follow-up #2
- Tier B and submitted ≥21 days ago → follow-up #1
- Tier B and submitted ≥45 days ago → follow-up #2
- Tier C and submitted ≥30 days ago → portal check note

Draft emails using template from monthly-50-grants-operating-system.md Section 11.
Personalize per program_name and submission date.

Output: docs/grants/batches/M50-YYYY-MM-followups.md

Report: emails drafted, portal checks noted, any stale >60d flagged for reapply/skip.
```

---

## Prompt 8 — Marketing Capital Application

```
GRANT AGENT — MARKETING CAPITAL APPLICATION

Task: Draft full marketing-allowed grant section for [PROGRAM NAME].

Read marketing-capital-narrative.md completely.

Include:
1. Executive summary block (Section 2)
2. Liquidity activation framework (Section 4)
3. Channel strategy for Meta, TikTok, Instagram, Google (Section 5)
4. Budget table scaled to grant ceiling: $[AMOUNT] (Section 6)
5. KPI table (Section 7) — use "establish baseline" not fake numbers
6. Controlled experiment protocol (Section 8)
7. Compliance language (Section 10)

Customize:
- Grant ceiling $[X]
- Primary market: Romania
- Live product URL: quickexit.ro
- GA4 attribution reference

Output: docs/grants/batches/[program-slug]-marketing-section.md
```

---

## Prompt 9 — Month-End Retrospective

```
GRANT AGENT — MONTH-END RETROSPECTIVE

Task: Close monthly 50 batch M50-YYYY-MM.

Verify:
- 50 submissions logged
- All category minimums met
- All Tier A/B/C quotas met
- Rejection reasons logged 100%
- Co-funding tracker updated
- Hours spent estimated

Create: docs/grants/retrospectives/YYYY-MM.md

Sections:
1. Executive summary
2. KPI scoreboard vs monthly-50-grants-operating-system.md Section 9
3. Approvals / credits received (actual, not projected)
4. Best and worst performing categories
5. Scoring model calibration recommendations
6. Next month Tier A shortlist (5 programs with composite)
7. Marketing capital narrative feedback from reviewers

Do not inflate results.
```

---

## Prompt 10 — Ad Credit Blitz (Tier C Volume)

```
GRANT AGENT — AD CREDIT BLITZ

Task: Prepare 10 Tier C quick applications for ad/marketing credits.

Target programs: Meta Business, Google Ads promotions, TikTok for Business,
Instagram (via Meta), Reddit ads startup, LinkedIn credits, Microsoft Advertising,
Amazon Ads, Twitter/X ads, Pinterest business offers.

Per program (15 min effort):
- 150-word boilerplate
- marketing-capital-narrative.md Section 13 one-paragraph
- CRM row with marketing_spend=allowed, tier=C, est_effort=0.25

Output table with signup URL, required fields, and operator submit order.

Goal: complete 10 in single session for operator form-fill.
```

---

## Prompt 11 — Web3 Strategic (Tier A)

```
GRANT AGENT — WEB3 TIER A APPLICATION

Task: Customize Tier A application for [BNB MVB / Binance Labs / Web3 program].

Read: web3-bnb-chain-angle.md, grant-narrative.md, budget-100k.md Web3 lines.

Draft:
1. RWA liquidity thesis (not DeFi speculation)
2. Three-layer bridge architecture summary
3. Binance OAuth status (in application)
4. BMK legacy community bridge
5. Milestones W1–W6 from web3 doc
6. Compliance exclusions (no custody, no token sale)
7. Budget: Web3 integration engineer 120hrs

Output: docs/grants/batches/[program-slug]-web3-application.md
Length: 800–1200 words.
```

---

## Prompt 12 — Scoring Dispute / Override

```
GRANT AGENT — SCORING REVIEW

Operator requests review of [PROGRAM NAME] scored as [X].

Re-score D1–D7 with written rationale per dimension.
Check overrides: LLC block, marketing boost, dilution flag.
Recommend: SUBMIT / SKIP / DEFER

If DEFER: specify what information is needed (eligibility confirmation, deadline, etc.)

Output concise scoring memo.
```

---

## Daily Schedule — Which Prompt When

| Day | Week 1 | Week 2 | Week 3 | Week 4 |
|-----|--------|--------|--------|--------|
| Mon | P1 Discovery | P6 Submission | P6 Submission | P6 Submission |
| Tue | P2 Scoring | P6 Submission | P6 Submission | P6 Submission |
| Wed | P3 Tier assign | P6 Submission | P6 Submission | **P7 Follow-up** |
| Thu | P4 Doc prep | P6 Submission | P6 Submission | P6 + P9 if month-end |
| Fri | P5 Summary | P5 Summary | P5 Summary | P9 Retrospective |

**On-demand:** P8 (marketing), P10 (ad blitz), P11 (Web3), P12 (scoring review)

---

## Operator Handoff Template

After agent runs daily prompt, operator receives:

```
HANDOFF — [Date]
Submissions ready: [N]
CRM IDs: [list]
Blocked: [list + reason]
Follow-ups drafted: [N]
Operator action: Submit forms at [URLs], log dates in CRM, send follow-up emails.
```

---

## Follow-Up Process — Full Protocol

### Stage 1 — Pre-follow-up check (Day before)

| Check | Action |
|-------|--------|
| Portal status changed? | Update CRM status |
| Rejection email received? | Log in rejection log |
| Interview invite? | Move to Interview/DD |
| Additional docs requested? | Priority draft within 48h |

### Stage 2 — Follow-up send

| Tier | Template | Channel |
|------|----------|---------|
| A | Full email (operating system Section 11) | Email + portal message |
| B | Short email (3 sentences + URL) | Email |
| C | Portal note only | Portal |

### Stage 3 — Response handling

| Response | CRM update | Next action |
|----------|------------|-------------|
| Approved | `Approved` + amount | Milestone report template |
| More info needed | `Interview/DD` | Draft response in 48h |
| Rejected | `Rejected` + reason | Reapply date if applicable |
| No response | Keep `Applied` | Escalate at next follow-up tier |

### Stage 4 — Stale closure (Day 90)

| Condition | Action |
|-----------|--------|
| No response 90d | Status → `Stale` |
| Reapply window open | Schedule in next month batch |
| Program closed | Status → `Rejected` (closed) |

---

## Monthly KPI Targets (Agent Reporting)

Copy into every Friday summary:

| KPI | Target |
|-----|--------|
| Applications submitted | 50 |
| Tier A | 5 |
| Tier B | 15 |
| Tier C | 30 |
| Avg composite | ≥ 7.0 |
| Marketing-allowed apps | ≥ 12 |
| Follow-ups sent | ≥ 20 |
| Responses | ≥ 5 |
| Approvals | ≥ 2 |
| Hours | ≤ 85 |

---

## File Naming Convention

| File | Pattern |
|------|---------|
| Raw discoveries | `docs/grants/batches/M50-YYYY-MM-raw.md` |
| Scored list | `docs/grants/batches/M50-YYYY-MM-scored.md` |
| CRM batch | `docs/grants/batches/M50-YYYY-MM-crm.md` |
| Drafts | `docs/grants/batches/M50-YYYY-MM-drafts.md` |
| Week summary | `docs/grants/batches/M50-YYYY-MM-weekN-summary.md` |
| Follow-ups | `docs/grants/batches/M50-YYYY-MM-followups.md` |
| Retrospective | `docs/grants/retrospectives/YYYY-MM.md` |
| Program-specific | `docs/grants/batches/[program-slug]-*.md` |

---

*QuickExit, LLC · Grant Agent daily prompts v1.0 · June 2026*
