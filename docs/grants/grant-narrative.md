# Quick Exit — Grant Narrative

**Working title:** *AI-Enabled Liquidity Infrastructure for Distressed and Under-Utilized Assets*

**Applicant:** QuickExit, LLC (Delaware) · EIN 61-2350228  
**Product:** [www.quickexit.ro](https://www.quickexit.ro) — live production marketplace  
**Date:** June 2026

---

## Executive Summary

Quick Exit is not another classifieds site. It is **liquidity infrastructure** — a vertically integrated digital platform that compresses the time between *"I need to sell this asset"* and *"a verified counterparty is ready to transact."*

We combine a live Romanian marketplace (listings, buy-side demands, auctions, structured offers) with **identity verification (Didit KYC)**, **payments (Stripe)**, **AI-assisted valuation**, and **operator intelligence (HQ Copilot)**. The platform is deployed, monetized, and instrumented with GA4 product analytics.

Our strategic expansion connects **crypto-native capital** to **verified real-world asset exits** via Binance OAuth and BNB Chain ecosystem alignment — positioning Quick Exit as an RWA liquidity rail, not a speculative trading venue.

We are applying for cloud credits, startup accelerators, and Web3 ecosystem grants to fund the next 12–18 months of infrastructure scale, compliance depth, and cross-asset liquidity network effects.

---

## 1. The Market Failure We Address

### 1.1 Liquidity asymmetry in real assets

Real assets — vehicles, SMBs, residential and commercial property, luxury collectibles, professional equipment — represent trillions in global value. Yet **liquidity events** (forced sales, rapid exits, estate liquidations, inventory clearances) remain served by fragmented channels:

| Channel | Strength | Weakness for rapid exit |
|---------|----------|-------------------------|
| Classifieds (OLX, eBay, Facebook) | Reach | Low trust, unstructured negotiation, no verification |
| Brokers / agents | Expertise | Slow, high commission, ill-suited for sub-market exits |
| Auction houses | Price discovery | High friction, narrow categories, long lead times |
| Distressed M&A advisors | Deal quality | Enterprise-only, not accessible to individual sellers |

**Gap:** No purpose-built platform optimizes for **time-to-liquidity** while maintaining **counterparty verification** and **AI-guided pricing** across heterogeneous asset classes.

### 1.2 The buyer side

Capital holders — flippers, micro-PE operators, automotive traders, property investors — actively seek **below-market or time-sensitive opportunities**. They lack a **curated, verified feed** with structured offer mechanics and identity-assured sellers.

Quick Exit's dual-sided model (listings + capital demands + auctions) addresses both sides of this asymmetry.

### 1.3 Why now

| Driver | Relevance to Quick Exit |
|--------|-------------------------|
| AI inference cost decline | Scalable valuation, Copilot ops, seller onboarding at marginal cost |
| KYC API maturity (Didit, Stripe Identity) | Trust layer without building compliance from scratch |
| RWA narrative in Web3 | Institutional and retail interest in tokenized *representations* of real assets — we provide the **off-chain liquidity event** that precedes or complements on-chain rails |
| Romania digital adoption | High mobile penetration, active secondary markets, underserved structured liquidity tools |
| Post-2020 asset churn | Relocations, business closures, generational wealth transfers → elevated distressed supply |

---

## 2. Our Solution — Live Product Architecture

### 2.1 Core marketplace flows

```
Seller journey:
  Evaluate (AI) → Post listing (package) → Stripe checkout → KYC gate → Active listing
  → Offers / auction bids → Negotiation room → Direct party-to-party close

Buyer journey:
  Browse listings / capital demands → View asset → Submit offer / accept exit price
  → Negotiation room → Direct party-to-party close

Operator journey:
  HQ Admin → Listings / demands / offers / KYC profiles / risk flags
  → HQ Copilot (daily | risk | priorities | growth) → Action queue
```

### 2.2 Monetization (live)

| Revenue line | Mechanism | Price point (RON) |
|--------------|-----------|-------------------|
| Listing — Economy | 30-day exposure | 99 |
| Listing — Standard | 14-day fast sale | 79 |
| Listing — Urgent | 60-day validation package | 179 |
| Listing — Auction | 30-day open auction | 111 |
| Demand post | Buy-side capital listing | 99 |
| Offer fee | Per-offer checkout (select flows) | Package-based |

Stripe webhooks activate listings/demands upon successful payment — no manual gate for standard flows.

### 2.3 Trust & compliance layer

- **Didit KYC:** Hosted verification flow; webhook status mapping to `profiles.kyc_status`
- **Stripe KYC path:** Production fallback provider via `KYC_PROVIDER` configuration
- **RLS-hardened Supabase:** Row-level security on listings, offers, demands, profiles
- **Privacy-minimized GA4:** No PII in analytics events; operational IDs only

Quick Exit explicitly does **not** provide escrow, custody, or payment intermediation between transacting parties — reducing regulatory surface while maintaining marketplace utility.

### 2.4 AI layer — two distinct roles

| System | Function | Data boundary |
|--------|----------|---------------|
| **Evaluation API** | Seller-facing asset pricing guidance by category | User-submitted asset attributes; no PII in model prompts beyond session context |
| **HQ Copilot** | Admin-facing operational intelligence (Gemini) | Server-side snapshot: listings, demands, offers, profiles, valuation reports, risk resolutions; optional GA4 funnel data |

This separation (documented in `docs/internal/ai-roles-boundary.md`) ensures AI augments **liquidity decisions** without automating irreversible compliance actions.

### 2.5 Categories & sale strategies

**Categories:** Auto & Moto · Imobiliare · Lux & Ceasuri · Afaceri de vânzare · Gadgets · Foto & Audio

**Sale strategies:** Fixed exit price · Custom offers · Open auction (30-day packages)

---

## 3. Traction & Evidence of Execution

| Dimension | Evidence |
|-----------|----------|
| **Production deployment** | quickexit.ro on Vercel; Next.js 16 App Router |
| **Payments** | Stripe Checkout live; webhook-driven activation |
| **Identity** | Didit KYC live; dashboard initiation flow |
| **Admin intelligence** | HQ Copilot with structured JSON output modes |
| **Analytics** | 30+ GA4 events across seller, buyer, checkout, offer funnels |
| **SEO** | Structured data (Organization, FAQ), sitemap, investor/seller landing pages |
| **Security posture** | RLS audit documentation; performance smoke tests pre-go-live |
| **Beta operations** | Internal feedback roadmap; operator data pack exports |

We are past prototype. Grant funding accelerates **scale and ecosystem integration**, not initial build.

---

## 4. Strategic Expansion — Web3 & RWA Bridge

### 4.1 Thesis

Crypto holders accumulate on-chain capital but face friction deploying into **verified real-world opportunities**. Quick Exit provides the **off-chain liquidity marketplace** where:

1. Identity is verified (KYC)
2. Assets are structured (listings, demands, auctions)
3. AI assists pricing and operator triage
4. Wallet linkage (Binance OAuth — in application) signals capital seriousness without replacing fiat settlement

### 4.2 BMK legacy layer

Quick Exit maintains a private **BMK Lab** (BSC token read-only tier detection) for legacy Bitmarket community alignment. This informs optional VIP access tiers — not public token payments in current production scope.

### 4.3 What we will NOT do with grant funds

- Public token sales or ICO-style fundraising
- Custodial escrow of buyer/seller funds
- Unlicensed securities offerings tied to listing performance
- APY / staking / yield promises on platform tokens

Grant narrative emphasizes **infrastructure** and **verified liquidity rails**.

---

## 5. Grant Alignment — Why Fund Quick Exit?

| Funder objective | Quick Exit deliverable |
|------------------|------------------------|
| **Cloud / AI credits** | Scale Copilot inference, evaluation API, image processing, admin batch jobs |
| **Startup program** | GTM mentorship, Romania → EU expansion playbook, B2B liquidity partnerships |
| **Web3 ecosystem grant** | Binance OAuth integration, wallet-verified profiles, RWA listing attestations on BNB Chain |
| **Fintech / identity grant** | Didit + multi-provider KYC, fraud signals, audit trail hardening |
| **Regional innovation** | First structured liquidity marketplace in Romania with AI ops layer |

---

## 6. 12-Month Outcomes (Grant-Funded)

| Quarter | Milestone |
|---------|-----------|
| Q1 | Binance OAuth MVP; wallet-linked profile badge; Copilot v2 with GA4 auto-ingest |
| Q2 | Dynamic pricing experiments (manual V0); buyer alert system; mobile performance pass |
| Q3 | BNB Chain listing attestation pilot (hash-anchored metadata); expanded KYC tiers |
| Q4 | EU-adjacent GTM; B2B white-label liquidity API exploration; 10× listing throughput capacity |

Success metrics:

- Active listings growth (monthly)
- Offer submission rate per listing view
- KYC completion rate
- Copilot-actioned risk resolutions
- Cloud cost efficiency per AI inference
- Web3-linked profile adoption rate

---

## 7. Team & Governance

| Role | Name | Responsibility |
|------|------|----------------|
| Manager / Founder | Mihai Daniel | Product, engineering, GTM, compliance coordination |

QuickExit, LLC operates under Delaware law with registered agent Legalinc Corporate Services Inc. All grant reporting will be issued under the legal entity with EIN 61-2350228.

---

## 8. Risk Disclosure (Transparent)

| Risk | Mitigation |
|------|------------|
| Two-sided marketplace cold start | Dual funnels (seller + buyer demands); SEO content; investor/seller landing pages |
| Regulatory evolution (KYC / marketplace) | No custody; clear disclaimers; multi-provider KYC; Delaware LLC structure |
| AI hallucination in valuation | Confidence scores; data quality labels; human operator review in HQ |
| Web3 integration complexity | Phased OAuth → read-only wallet → attestation; no on-chain payments in v1 |
| Single-founder bandwidth | Grant funds engineering contractors; Copilot reduces ops load |

---

## 9. Supporting Documents in This Pack

| Document | Purpose |
|----------|---------|
| `quick-exit-one-pager-en.md` | English summary for international grant portals |
| `quick-exit-one-pager-ro.md` | Romanian summary for local programs |
| `budget-100k.md` | Line-item $100K allocation |
| `target-grants-list.md` | Prioritized grant matrix |
| `web3-bnb-chain-angle.md` | BNB Chain / Binance ecosystem positioning |
| `pitch-deck-outline.md` | Slide-by-slide deck structure |
| `grant-crm-template.md` | Application tracking CRM |

---

## 10. Closing Statement

Quick Exit has built and shipped **liquidity infrastructure** — not a slide deck. With grant support, we will extend this live platform into the **intersection of AI operations, verified identity, and real-world asset liquidity** — including a disciplined Web3 bridge for crypto-native capital.

We invite partners who fund **production-grade infrastructure** to join us in making distressed and under-utilized assets move faster, safer, and smarter.

**QuickExit, LLC**  
vip@quickexit.ro · [quickexit.ro](https://www.quickexit.ro)
