# Quick Exit — Grant Scoring Model

**Purpose:** Standardize go/no-go and tier assignment (A/B/C) for all grant opportunities.  
**Scale:** 1–10 per dimension · Composite weighted score · Decision thresholds  
**Applicant:** QuickExit, LLC · EIN 61-2350228 · [quickexit.ro](https://www.quickexit.ro)  
**Last updated:** June 2026

---

## 1. Scoring Dimensions (1–10)

| # | Dimension | Weight | 1 (Poor) | 10 (Excellent) |
|---|-----------|-------:|----------|----------------|
| D1 | **Strategic fit** — liquidity infrastructure, live product, AI marketplace | 20% | Unrelated sector | Perfect narrative alignment |
| D2 | **Non-dilutive value** — cash, credits, ad spend (no equity) | 20% | Equity-only / zero value | Large cash or credits, no dilution |
| D3 | **Marketing spend eligibility** | 15% | Explicitly prohibited | Explicitly allows GTM / acquisition |
| D4 | **US LLC eligibility** | 15% | Not eligible | Delaware LLC explicitly eligible |
| D5 | **Probability of approval** | 10% | <5% (hyper-competitive) | >40% (rolling intake, perks) |
| D6 | **Effort efficiency** — value per hour | 10% | >8 hrs for <$500 value | <30 min for meaningful credits |
| D7 | **Time sensitivity** | 10% | Deadline passed / 12+ months | Open rolling / deadline within 30 days |

### Composite formula

```
Composite = (D1×0.20) + (D2×0.20) + (D3×0.15) + (D4×0.15) + (D5×0.10) + (D6×0.10) + (D7×0.10)
```

**Round to one decimal.**

---

## 2. Decision Thresholds

| Composite | Decision | Tier | Action |
|----------:|----------|------|--------|
| ≥ 8.5 | **Strong apply** | A or B | Prioritize this week; customize narrative |
| 7.0 – 8.4 | **Apply** | B or C | Standard or quick submission |
| 6.0 – 6.9 | **Conditional** | C only | Apply only if monthly quota needs filler |
| < 6.0 | **Skip** | — | Log reason; do not submit |

### Automatic overrides

| Condition | Override |
|-----------|----------|
| D4 ≤ 3 (US LLC ineligible) | **Skip** unless EU partner path documented |
| D2 = 1 (equity required >10%) | **Skip** for monthly 50 system (track separately) |
| D3 = 1 AND program is cash grant | Cap composite at 5.0 — marketing narrative unusable |
| D3 ≥ 8 AND D2 ≥ 7 | **Boost tier** — prioritize for liquidity activation funding |
| Duplicate application < reapply window | **Skip** |

---

## 3. Required CRM Fields

Every opportunity must have these fields before submission. Align with `grant-crm-template.md`.

| Field | Type | Values / format |
|-------|------|-----------------|
| `id` | String | `G-YYYYMM-###` (e.g. `G-202606-001`) |
| `program_name` | String | Official program name |
| `category` | Enum | `cash` · `cloud` · `web3` · `accelerator` · `marketing` · `innovation` |
| `cash_or_credits` | Enum | `cash` · `credits` · `mixed` · `perks` · `unknown` |
| `est_value_usd` | Range | e.g. `$2K–$50K` |
| `marketing_spend` | Enum | `allowed` · `unclear` · `not_allowed` |
| `us_llc_eligible` | Enum | `yes` · `no` · `unclear` · `with_partner` |
| `deadline` | Date / text | `YYYY-MM-DD` or `Rolling` |
| `effort_tier` | Enum | `A` · `B` · `C` |
| `est_effort_hours` | Number | 0.25 – 8 |
| `probability` | Enum | `low` · `medium` · `high` |
| `d1` – `d7` | Number | 1–10 per dimension |
| `composite` | Number | Calculated |
| `status` | Enum | See `grant-crm-template.md` |
| `next_action` | String | Specific next step + date |
| `owner` | String | Default: Mihai Daniel |
| `notes` | Text | Eligibility quirks, contacts |

---

## 4. Marketing Spend Field — Scoring Guide

| Value | D3 score | Definition | Narrative action |
|-------|:--------:|------------|------------------|
| **allowed** | 8–10 | Guidelines mention marketing, GTM, customer acquisition, ad spend | Use full `marketing-capital-narrative.md` |
| **unclear** | 4–7 | General "operating expenses" or "growth" language | Frame as "market validation research" + liquidity activation; note ambiguity in notes |
| **not_allowed** | 1–3 | R&D only, infrastructure only, explicit exclusion | Redirect budget to cloud/AI/compliance; no Meta/Google/TikTok line items |

### Quick Exit priority boost

When `marketing_spend = allowed` AND `category ∈ {cash, marketing}`:

```
Adjusted composite = Composite + 0.5 (cap at 10.0)
```

---

## 5. US LLC Eligibility — Scoring Guide

| Value | D4 score | Notes |
|-------|:--------:|-------|
| **yes** | 9–10 | Delaware LLC explicitly accepted |
| **unclear** | 5–6 | "US companies" without LLC specificity — proceed Tier B/C |
| **with_partner** | 4–5 | Requires EU entity; score separately for RO subsidiary path |
| **no** | 1–2 | Skip unless strategic worth partner investment |

---

## 6. Probability Field — Mapping

| Label | D5 score | Signals |
|-------|:--------:|---------|
| **high** | 8–10 | Rolling intake, perk portals, auto-approve credits, referral paths |
| **medium** | 5–7 | Competitive but fit-strong; prior cohort acceptance data |
| **low** | 1–4 | Single-winner grants, government RFP, >1000 applicants |

---

## 7. Effort Tier Assignment

After composite score, assign effort tier:

| Tier | Criteria |
|------|----------|
| **A** | Composite ≥ 8.0 AND (cash ≥ $10K OR Web3 strategic OR accelerator interview path) |
| **B** | Composite 6.5–8.4 OR cloud/startup programs requiring one-pager |
| **C** | Composite 6.0–7.4 AND est_effort ≤ 0.5 hrs OR marketing perk portal |

**Monthly quota override:** If Tier A slots unfilled, promote highest composite from B → A.

---

## 8. Worked Examples

### Example 1 — Google for Startups Cloud

| Field | Value |
|-------|-------|
| Category | cloud |
| cash_or_credits | credits |
| est_value_usd | $2K–$200K |
| marketing_spend | not_allowed |
| us_llc_eligible | yes |
| deadline | Rolling |

| Dim | Score | Rationale |
|-----|------:|-----------|
| D1 | 9 | Gemini Copilot + evaluation API |
| D2 | 8 | High credit ceiling |
| D3 | 2 | Infra only |
| D4 | 10 | US startup eligible |
| D5 | 8 | Rolling, common approval |
| D6 | 7 | ~2 hrs for strong value |
| D7 | 9 | Rolling |

**Composite:** (9×.2)+(8×.2)+(2×.15)+(10×.15)+(8×.1)+(7×.1)+(9×.1) = **7.7** → **Tier B** (promote to **Tier A** if monthly cloud anchor slot open)

---

### Example 2 — Meta Ad Credits (startup offer)

| Field | Value |
|-------|-------|
| Category | marketing |
| cash_or_credits | credits |
| est_value_usd | $500–$5K |
| marketing_spend | allowed |
| us_llc_eligible | yes |
| deadline | Rolling |

| Dim | Score | Rationale |
|-----|------:|-----------|
| D1 | 7 | Seller acquisition for liquidity |
| D2 | 6 | Moderate credit value |
| D3 | 10 | Explicit ad credit |
| D4 | 9 | US business account |
| D5 | 7 | Moderate approval |
| D6 | 9 | 15-min form |
| D7 | 9 | Rolling |

**Composite:** 7.8 + 0.5 boost = **8.3** → **Tier B** or **Tier C** based on effort (likely **Tier C** for volume)

---

### Example 3 — BNB Chain MVB

| Field | Value |
|-------|-------|
| Category | web3 |
| cash_or_credits | cash |
| est_value_usd | $10K–$300K |
| marketing_spend | unclear |
| us_llc_eligible | yes |
| deadline | Cohort-based |

| Dim | Score | Rationale |
|-----|------:|-----------|
| D1 | 10 | RWA liquidity rail, BSC alignment |
| D2 | 9 | Cash grant potential |
| D3 | 5 | Ecosystem growth budget unclear |
| D4 | 9 | Global builders |
| D5 | 5 | Competitive cohort |
| D6 | 5 | 6–8 hrs application |
| D7 | 7 | Cohort deadline |

**Composite:** **7.8** → **Tier A**

---

### Example 4 — Romania-only government grant (no US entity)

| Field | Value |
|-------|-------|
| Category | innovation |
| cash_or_credits | cash |
| marketing_spend | unclear |
| us_llc_eligible | no |

| Dim | Score |
|-----|------:|
| D4 | 1 |

**Override:** **Skip** — unless RO subsidiary plan activated.

---

## 9. Monthly Scoring Workflow

```
1. Import opportunity → fill required CRM fields
2. Score D1–D7 → calculate composite
3. Apply overrides (marketing boost, LLC block)
4. Assign effort tier (A/B/C)
5. Set next_action + deadline
6. Operator approves Tier A list (Monday Week 1)
7. Submit per monthly-application-calendar.md
8. Post-submission: log actual effort hours for D6 calibration
```

---

## 10. Category-Specific Minimum Scores

| Category | Min composite to submit | Notes |
|----------|------------------------:|-------|
| Cash grants | 7.0 | Higher bar — custom reporting |
| Cloud credits | 6.5 | Volume-friendly |
| Web3 | 7.0 | Strategic alignment required |
| Accelerators | 7.5 | Check dilution separately |
| Marketing / ad credits | 6.0 | Volume play — Tier C |
| Innovation | 6.5 | Watch LLC eligibility |

---

## 11. Scoring Calibration — Monthly Review

| Metric | Action if off-target |
|--------|---------------------|
| Avg composite of submitted < 7.0 | Raise floor or improve discovery sources |
| Approval rate < 4% | Shift mix toward high-probability Tier C |
| >30% time on Tier A | Reduce A slots to 4 next month |
| Marketing apps < 12 | Add Meta/Google/TikTok sources |

---

## 12. Quick Reference Card

| Composite | Tier | Marketing allowed? | Submit? |
|----------:|------|-------------------|---------|
| ≥ 8.5 | A/B | Any | Yes — priority |
| 7.0–8.4 | B/C | Preferred if D3 ≥ 8 | Yes |
| 6.0–6.9 | C | If D3 ≥ 8 | Conditional |
| < 6.0 | — | — | No |

---

*QuickExit, LLC · Grant scoring model v1.0 · Pair with grant-crm-template.md · June 2026*
