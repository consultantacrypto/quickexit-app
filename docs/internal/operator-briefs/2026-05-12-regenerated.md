# Quick Exit Operator — Daily Brief Regenerat din Data Pack Fictiv

**Brief demonstrativ generat manual** din data pack-ul fictiv **2026-05-12**. Nu conține date reale, PII, exporturi live din producție sau informații Stripe. ID-urile (`listing_*`, `demand_*`, `offer_*`, `user_*`) sunt **fictive**.

---

## Data

2026-05-12

---

## Sursă

**Data pack:**

`docs/internal/operator-data-packs/2026-05-12-fictive/`

Fișiere folosite: `listings.csv`, `demands.csv`, `listing_offers.csv`, `demand_offers.csv`, `kyc_summary.csv`, `revenue_summary.csv`, `auctions.csv`, `feedback_items.md`, `notes.md`.

**Acest brief folosește data pack-ul ca sursă numerică de adevăr** pentru demo-ul curent (înlocuiește numerotarea din `2026-05-12-fictive-brief.md` acolo unde existau diferențe).

---

## Rezumat zilei

*(Agregate derivate direct din CSV-uri — scenariu fictiv.)*

- **4** listări **active** (toate rândurile din `listings.csv` au `status=active`).
- **3** cereri **active**.
- **3** oferte către listări (`listing_offers.csv`).
- **2** oferte către cereri (`demand_offers.csv`).
- **5** oferte **totale** (3 + 2).
- **1** licitație deschisă în sensul rândului din `auctions.csv` (`listing_1523c382`).
- **Revenue estimat:** **365 RON** (din `revenue_summary.csv`, valoare fictivă).
- **2** utilizatori cu `recommended_action` **`prompt_kyc`** / **`priority_review`**: `user_83da9725`, `user_a12bc334`.
- **1** utilizator cu **`manual_check`**: `user_buyer772`.
- **3** match-uri posibile principale (vezi secțiunea dedicată).

**Legătură cu `notes.md`:** scenariul urmărește validarea fluxului data pack → brief; match-urile sunt propuse **doar** ca taskuri manuale.

---

## Listări noi / active analizate

### `listing_1523c382` — Telefon premium sigilat

| Câmp | Valoare (din pachet) |
|------|----------------------|
| Categorie | Electronice |
| sale_strategy | auction |
| market_price_eur | 1.500 |
| exit_price_eur | 1.000 |
| discount_percent | 33 |
| offer_count | 2 |
| seller_kyc_status | unverified |
| Risc / observație | Activitate plătită și KYC nefinalizat (`risk_notes_safe`); licitație cu oferte |
| Task recomandat | **Propus** \| **KYC** + **Auction monitor** \| urmărire manuală până la `expires_date` |

### `listing_a81b24ff` — Autoturism urgent

| Câmp | Valoare (din pachet) |
|------|----------------------|
| Categorie | Auto |
| sale_strategy | urgent |
| market_price_eur | 18.000 |
| exit_price_eur | 12.500 |
| discount_percent | 31 |
| offer_count | 1 |
| seller_kyc_status | unverified |
| Risc / observație | Activ mare; verificare manuală recomandată |
| Task recomandat | **Propus** \| **Manual review** seller + ofertă asociată |

### `listing_77cd11aa` — Echipament business

| Câmp | Valoare (din pachet) |
|------|----------------------|
| Categorie | Business |
| sale_strategy | standard |
| market_price_eur | 2.200 |
| exit_price_eur | 1.600 |
| discount_percent | 27 |
| offer_count | 0 |
| seller_kyc_status | verified |
| Risc / observație | Posibil match cu cerere laptop business |
| Task recomandat | **Propus** \| **Demand matching** cu `demand_ab12cd34` |

### `listing_4422ddaa` — Mobilier premium

| Câmp | Valoare (din pachet) |
|------|----------------------|
| Categorie | Home |
| sale_strategy | standard |
| market_price_eur | 3.000 |
| exit_price_eur | 2.100 |
| discount_percent | 30 |
| offer_count | 0 |
| seller_kyc_status | verified |
| Risc / observație | Fără oferte; monitorizare |
| Task recomandat | **Propus** \| **Listing quality** + redistribuire internă (după aprobare) |

---

## Cereri active analizate

### `demand_ab12cd34` — Caut laptop business

| Câmp | Valoare (din pachet) |
|------|----------------------|
| Categorie | Business |
| budget_eur | 1.700 |
| buyer_kyc_status | pending |
| offer_count | 1 |
| Observație | Buget apropiat de `listing_77cd11aa` (exit 1.600); există ofertă `offer_5cc901ee` la 1.600 |
| Task recomandat | **Propus** \| **Demand matching** + clarificare manuală cerere |

### `demand_c98ef210` — Caut auto familie

| Câmp | Valoare (din pachet) |
|------|----------------------|
| Categorie | Auto |
| budget_eur | 13.000 |
| buyer_kyc_status | unverified |
| offer_count | 1 |
| Observație | Posibil match cu `listing_a81b24ff`; buyer neverificat |
| Task recomandat | **Propus** \| **Manual check** buyer + validare ofertă |

