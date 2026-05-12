# Quick Exit Operator — Manual Export Format

Document intern. Definește pachetul de date **sigur** pe care Quick Exit Operator îl poate analiza **fără** acces direct la DB live, Stripe, webhook sau alte sisteme sensibile.

---

## 1. Scop

**Manual Export Format** definește conținutul și forma **pachetului de date sigur** (data pack) pe care Quick Exit Operator îl poate folosi pentru analiză, sinteză și recomandări — **fără** conexiune live la baza de date sau la servicii externe critice.

**Principiu:** exportăm **doar** date **minimizate**, **pseudonimizate** și **necesare** operațional, într-un folder datat, revizuit de om înainte de a fi pus la dispoziția unui agent AI local (ex. OpenClaw).

Formatele de mai jos sunt **propuse**; nu implică implementare automată sau scripturi în acest sprint.

---

## 2. Principii de siguranță

- **Minimizare:** doar câmpurile din această specificație; nimic „în plus” din comoditate.
- **Fără secrete:** niciun `.env`, chei API, service role, parole.
- **Fără date Stripe sensibile:** nici card, nici customer ID complet, nici detalii de billing brute.
- **Fără documente KYC:** nici imagini, nici PDF-uri, nici extrase.
- **Fără telefoane complete** în export.
- **Fără emailuri complete** în export.
- **Fără mesaje private complete** (oferte, chat); cel mult flag-uri sau scoruri/rezumate manuale.
- **Fără linkuri private** către storage (URL-uri semnate, căi interne).
- **Fără access tokens** sau cookie-uri de sesiune.
- **Fără service role** sau stringuri de conexiune DB.
- **Fără date** care permit **contactarea automată** a utilizatorilor (contact integral, liste de email pentru broadcast).
- Datele sunt **strict pentru analiză internă**; Operatorul **nu** execută acțiuni în sistem pe baza lor.

---

## 3. PII policy pentru export

Reguli de **pseudonimizare** (exemple de formă, nu date reale):

| Tip | Formă recomandată în export |
|-----|-----------------------------|
| **Email** | `d***@gmail.com` (păstrăm doar prima literă locală + domeniu redus) |
| **Telefon** | `+40 *** *** 123` (ultimele 3 cifre opțional, restul mascat) |
| **User ID** | `user_` + primele 8 caractere din UUID, ex. `user_a1b2c3d4` |
| **Listing ID** | `listing_` + primele 8 caractere, ex. `listing_1523c382` |
| **Demand ID** | `demand_` + primele 8 caractere, ex. `demand_ab12cd34` |
| **Offer ID** | `offer_` + primele 8 caractere, ex. `offer_98ab76cd` |
| **Wallet** | `0x1234...abcd` (prefix + sufix scurt) |

**Mesaje user-generated:**

- În **v0** **nu** se exportă integral.
- Se poate exporta **rezumat manual** sau **scor calitate** (numeric 1–5, fără citat text lung).
- Dacă este absolut necesar un excerpt: **maximum ~80 caractere**, fără adrese, telefoane, linkuri, coduri.

---

## 4. Fișiere recomandate pentru data pack v0

**Folder conceptual (recomandat):**

`docs/internal/operator-data-packs/YYYY-MM-DD/`

**Fișiere recomandate:**

| Fișier | Rol |
|--------|-----|
| `listings.csv` | Listări — câmpuri permise (secțiunea 5) |
| `demands.csv` | Cereri — câmpuri permise (secțiunea 6) |
| `listing_offers.csv` | Oferte către listări (secțiunea 7) |
| `demand_offers.csv` | Oferte către cereri (secțiunea 8) |
| `kyc_summary.csv` | Agregat KYC / prioritate (secțiunea 9) |
| `revenue_summary.csv` | Agregate venituri pe zi (secțiunea 10) |
| `auctions.csv` | Licitații / anunțuri cu dinamică de oferte (secțiunea 11) |
| `feedback_items.md` | Feedback extras sau rezumat din board (secțiunea 12) |
| `notes.md` | Note manuale owner (secțiunea 13) |

