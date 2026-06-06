# Quick Exit — PDF Export Checklist

**Sprint:** G2.1 · Grant Execution Pack  
**Applicant:** QuickExit, LLC (Delaware Limited Liability Company)  
**Last updated:** June 2026

---

## 1. Files to export (Markdown → PDF)

| Priority | Source file | Recommended PDF filename | Pages (est.) | Primary use |
|:--------:|-------------|---------------------------|:------------:|-------------|
| **P0** | `quick-exit-one-pager-en.md` | `QuickExit_OnePager_EN_2026-06.pdf` | 2 | All grant portals, outreach |
| **P0** | `pitch-deck-outline.md` → slides* | `QuickExit_PitchDeck_2026-06.pdf` | 12–14 | Google Cloud, BNB MVB, accelerators |
| **P1** | `quick-exit-one-pager-ro.md` | `QuickExit_OnePager_RO_2026-06.pdf` | 2 | Romania / EU programs |
| **P1** | `web3-bnb-chain-angle.md` | `QuickExit_Web3_BNB_Angle_2026-06.pdf` | 6–8 | BNB MVB, Binance, Stellar |
| **P1** | `founder-profile.md` | `QuickExit_Founder_MihaiDaniel_2026-06.pdf` | 2–3 | Accelerators, Tier A |
| **P1** | `grant-narrative.md` | `QuickExit_GrantNarrative_Full_2026-06.pdf` | 8–12 | Cash grants, innovation |
| **P1** | `grant-narrative.md` (§1–3 only) | `QuickExit_GrantNarrative_ExecSummary_2026-06.pdf` | 3 | Email attachments |
| **P1** | `budget-100k.md` | `QuickExit_Budget_100K_2026-06.pdf` | 4–6 | MVB, AWS, cash grants |
| **P2** | `marketing-capital-narrative.md` | `QuickExit_LiquidityActivation_2026-06.pdf` | 4–6 | Meta, Google ad credits |
| **P2** | `target-grants-list.md` | `QuickExit_TargetGrants_Internal_2026-06.pdf` | 4 | Consultant only — **internal** |
| **P2** | `application-checklist.md` | `QuickExit_ApplicationChecklist_Internal_2026-06.pdf` | 3 | Team only — **internal** |

\* Deck requires building slides in Google Slides, Figma, or PowerPoint from `pitch-deck-outline.md` — outline alone is not submission-ready.

---

## 2. Recommended folder structure (local — not in git)

```
QuickExit_GrantDataRoom_2026-06/
├── Public/
│   ├── QuickExit_OnePager_EN_2026-06.pdf
│   ├── QuickExit_OnePager_RO_2026-06.pdf
│   ├── QuickExit_PitchDeck_2026-06.pdf
│   ├── QuickExit_Founder_MihaiDaniel_2026-06.pdf
│   ├── QuickExit_Web3_BNB_Angle_2026-06.pdf
│   ├── QuickExit_GrantNarrative_ExecSummary_2026-06.pdf
│   ├── QuickExit_LiquidityActivation_2026-06.pdf
│   └── QuickExit_Budget_100K_2026-06.pdf
├── OfficialPortalsOnly/
│   ├── EIN_CP575_or_147C.pdf          ← never in git
│   ├── DE_Certificate_of_Formation.pdf
│   └── QuickExit_OnePager_EN_EIN_2026-06.pdf  ← version WITH EIN for portals
└── Internal/
    ├── QuickExit_TargetGrants_Internal_2026-06.pdf
    └── QuickExit_ApplicationChecklist_Internal_2026-06.pdf
```

---

## 3. Pre-export verification (every file)

### Content accuracy

- [ ] Entity: **QuickExit, LLC** · **Delaware Limited Liability Company** (not corporation)
- [ ] Product URL works: https://www.quickexit.ro
- [ ] Contact: vip@quickexit.ro · Mihai Daniel, Manager
- [ ] Binance OAuth: **requested / in progress** — not approved, not live
- [ ] No fabricated users, revenue, MAU, or partnerships
- [ ] Grant amounts labeled as estimates / ranges — not guarantees
- [ ] Milestone KPIs (≥50 wallets, etc.) labeled as **grant-funded targets**, not current traction