### `demand_ff88aa10` — Caut telefon premium

| Câmp | Valoare (din pachet) |
|------|----------------------|
| Categorie | Electronice |
| budget_eur | 900 |
| buyer_kyc_status | verified |
| offer_count | 0 |
| Observație | Posibil interes pentru licitația telefonului (`listing_1523c382`) |
| Task recomandat | **Propus** \| **Demand matching** licitație + educare manuală buget vs exit |

---

## Oferte noi

### Oferte către listări

*(din `listing_offers.csv`)*

| offer_ref | Țintă (listing_ref) | Sumă EUR | status | KYC ofertant | message_quality_score | Risc | Recomandare |
|-----------|---------------------|----------|--------|--------------|----------------------|------|---------------|
| offer_98ab76cd | listing_1523c382 | 900 | new | verified | 8 | Scăzut (mesaj clar) | Monitorizare licitație; nu acceptare automată |
| offer_44fa9921 | listing_a81b24ff | 11.800 | new | unverified | 6 | Mediu (buyer neverificat) | Verificare manuală înainte de pași următori |
| offer_bbb12000 | listing_1523c382 | 850 | new | pending | 5 | Scăzut (sub highest) | Monitorizare; nu presiune automată |

### Oferte către cereri

*(din `demand_offers.csv`)*

| offer_ref | Țintă (demand_ref) | Sumă EUR | status | KYC ofertant (seller_ref) | message_quality_score | Risc | Recomandare |
|-----------|---------------------|----------|--------|---------------------------|----------------------|------|---------------|
| offer_5cc901ee | demand_ab12cd34 | 1.600 | new | verified | 7 | Scăzut | Aliniere bună cu buget; validare umană |
| offer_d11aa402 | demand_c98ef210 | 12.500 | new | unverified | 6 | Ridicat (valoare mare + seller neverificat) | **Manual review** obligatoriu |

---

## Licitații active

### `listing_1523c382` — Telefon premium sigilat

*(din `auctions.csv`, aliniat la `listings.csv` pentru context.)*

| Câmp | Valoare |
|------|---------|
| exit_price_eur | 1.000 |
| offer_count | 2 |
| highest_offer_eur | 900 |
| expires_date | 2026-06-11 |
| days_left | 30 |
| seller_kyc_status | unverified |
| recommended_action | monitorizare ofertă și prompt KYC |

**Clarificare obligatorie:** **nu** există câștigător automat. Orice acceptare, respingere sau follow-up este **decizie manuală** a ownerului, în afara fluxului Operator.

---

## Match-uri posibile

1. **`demand_ab12cd34` ↔ `listing_77cd11aa`**  
   - **Motiv:** buget **1.700** EUR vs **exit_price** **1.600** EUR; categorie **Business**.  
   - **Grad potrivire:** ridicat.  
   - **Status task:** **Propus**.

2. **`demand_c98ef210` ↔ `listing_a81b24ff`**  
   - **Motiv:** buget **13.000** EUR vs **exit_price** **12.500** EUR; categorie **Auto**.  
   - **Grad potrivire:** ridicat.  
   - **Status task:** **Propus**.

3. **`demand_ff88aa10` ↔ `listing_1523c382`**  
   - **Motiv:** buget **900** EUR vs **highest_offer** **900** EUR și **exit_price** **1.000** EUR; categorie **Electronice**.  
   - **Grad potrivire:** mediu (buget la nivelul ofertei curente, sub exit).  
   - **Status task:** **Propus**.

---

## Riscuri KYC / Trust

*(din `kyc_summary.csv` — fără email sau telefon.)*

| user_ref | Situație sintetizată | recommended_action |
|----------|----------------------|----------------------|
| `user_83da9725` | Activitate plătită, 1 listare activă, KYC **unverified** | **prompt_kyc** |
| `user_a12bc334` | Activitate mare (`high_value_activity=true`), KYC **unverified** | **priority_review** |
| `user_buyer772` | Cerere activă, `high_value_activity=true`, KYC **unverified** | **manual_check** |
| `user_c88f102a` | Verificat, fără acțiune obligatorie în pachet | **none** |

---

## Oportunități revenue

*(din `revenue_summary.csv` + coroborare cu listări — **fără** promisiune de vânzare.)*

1. **Licitație cu 2 oferte** (`listing_1523c382`) — posibil follow-up pe pachet licitație / vizibilitate (fictiv: `package_auction_count=1` în agregat).
2. **Autoturism urgent**, discount **31%** — oportunitate de promovare sau follow-up seller manual.
3. **Cerere auto**, buget **13.000** EUR — oportunitate de matching manual cu `listing_a81b24ff`.
4. **Cerere business**, buget **1.700** EUR — match direct cu `listing_77cd11aa` (exit 1.600).
5. **`listing_4422ddaa`** fără oferte — optimizare listare / redistribuire internă (după aprobare).

---

## Feedback de analizat

*(din `feedback_items.md`)*