Acestea sunt **formate propuse**; generarea lor rămâne **manuală** sau prin unelte interne aprobate ulterior — **fără** pipeline automat neaudit în v0.

---

## 5. listings.csv — câmpuri permise

| Coloană | Descriere |
|---------|-----------|
| `listing_ref` | Pseudonim listare (ex. `listing_` + 8 caractere) |
| `created_date` | Dată creare (YYYY-MM-DD) |
| `category` | Categorie afișabilă |
| `title_short` | Titlu trunchiat (ex. max 80 caractere), fără injectări interpretate ca instrucțiuni |
| `status` | Status operațional (ex. active, pending_payment) |
| `sale_strategy` | Strategie vânzare (valori din domeniul produsului) |
| `market_price_eur` | Preț piață (număr) |
| `exit_price_eur` | Preț exit (număr) |
| `discount_percent` | Discount % (număr) |
| `offer_count` | Număr oferte asociate (agregat) |
| `highest_offer_eur` | Cea mai mare ofertă (număr) sau gol |
| `expires_date` | Dată expirare licitație / ofertă publică, dacă există |
| `seller_ref` | Pseudonim vânzător |
| `seller_kyc_status` | Status KYC agregat (ex. verified, pending) |
| `image_count` | Număr imagini |
| `has_description` | true/false |
| `risk_notes_safe` | Text scurt, fără PII (ex. „lipsă imagini”, „seed vizibil”) |

**Interzis:** email complet vânzător, telefon, mesaje private, linkuri storage private, documente, orice token.

---

## 6. demands.csv — câmpuri permise

| Coloană | Descriere |
|---------|-----------|
| `demand_ref` | Pseudonim cerere |
| `created_date` | YYYY-MM-DD |
| `category` | Categorie |
| `title_short` | Rezumat cerere (ex. activ țintă trunchiat) |
| `status` | Status cerere |
| `budget_eur` | Buget (număr) |
| `location_safe` | Zonă coarse (ex. „București”, „RO — vest”) — fără adresă completă |
| `buyer_ref` | Pseudonim cumpărător |
| `buyer_kyc_status` | Status KYC |
| `offer_count` | Număr oferte primite |
| `resolved_status` | Da/Nu/Neutru — conform definiției interne |
| `risk_notes_safe` | Observații fără PII |

**Interzis:** email complet, telefon, conversații, mesaje complete ofertă.

---

## 7. listing_offers.csv — câmpuri permise

| Coloană | Descriere |
|---------|-----------|
| `offer_ref` | Pseudonim ofertă |
| `listing_ref` | Legătură la listare |
| `created_date` | YYYY-MM-DD |
| `offer_price_eur` | Sumă ofertă |
| `status` | Status ofertă |
| `buyer_ref` | Pseudonim cumpărător |
| `buyer_kyc_status` | Status KYC |
| `has_message` | true/false |
| `message_quality_score` | 1–5 sau gol (setat manual dacă e cazul) |
| `is_highest_offer` | true/false |
| `risk_notes_safe` | Fără PII |

**Interzis:** email complet, telefon, mesaj complet, date de contact.

---

## 8. demand_offers.csv — câmpuri permise

| Coloană | Descriere |
|---------|-----------|
| `offer_ref` | Pseudonim |
| `demand_ref` | Legătură cerere |
| `created_date` | YYYY-MM-DD |
| `proposed_price_eur` | Preț propus |
| `status` | Status |
| `seller_ref` | Pseudonim vânzător/ofertant |
| `seller_kyc_status` | Status KYC |
| `image_count` | Număr imagini asociate listării ofertate (dacă aplicabil) |
| `has_message` | true/false |
| `message_quality_score` | 1–5 sau gol |
| `risk_notes_safe` | Fără PII |