### EIN handling

| PDF version | EIN on document? |
|-------------|------------------|
| `QuickExit_OnePager_EN_2026-06.pdf` (public) | **Optional — omit** for email/consultant |
| `QuickExit_OnePager_EN_EIN_2026-06.pdf` (portal) | **Yes** — footer only; folder `OfficialPortalsOnly/` |
| Pitch deck | EIN on slide 1 or 14 footer — portal version only |
| Outreach attachments | **No EIN** |

### Brand / visual

- [ ] Neo-brutalist palette if designed: black, `#FFD100`, `#FDFCF8`
- [ ] Real quickexit.ro screenshots in deck (not mockups)
- [ ] Logo consistent
- [ ] PDF under 5MB per portal limits (compress if needed)
- [ ] Fonts embedded
- [ ] No `.env` or credential screenshots

### Pitch deck slide 14 fix (from audit)

- [ ] Closing line says **building toward** crypto bridge — not "ready to bridge" unless OAuth is live

---

## 4. Export methods

| Method | Best for |
|--------|----------|
| **Google Docs / Slides → PDF** | One-pagers, deck (collaborative) |
| **VS Code Markdown PDF extension** | Fast narrative exports |
| **Pandoc** | `pandoc quick-exit-one-pager-en.md -o QuickExit_OnePager_EN_2026-06.pdf` |
| **Figma → PDF** | Designed deck |

**Do not commit PDFs to git** unless repo policy explicitly allows — store in local data room or secure cloud (Drive/Dropbox with access control).

---

## 5. What goes in the data room

### Public data room (share link with consultants / ecosystem managers)

| Include | Exclude |
|---------|---------|
| One-pager EN PDF | EIN documents |
| Pitch deck PDF (no EIN version) | Operating Agreement |
| Founder profile PDF | API keys |
| Web3 angle PDF | Internal CRM |
| Exec summary narrative | Raw user data |
| Budget PDF | `.env` |
| Liquidity activation PDF | |
| Demo video link (YouTube unlisted / Loom) | |

### Official portal uploads only

| Include |
|---------|
| One-pager with EIN |
| EIN confirmation letter |
| Certificate of Formation |
| Portal-specific forms |

### Never in any data room

- Stripe secret keys, Didit secrets, Supabase service role
- User PII, KYC documents
- Unredacted internal security audit with sensitive paths
- Fabricated traction spreadsheets

---

## 6. Export order (Sprint G2.1)

| Step | Action | Unblocks |
|------|--------|----------|
| 1 | Export `QuickExit_OnePager_EN_2026-06.pdf` | Vercel, Supabase, Microsoft, outreach |
| 2 | Build + export `QuickExit_PitchDeck_2026-06.pdf` | Google Cloud, BNB MVB |
| 3 | Export `QuickExit_Web3_BNB_Angle_2026-06.pdf` | BNB MVB, Binance |
| 4 | Export `QuickExit_Founder_MihaiDaniel_2026-06.pdf` | Accelerators |
| 5 | Export `QuickExit_Budget_100K_2026-06.pdf` | Cash grants |
| 6 | Export `QuickExit_LiquidityActivation_2026-06.pdf` | Meta, Google Ads |
| 7 | Create `OfficialPortalsOnly/` EIN versions | Google Cloud portal |

---

## 7. Post-export sign-off

| Reviewer | Sign-off | Date |
|----------|----------|------|
| Mihai Daniel | Content accuracy | |
| Mihai Daniel | EIN only in portal folder | |
| Mihai Daniel | Binance OAuth wording | |

---

## 8. Attachment matrix (quick reference)

| Program | PDFs to attach |
|---------|----------------|
| Google Cloud | One-pager EIN, deck, — |
| Vercel | One-pager |
| Supabase | One-pager |
| Microsoft | One-pager, deck |
| BNB MVB | One-pager, Web3, deck, budget |
| Binance inquiry | One-pager, Web3 + demo link |
| Meta / Google Ads | One-pager, liquidity activation |
| Stripe / Didit email | One-pager |
| F6S / OpenGrants | Profile blurb + one-pager link |

---

*QuickExit, LLC · PDF export checklist · Sprint G2.1*
