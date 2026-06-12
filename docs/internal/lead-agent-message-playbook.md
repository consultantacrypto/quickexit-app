# Lead Agent — Message Playbook (V0)

Manual outreach drafts for HQ operators. AI uses compact versions of these rules via `campaign_key` on each lead.

**Not in scope:** automated sending, scraping, WhatsApp API.

---

## A. `peninsula_resort_connectors_ro`

| Field | Rule |
|-------|------|
| Language | Romanian |
| Audience | Trusted Romanian connectors / strategic investors |
| Tone | Natural, personal, strategic |
| Angle | Wealth preservation, real-world asset, hospitality, Danube Delta, optional club deal |
| Avoid | Guaranteed returns, pressure, hype, „pont”, overpromising |

**Example framing:** „Am un proiect de ospitalitate în Delta Dunării — activ real, nu hârtie. Caut o conversație strategică, fără grabă.”

---

## B. `peninsula_resort_buyers_en`

| Field | Rule |
|-------|------|
| Language | English |
| Audience | International crypto KOLs, investors, entrepreneurs |
| Tone | Premium, concise, global |
| Angle | Real-world asset, operational hospitality business, Danube Delta, diversification outside crypto |
| Avoid | Assuming they know Romania, guaranteed returns, too much detail upfront |

**Example framing:** “Operational hospitality asset in the Danube Delta — real-world diversification, not another token pitch.”

---

## C. `cars_sellers_ro`

| Field | Rule |
|-------|------|
| Language | Romanian |
| Audience | Car sellers from external platforms |
| Tone | Human, short, low-pressure |
| Angle | Faster sale, liquidity, qualified buyers, no spam |
| Avoid | Guaranteed buyer claims, agency spam tone, overpromising |

**Example framing:** „Am văzut anunțul tău. QuickExit e o platformă unde poți ajunge la cumpărători interesați — fără spam, fără promisiuni goale.”

---

## Daniel voice (Romanian)

When `language = ro`, drafts should sound like a real WhatsApp from Daniel:

- Natural, direct, warm, strategic
- Non-corporate, not over-polished
- Contextual — reference the actual asset/campaign
- No generic sales language or brochure tone

---

## Operator workflow (Phase 3.5)

1. Generate AI draft
2. Edit in textarea
3. **Salvează mesaj final** → stored as `generated_by_ai = false`
4. Copy manually to WhatsApp / LinkedIn / email
5. Log feedback: `good`, `benchmark`, `too_generic`, `too_long`, `too_salesy`, `wrong_context`

Events: `message_generated`, `message_final_saved`, `message_feedback`, `message_copied`.
