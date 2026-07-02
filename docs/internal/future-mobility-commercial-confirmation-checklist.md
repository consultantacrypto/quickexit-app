# Future Mobility — Commercial Confirmation Checklist (internal)

Checklist obligatoriu înainte de transformarea unui `.draft.json` în payload seed și publicare.

**Regulă:** `commercial_status` rămâne `pending_partner_confirmation` până când toate itemii critici de mai jos sunt confirmați de AutoConsul (sau entitatea contractuală desemnată).

---

## 1. Identitate comercială

- [ ] `contract_entity` — entitatea care semnează contractul cu clientul
- [ ] `invoice_entity` — entitatea care emite factura
- [ ] `partner_contact` — email/telefon validat pentru follow-up ofertă
- [ ] `details.dealer_partner.website` — URL validat
- [ ] `details.dealer_partner.contact_email` — confirmat
- [ ] `details.dealer_partner.contact_phone` — confirmat

## 2. Preț și plată

- [ ] `commercial_confirmation.public_price` — preț orientativ sau interval confirmat pentru RO
- [ ] `listing.exit_price` — aliniat cu prețul publicabil QuickExit
- [ ] `listing.market_price` — dacă se afișează comparație (opțional, dar dacă există trebuie confirmat)
- [ ] `commercial_confirmation.deposit` — avans / rezervare
- [ ] `commercial_confirmation.included_costs` — ce include (transport, homologare, taxe — doar dacă confirmat)

## 3. Livrare

- [ ] `commercial_confirmation.delivery_estimate` — termen realist
- [ ] `details.delivery_estimate` — sincronizat cu confirmarea
- [ ] `details.delivery_note` — copy aprobat legal

## 4. Configurație produs

- [ ] `commercial_confirmation.available_configurations` — versiuni importabile
- [ ] `commercial_confirmation.available_colors` — culori efectiv disponibile pentru RO
- [ ] Variantele din `details.variants` reflectă doar ce poate fi comandat
- [ ] Specs variant-dependent (AVATR, ZEEKR) completate din fișă tehnică

## 5. Garanție, service, omologare

- [ ] `commercial_confirmation.warranty_romania` — text aprobat (fără „garanție oficială” neconfirmată)
- [ ] `commercial_confirmation.service_romania` — rețea / procedură
- [ ] `commercial_confirmation.homologation` — status și responsabilități
- [ ] `details.warranty.summary` — sincronizat
- [ ] `details.import.homologation_note` — sincronizat

## 6. Legal & copy

- [ ] Fără „dealer oficial”, „importator autorizat”, „cel mai ieftin”
- [ ] Copy parteneriat QuickExit × AutoConsul aprobat
- [ ] FAQ fără promisiuni neconfirmate
- [ ] `internal_validation.legal_copy_status` = `approved`

## 7. Media

- [ ] Toate pozițiile `image_manifest` = `ready` + `rights_status` = `cleared`
- [ ] `listing.images[]` populate cu URL-uri Storage
- [ ] `details.videos[]` — doar URL YouTube validate (dacă se publică)

## 8. Tehnic & runtime

- [ ] `parseFutureMobilityDetails(details)` trece
- [ ] `internal_validation.ready_for_seed` = `true`
- [ ] `commercial_status` = `confirmed`
- [ ] Zero `REPLACE_WITH_*` în JSON seed final

---

## Semn-off

| Rol | Nume | Dată | OK |
|-----|------|------|-----|
| AutoConsul — comercial | | | |
| QuickExit — ops | | | |
| QuickExit — legal (dacă aplicabil) | | | |

După semn-off: generare `*.seed.json` și rulare manuală `scripts/seed-future-mobility-listing.ts`.