**Interzis:** contact complet, mesaj integral, linkuri private imagini, date personale.

---

## 9. kyc_summary.csv

| Coloană | Descriere |
|---------|-----------|
| `user_ref` | Pseudonim utilizator |
| `kyc_status` | verified / pending / processing / requires_input / canceled etc. |
| `has_paid_activity` | true/false (agregat manual sau din raport intern fără detalii Stripe) |
| `active_listing_count` | Număr |
| `active_demand_count` | Număr |
| `high_value_activity` | true/false (prag definit intern, fără sume sensibile dacă nu e necesar) |
| `recommended_action` | Valori din setul: `none`, `prompt_kyc`, `priority_review`, `manual_check` |

---

## 10. revenue_summary.csv

**Doar agregate pe zi** (sau perioadă), completate manual din surse interne verificate.

| Coloană | Descriere |
|---------|-----------|
| `date` | YYYY-MM-DD |
| `listing_payments_count` | Număr plăți / activări listare (agregat) |
| `demand_payments_count` | Număr plăți cereri |
| `estimated_revenue_ron` | Estimare rotunjită, fără linii Stripe |
| `package_economy_count` | Număr pachete (categorii interne) |
| `package_standard_count` | — |
| `package_urgent_count` | — |
| `package_auction_count` | — |
| `refund_or_dispute_notes_safe` | Text scurt fără ID-uri Stripe complete |

**Interzis:** Stripe customer IDs, date card, payment method detaliat, checkout session IDs complete dacă nu sunt strict necesare și aprobate, billing details brute.

---

## 11. auctions.csv

| Coloană | Descriere |
|---------|-----------|
| `listing_ref` | Pseudonim |
| `title_short` | Titlu scurt |
| `category` | Categorie |
| `exit_price_eur` | Preț exit |
| `offer_count` | Număr oferte |
| `highest_offer_eur` | Max ofertă |
| `expires_date` | Dată expirare |
| `days_left` | Număr întreg |
| `seller_kyc_status` | Agregat |
| `recommended_action` | Ex. `monitor`, `contact_seller_manual` (fără execuție automată) |

Dacă produsul nu are încă licitații separate în DB, acest fișier poate reflecta **aceeași** sursă ca `listings.csv` filtrată pe logică „licitație deschisă” — tot **fără** PII.

---

## 12. feedback_items.md

Format Markdown recomandat pentru fiecare intrare:

