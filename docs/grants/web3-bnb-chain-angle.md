# Quick Exit — Web3 & BNB Chain Ecosystem Angle

**Applicant:** QuickExit, LLC · EIN 61-2350228  
**Product:** [www.quickexit.ro](https://www.quickexit.ro) — live RWA liquidity marketplace  
**Strategic integration:** Binance OAuth (in application) · BSC/BNB Chain alignment · BMK legacy community  
**Date:** June 2026

---

## Executive Thesis

Quick Exit is building **verified off-chain liquidity infrastructure** for real-world assets. The Web3 layer is not a token speculation play — it is a **trust and capital signaling bridge**:

> Crypto-native users with on-chain capital history gain frictionless access to **KYC-verified, structured real-asset exits** — while the marketplace remains compliant, non-custodial, and AI-operated.

This positions Quick Exit within the BNB Chain / Binance ecosystem as an **RWA liquidity utility**, complementary to DeFi protocols that lack real-world listing, negotiation, and identity infrastructure.

---

## Problem in Web3 Context

| Web3 state | Real-world gap |
|------------|----------------|
| Users hold BNB, stablecoins, portfolio tokens | No curated pipeline to **verified distressed assets** |
| RWA narratives focus on tokenization | Tokenization without **liquidity events** leaves assets illiquid on-chain |
| Identity is wallet-based only | No KYC bridge for high-value asset transactions |
| DeFi yields are commoditized | Real alpha exists in **below-market physical asset acquisition** |

Quick Exit solves the **off-chain liquidity event** — where verified sellers meet capital-ready buyers — with optional on-chain identity and attestation layers.

---

## Architecture — Three-Layer Bridge

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3 — USER ACCESS                                          │
│  Binance OAuth · Wallet connect (BSC) · BMK tier badge          │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  LAYER 2 — TRUST & ATTESTATION (BNB Chain)                      │
│  Listing metadata hash on-chain · KYC status proof (hashed)     │
│  Timestamped exit-price commitment · Audit trail pointer        │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  LAYER 1 — LIQUIDITY MARKETPLACE (Live — quickexit.ro)          │
│  Listings · Demands · Auctions · Offers · Didit KYC · Stripe  │
│  HQ Copilot AI ops · GA4 analytics                              │
└─────────────────────────────────────────────────────────────────┘
```

**Critical design principle:** Layer 1 remains the **system of record** for marketplace transactions. Layers 2–3 add **verifiability and access** — not custodial settlement.

---

## Binance OAuth Integration (In Progress)

### Objective

Allow users to authenticate with Binance identity, signaling:

- Established crypto account history
- Reduced friction for crypto-native buyers entering the marketplace
- Future pathway to Binance Pay exploration (out of current scope — no commitment in grant)

### Technical scope (grant-funded)

| Phase | Deliverable | Timeline |
|-------|-------------|----------|
| Phase 1 | Binance OAuth login alongside Supabase auth | Q1 |
| Phase 2 | Profile badge: "Binance-linked" + wallet address capture | Q1 |
| Phase 3 | GA4 event: `binance_oauth_linked` for funnel tracking | Q1 |
| Phase 4 | HQ Admin filter: Binance-linked profiles | Q2 |

### Compliance boundaries

- OAuth provides **identity linkage**, not financial advice or custody
- KYC remains **Didit-hosted** for regulatory verification
- No automatic fund movement between Binance and Quick Exit

---

## BNB Chain — Listing Attestation Pilot

### Concept

Selected active listings receive an **on-chain attestation** on BNB Chain (BSC):

| Field | On-chain | Off-chain (Supabase) |
|-------|----------|----------------------|
| Listing ID | Hashed UUID | Full record |
| Category | Enum code | Display name |
| Exit price | Integer (minor units) | Formatted RON |
| KYC-verified seller | Boolean flag | Didit session reference |
| Timestamp | Block timestamp | `created_at` |
| Media | IPFS CID or hash pointer | Full image URLs |

### Why BNB Chain

| Factor | Rationale |
|--------|-----------|
| **Existing BMK community** | Legacy Bitmarket token on BSC; holder tier lab already reads BSC balances |
| **Ecosystem grants** | BNB MVB, Binance Labs alignment |
| **Low attestation cost** | Viable for per-listing hash anchoring at scale |
| **Binance user overlap** | OAuth users likely hold BSC assets |

### Smart contract scope (minimal)

- **AttestationRegistry** — single contract, `anchorListing(hash, metadataURI)` callable by Quick Exit server wallet
- No token issuance
- No AMM / liquidity pool
- No user fund custody

Estimated development: 120 hours (budgeted in `budget-100k.md` Web3 line).

---

## BMK Legacy Layer — Community Bridge

Quick Exit maintains a private **BMK Lab** (`/hq-admin/bmk-lab`) with:

| Feature | Status |
|---------|--------|
| BSC wallet connect | Live (admin-only) |
| BMK balance read | Live |
| Experimental tier mapping | Live (private) |
| Public token payments | **Not in scope** |
| Public swap | **Not in scope** |

### Tier framework (experimental)

| BMK balance | Tier | Potential benefit (non-financial) |
|-------------|------|--------------------------------|
| > 0 | Legacy Watcher | Early feature access |
| ≥ 1,000 | Legacy Member | Priority support |
| ≥ 10,000 | VIP | Beta features |
| ≥ 100,000 | Founder Circle | Direct feedback channel |

Grant narrative: BMK tiers inform **access gating experiments** — not yield, staking, or profit sharing.

---

## RWA Positioning vs. DeFi

| Dimension | DeFi protocol | Quick Exit |
|-----------|---------------|------------|
| Asset type | On-chain tokens | Physical / legal real-world assets |
| Liquidity mechanism | AMM, lending pool | Structured marketplace (offers, auctions) |
| Identity | Wallet-only | Didit KYC + optional Binance OAuth |
| Settlement | On-chain smart contract | Party-to-party (non-custodial) |
| AI role | Limited | Evaluation + HQ Copilot operations |
| Grant fit | Protocol TVL | **Infrastructure + verified exits** |

---

## Ecosystem Value Proposition for BNB Chain

| Stakeholder | Value |
|-------------|-------|
| **BNB Chain Foundation** | Real utility transaction volume (attestations); RWA narrative with live product |
| **Binance** | OAuth user funnel to verified marketplace; Romania/EU market entry |
| **BMK community** | Legacy token holders gain utility pathway to real-asset deals |
| **Developers** | Open attestation schema for third-party RWA indexers |
| **End users** | Crypto capital → verified asset opportunities with KYC trust |

---

## Milestones for Web3 Grant Reporting

| # | Milestone | KPI | Target date |
|---|-----------|-----|-------------|
| W1 | Binance OAuth production | ≥50 linked profiles | Q1 2026 |
| W2 | Wallet badge on profile | ≥100 BSC wallets captured | Q2 2026 |
| W3 | Attestation contract deployed (BSC testnet) | Contract verified on BscScan | Q2 2026 |
| W4 | Attestation contract (BSC mainnet) | ≥20 listings anchored | Q3 2026 |
| W5 | BMK tier → profile badge (public) | ≥10 VIP tier users active | Q3 2026 |
| W6 | Third-party indexer documentation | 1 external integration inquiry | Q4 2026 |

---

## Risk & Compliance Posture

| Risk | Mitigation |
|------|------------|
| Securities classification of attestations | Hash pointers only; no investment promises; no yield |
| Unlicensed money transmission | No custody; no escrow; Stripe for platform fees only |
| Sanctions / AML | Didit KYC required for high-trust flows; Binance OAuth additive |
| Smart contract exploit | Minimal contract surface; server-signed anchors only |
| Token price manipulation (BMK) | No public BMK payments; tier read-only |

---

## What We Ask from BNB Chain / Binance Ecosystem

| Ask | Purpose |
|-----|---------|
| MVB grant ($10K–$100K) | Fund OAuth + attestation engineering |
| Ecosystem marketing support | RWA liquidity case study — live product |
| Developer relations intro | BscScan verification, testnet faucet |
| Binance OAuth approval | Critical path for Layer 3 |
| Optional: Binance Pay exploration call | Future settlement research (no v1 commitment) |

---

## Competitive Landscape

| Player | Focus | Quick Exit differentiation |
|--------|-------|---------------------------|
| Centrifuge, Maple | On-chain credit | We handle **consumer/SMB off-chain exits** |
| RealT | Tokenized real estate | We are **multi-category + negotiation marketplace** |
| OLX, eBay | Classifieds | We add **KYC + AI + structured liquidity** |
| Opensea (RWA experiments) | NFT representation | We start from **real listing, optional anchor** |

---

## Summary Statement

Quick Exit brings **live, verified, AI-operated liquidity infrastructure** to the BNB Chain ecosystem — not as another DeFi yield farm, but as the **off-chain marketplace layer** where real assets actually change hands. Binance OAuth connects the users. BNB Chain attestation proves the listings. Didit KYC proves the people. HQ Copilot proves the operations scale.

**Contact:** vip@quickexit.ro · [quickexit.ro](https://www.quickexit.ro)

---

*QuickExit, LLC · Web3 ecosystem positioning document · June 2026*