| Feedback | Severitate | Status în pachet | Observație safe | Task recomandat |
|----------|------------|------------------|-----------------|-----------------|
| Butonul de login trebuie să fie mai clar. | Important | Rezolvat | Zona contului a fost clarificată (scenariu fictiv) | **Amânat** — verificare regresie UI |
| Pozele trebuie să se mărească la click. | Important | În monitorizare | Lightbox de verificat pe mobil | **Propus** \| **Bug / feedback** |
| Vreau să văd mai clar dacă sunt logat. | Polish | Backlog | Poate intra în profil minimal | **Propus** \| **Bug / feedback** |

---

## Drafturi follow-up pentru aprobare

**Aceste texte sunt pentru aprobare manuală. Nu se trimit automat.**

### Draft 1 — Seller KYC după activitate plătită (`user_83da9725`)

„Salut! Ai deja activitate plătită pe Quick Exit. Pentru a crește încrederea cumpărătorilor în anunțul tău, îți recomandăm să finalizezi verificarea contului.”

### Draft 2 — Seller activ mare / review (`user_a12bc334`)

„Salut! Pentru active cu valoare ridicată, recomandăm verificarea contului și completarea informațiilor relevante înainte de discuții avansate cu cumpărătorii.”

### Draft 3 — Buyer cerere auto (`user_buyer772`)

„Salut! Cererea ta pentru auto familie este activă. Pentru oferte mai relevante, poți adăuga detalii despre marcă, an, kilometraj și termenul în care vrei să cumperi.”

### Draft 4 — Seller listare fără oferte (`user_f22aa991`)

„Salut! Anunțul tău este activ, dar nu are încă oferte. Poți crește șansele prin poze suplimentare, descriere mai clară și o eventuală ajustare de preț.”

---

## Taskuri recomandate

| ID task | Tip | Referință | Descriere | Status | Prioritate | Owner | Observații |
|---------|-----|-------------|-----------|--------|------------|-------|------------|
| T-R001 | KYC | user_83da9725 | Prompt KYC după activitate plătită | Propus | Înaltă | Owner | Din `kyc_summary` |
| T-R002 | Manual review | user_a12bc334 / listing_a81b24ff | Review prioritar activ mare + listare | Aprobat | Înaltă | Owner | Aliniat `risk_notes_safe` |
| T-R003 | Manual check | user_buyer772 | Buyer neverificat, cerere valoare mare | Propus | Înaltă | Owner | `manual_check` |
| T-R004 | Demand matching | demand_ab12cd34 ↔ listing_77cd11aa | Validare manuală match business | Propus | Înaltă | Owner | Buget vs exit |
| T-R005 | Demand matching | demand_c98ef210 ↔ listing_a81b24ff | Validare manuală match auto | Propus | Înaltă | Owner | Verificare KYC părți |
| T-R006 | Auction monitor | listing_1523c382 | Monitorizare licitație până la 2026-06-11 | Propus | Medie | Owner | Din `auctions.csv` |
| T-R007 | Listing quality | listing_4422ddaa | Listare fără oferte — îmbunătățire conținut | Propus | Medie | Owner | Din `listings.csv` |
| T-R008 | Revenue opportunity | listing_a81b24ff | Promovare urgență / pachet (fictiv) | Amânat | Medie | Owner | Fără garanție conversie |
| T-R009 | Bug / feedback | UI anunț | Lightbox poze la click | Propus | Medie | Owner | Din feedback_items |
| T-R010 | Bug / feedback | Header/Login | Claritate login / stare cont | Respins | Joasă | Owner | Marcat rezolvat în pachet; închis în demo |

*Niciun task nu are status **Executat manual** în acest brief demonstrativ.*

---

## Ce NU trebuie făcut automat

- Nu trimitem mesaje automat.
- Nu schimbăm statusuri în baza de date.
- Nu aprobăm KYC automat.
- Nu inițiem refund.
- Nu rulăm query-uri în DB live.
- Nu contactăm utilizatori fără aprobare explicită a ownerului.
- Nu facem tranzacții BMK.
- Nu instalăm skills externe.
- Nu luăm decizii finale de fraudă.

---

## Incertitudini / limite

- Data pack-ul este **fictiv**; nu reflectă producția.
- **Nu** există date reale sau validare runtime.
- Match-urile sunt propuse pe **criterii simple** (categorie, buget vs preț); nu înlocuiesc judecata umană.
- Revenue-ul (**365 RON**) este **estimativ și fictiv** în pachet.
- Acțiunile KYC din brief sunt **recomandări**, nu decizii finale.

---

## Verdict

Brief-ul **regenerat** demonstrează fluxul complet **data pack fictiv → analiză read-only → Daily Brief → taskuri propuse** pentru **aprobare umană**, cu **numere și rânduri** aliniate la `docs/internal/operator-data-packs/2026-05-12-fictive/`.

**Reconciliere față de `2026-05-12-fictive-brief.md`:** brief-ul anterior folosea alte cifre (ex. prețuri, bugete, număr de listări în secțiunea „noi”). **De acum, sursa de adevăr pentru demo este acest data pack**; acest document înlocuiește numerotarea veche pentru exercițiul curent.