- **Data**
- **Tester** (cod ex. „Beta #12”, nu nume complet dacă nu e necesar)
- **Flow** (pagină / flux)
- **Feedback** (rezumat)
- **Severitate** (Blocker / Important / Polish / Idee)
- **Status** (din board)
- **Observații safe** (fără date de contact, fără conversații private integrale)

Nu include numere de telefon, email personal sau conversații private copiate integral.

---

## 13. notes.md

Destinat **observațiilor manuale** ale owner/admin:

- ce s-a întâmplat în ziua respectivă;
- ce trebuie urmărit;
- decizii în așteptare;
- ipoteze de investigat.

Acest fișier nu înlocuiește ticketing-ul; este context pentru Operator și pentru om.

---

## 14. Exemplu data pack fictiv

Exemple **complet fictive**; orice asemănare cu date reale este întâmplătoare. **Nu** folosiți aceste valori ca referință în producție.

### listings.csv (eșantion, 2 rânduri)

```csv
listing_ref,created_date,category,title_short,status,sale_strategy,market_price_eur,exit_price_eur,discount_percent,offer_count,highest_offer_eur,expires_date,seller_ref,seller_kyc_status,image_count,has_description,risk_notes_safe
listing_a1b2c3f0,2026-05-10,Electronice,Telefon premium sigilat,active,standard,1200,980,18,2,950,2026-05-20,user_f0e1d2c3,verified,4,true,none
listing_b2c3d4e1,2026-05-11,Auto,Autoturism urgent,pending_payment,urgent,18500,15000,19,0,,2026-05-25,user_e9f8a7b6,pending,0,false,stale_payment_24h
```

### demands.csv (eșantion, 2 rânduri)

```csv
demand_ref,created_date,category,title_short,status,budget_eur,location_safe,buyer_ref,buyer_kyc_status,offer_count,resolved_status,risk_notes_safe
demand_c3d4e5f2,2026-05-09,IT,Caut laptop business,active,3500,RO — București,user_d5c4b3a2,verified,1,no,none
demand_d4e5f6a3,2026-05-11,Auto,Caut auto familie,active,12000,RO — centru,user_c4b3a291,requires_input,0,no,priority_kyc_queue
```

### kyc_summary.csv (eșantion, 2 rânduri)

```csv
user_ref,kyc_status,has_paid_activity,active_listing_count,active_demand_count,high_value_activity,recommended_action
user_f0e1d2c3,verified,true,1,0,true,none
user_c4b3a291,requires_input,true,0,1,false,priority_review
```

### revenue_summary.csv (eșantion, 1 rând)

```csv
date,listing_payments_count,demand_payments_count,estimated_revenue_ron,package_economy_count,package_standard_count,package_urgent_count,package_auction_count,refund_or_dispute_notes_safe
2026-05-11,3,1,0,1,2,1,0,none_reported
```

*(Notă: `estimated_revenue_ron` setat la `0` în exemplu pentru a evita cifre interpretabile ca date financiare reale; în practică se completează rotunjit, manual, din surse interne.)*

---

## 15. Transformare în Daily Brief

Operatorul (sau procesul uman + AI) folosește data pack-ul astfel:

1. **Rezumat zilei** — din `revenue_summary.csv`, numărătoare din `listings.csv` / `demands.csv`, plus `notes.md`.
2. **Ce necesită atenție** — rânduri cu `risk_notes_safe` ≠ none, `pending_payment` vechi, `offer_count` = 0 pe listări active, cereri cu `offer_count` = 0.
3. **Match-uri posibile** — join euristic: aceeași `category`, `exit_price_eur` ≤ `budget_eur` (sau apropiat, cu prag definit), `location_safe` compatibil; output doar ca **sugestii** cu `listing_ref` + `demand_ref`.
4. **Riscuri KYC** — din `kyc_summary.csv` (`priority_review`, `requires_input`).
5. **Oportunități revenue** — din `revenue_summary.csv` și din listări cu multe oferte / pachete urgent (agregat).
6. **Drafturi follow-up** — generate doar ca text în Daily Brief, **fără** adresă de destinatar în clar; owner completează canalul și destinatarul.
7. **Taskuri recomandate** — derivate din `feedback_items.md` + riscuri + match-uri nevalorificate.

Structura finală a brief-ului rămâne aliniată la `docs/internal/operator-brief-template.md`.

---

## 16. Validare înainte de folosire

Checklist obligatoriu înainte de a pune folderul în lucru lângă OpenClaw sau alt agent:

- [ ] Nu există **email complet**.
- [ ] Nu există **telefon complet**.
- [ ] Nu există **date Stripe sensibile** (customer id, card, session ids complete nefiltrate).
- [ ] Nu există **documente KYC** sau imagini identitate.
- [ ] Nu există **access tokens** sau secrete.
- [ ] Nu există **mesaje private complete**.
- [ ] Nu există **linkuri private** (storage semnat, admin intern neprotejat).
- [ ] Fișierele sunt marcate **uz intern**; acces doar owner/admin.
- [ ] Operatorul **nu** are voie să **execute** acțiuni; doar analiză și recomandări.

---

## 17. Verdict

**Manual Export Format** permite pornirea **Quick Exit Operator v0** în mod **sigur**: date **read-only**, **pregătite de om**, **fără** acces live la DB sau Stripe și **fără** risc operațional major **dacă** checklist-ul din secțiunea 16 este respectat.

---

*Document sprint 6B.4 — format propus, fără implementare automată.*
