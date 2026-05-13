# Quick Exit — RLS Test Set 4: Demand Owner

## 1. Context

Raport **read-only** pentru **Test Set 4 — Demand Owner** din `docs/internal/rls-privacy-execution-plan.md` (secțiunea **„## 9. Test Set 4 — Demand Owner”**), pentru utilizatorul care deține **cereri de cumpărare** (`demands` ca `buyer_id` / proprietar cerere).

Legături cu sprinturile anterioare: **7A.8** — imagini `demand_offers` cu **URL publice**; **7A.9** — `handleOfferAction` și `UPDATE` doar cu `.eq('id', …)`; **7A.5** — capital public doar cereri **active**.

### 1.1 Plan și rapoarte anterioare (FAZA 1)

**Din `docs/internal/rls-privacy-execution-plan.md` — §9 Test Set 4 (Demand owner):**

| Plan # | Conținut | Corespondență sprint |
|--------|----------|----------------------|
| 4.1 | Propria cerere (dashboard / capital) | D1 |
| 4.2 | `pending_payment` propriu vs anon | D2 (+ paralel 7A.5) |
| 4.3 | Oferte primite pe `demand_id` al lui D | D3 |
| 4.4 | Fără oferte pe cerere alt user | D4 |
| 4.5 | Accept / refuz doar pe cereri proprii | D5 |
| 4.6 | Fără `UPDATE` demand altuia | D6 |

**Din `docs/internal/rls-privacy-checklist.md`:** verificările pe `demands` / `demand_offers` (vizibilitate owner, fără enumerare anon, update protejat) sunt aliniate cu testele D1–D6, D7–D10 extind la public, mesaje, contact, insert.

**Ce rămâne PARTIAL din rapoarte anterioare și afectează Demand Owner:**

- **7A.5 (public anon):** listări publice + cereri — verdict PARTIAL; pentru owner: **D7** se bazează pe același tip de query filtrat `active` + RLS.
- **7A.7 (User A seller):** update ownership listări doar cu `.eq('id')` — **același pattern** ca **D5/D6** pe `demands` / `demand_offers`.
- **7A.8 (Storage):** imagini ofertă — URL publice; impact **D3** (owner vede URL-uri în dashboard) și **D9/D10** indirect.
- **7A.9 (User B buyer):** insert/update ofertă depinde de RLS — **D5**, **D10**.

**Red flag transversal:** `demand_offers` + imagini + câmpuri text (mesaj/descriere) — combină confidențialitate ofertă cu politica publică bucket (deja semnalat în 7A.8).

---

## 2. Metodă

- **Audit static:** `app/dashboard/page.tsx`, `app/posteaza-cerere/PosteazaCerereClient.tsx`, `app/capital-disponibil/CapitalDisponibilClient.tsx`, `app/trimite-oferta/[id]/page.tsx`, `app/api/checkout-demand/route.ts`, `app/api/webhook/route.ts` (ramuri `demands`).
- **Grep:** `.from('demands')`, `.from('demand_offers')` în `app/`.
- **Fără** service role, fără date test noi, fără modificări DB/RLS/cod.

---

## 3. Rezumat rezultate

| Test ID | Scenariu | Așteptat | Observat | Status | Severitate | Note |
|---------|-----------|----------|----------|--------|------------|------|
| D1 | User D vede propria cerere | `demands` filtrate pe owner | Dashboard: `.from('demands').select('*').eq('buyer_id', user.id)` | **PASS** | None | — |
| D2 | User D vede `pending_payment` propriu | Fără excludere status în query | Același query ca D1 — **fără** `.eq('status','active')` pe `myDemands` | **PASS** | None | — |
| D3 | User D vede ofertele primite | `demand_offers` legate de cererile sale | `demandIds` din `myDemands` → `.from('demand_offers').select(…).in('demand_id', demandIds)` | **PASS** | None | Include `seller_phone`, `seller_email`, `images`, `asset_description` |
| D4 | User D nu vede oferte pe cererile altui buyer | Fără `demand_id` străin | Setul `demandIds` derivat exclusiv din `myDemands` | **PASS** | None | RLS rămâne strat final |
| D5 | Accept/Refuz doar pe cererea proprie | Owner + policy | UI: butoane pe carduri din `myDemandOffers`; `handleOfferAction` face `update` cu **doar** `.eq('id', offerId)` | **PARTIAL** | Medium | Identic pattern **7A.9** — **RLS** obligatoriu |
| D6 | User D nu modifică demandul altuia | Update cu verificare owner | `toggleDemandStatus` / `markDemandAsResolved`: `.from('demands').update(…).eq('id', …)` **fără** `buyer_id` în `WHERE` | **PARTIAL** | Medium | **RLS** obligatoriu |
| D7 | Public vede doar demands active | Query public filtrat | `CapitalDisponibilClient`: `.from('demands').select('*').eq('status', 'active')` | **PASS** | None | Eșantion cod; **RLS** pentru leak |
| D8 | User D nu vede mesaje oferte pe cereri străine | Izolare query | Nu există listare `demand_offers` fără legătură cu `demand_id` ∈ cererile userului | **PASS** | None | — |
| D9 | Date contact neautorizate | Fără leak public | Capital: cereri active — câmpuri din `select('*')` depind de schema/RLS; **nu** există în cod afișare explicită telefon/email **cumpărător** pe cardurile din `CapitalDisponibilClient` în auditul rapid (buget, activ, descriere) | **PARTIAL** | Low | Descriere publică poate conține PII introdusă de user — **produs** |
| D10 | Insert `demand_offers` fără spoofing `seller_user_id` | ID din sesiune | `trimite-oferta`: `if (!user?.id)` înainte de flux; insert cu `seller_user_id: user.id` | **PASS** | None | **RLS** trebuie `auth.uid() = seller_user_id` |

---

## 4. Detalii pe test

### D1 / D2 — Cereri proprii (toate statusurile în dashboard)

- **Pași:** `fetchDashboardData` — bloc cereri.
- **Rezultat:** **PASS**.

### D3 / D4 — Oferte primite

- **Pași:** `listingIds`/`demandIds` → `demand_offers.in('demand_id', demandIds)`.
- **Rezultat:** **PASS** pentru modelul din cod.

### D5 — Accept / Refuz

- **Pași:** `handleOfferAction(offerId, action, 'demand')`.
- **Observații:** același `update`…`.eq('id', offerId)` ca pentru `listing_offers`.
- **Rezultat:** **PARTIAL**.
- **Manual:** User D încearcă `UPDATE` pe `offerId` al unei cereri care nu îi aparține.

### D6 — Update `demands`

- **Pași:** `toggleDemandStatus`, `markDemandAsResolved`.
- **Rezultat:** **PARTIAL**.
- **Manual:** idem cu `demandId` străin.

### D7 — Capital public

- **Pași:** `CapitalDisponibilClient.tsx`.
- **Rezultat:** **PASS** (filtru `active` în cod).

### D8 — Mesaje străine

- **Pași:** audit singura sursă `myDemandOffers`.
- **Rezultat:** **PASS**.

### D9 — Contact

- **Pași:** capital vs dashboard (ofertă acceptată — contact **vânzător** ofertă, intenționat).
- **Rezultat:** **PARTIAL** (descriere publică cerere).

### D10 — Spoofing seller

- **Pași:** `trimite-oferta` `submitOffer`.
- **Rezultat:** **PASS** în cod.

### Notă suplimentară — `trimite-oferta` încărcare cerere

- **`fetchDemand`:** `.from('demands').select('*').eq('id', id).single()` — **fără** `.eq('status','active')` în query.
- **UI:** afișează eticheta „Status activ” fără a citi `buyer.status` — risc de **inconsistență** dacă RLS returnează cerere neactivă; protecția reală = **RLS** + validare produs.

---

## 5. Suprafețe de risc Demand Owner

| Zonă | Detaliu |
|------|---------|
| **Creare cerere** | `PosteazaCerereClient`: insert `demands` cu `buyer_id: user.id`, `status: pending_payment` → checkout **checkout-demand** → webhook activează |
| **`pending_payment`** | Vizibil owner în dashboard; **nu** în listarea publică capital (D7) |
| **`demand_offers`** | Primite: query prin `demand_id` ∈ cereri proprii; câmpuri sensibile (contact vânzător, imagini) |
| **Accept/Refuz** | `handleOfferAction` — dependență **RLS** |
| **`toggleDemandStatus` / resolved** | Update `demands` după `id` — dependență **RLS** |
| **Public** | Doar `active` în capital; homepage `app/page.tsx` — `demands` cu `.eq('status','active')` (limit 9) |
| **`trimite-oferta`** | Seller răspunde la cerere: citire cerere după `id` — **RLS** trebuie să limiteze la cereri ofertabile |
| **`checkout-demand` (API)** | `POST` primește `demandId` din body și creează sesiune Stripe **fără** verificare în acest fișier că apelantul este `buyer_id` al cererii (fără JWT server-side). Activarea efectivă rămâne în **webhook** după plată. Risc de abuz flux / plată pentru `demandId` arbitrar — **în afara RLS strict**, dar relevant pentru **integritate cerere**; confirmare manuală. |

---

## 6. Red flags

1. **Update `demands` / `demand_offers` fără `buyer_id` în `WHERE`** — același tip ca listările (**7A.7**).
2. **`trimite-oferta`:** cerere încărcată fără filtru `status` în client + badge „Status activ” **hardcodat** — risc UX/confidențialitate dacă RLS e prea permisiv.
3. **Imagini ofertă** publice (bucket `listings`) — vezi **7A.8**.
4. **Nu** s-a găsit: listare publică a `demand_offers` sau insert cu `seller_user_id` din formular liber.
5. **`app/api/checkout-demand/route.ts`:** lipsă legare explicită `demandId` ↔ utilizator autentificat în ruta API (observație statică; nu înlocuiește audit RLS pe `demands`).

---

## 7. Blocked / necesită test manual

- **User D** + cereri `pending_payment` / `active` + oferte primite.
- **RLS:** `UPDATE demands`, `UPDATE demand_offers`, `SELECT demands` pe `trimite-oferta` pentru cerere `pending_payment` / alt `buyer_id`.
- **Network** pentru payload-uri după acțiuni.
- Verificare **capital** că nu apare `pending_payment` în JSON.

---

## 8. Concluzie

**Verdict general: PARTIAL**

**Motiv:** citirile pentru **cereri proprii** și **oferte primite** sunt **bine legate** în cod de `buyer_id` / `demand_id`-uri derivate din portofoliul utilizatorului, iar capitalul public filtrează **`active`**. **Update**-urile pe cereri și oferte rămân **fără filtru explicit de owner în client** — verdict **PARTIAL** până la confirmare **RLS** live.

**FAIL:** nu (nu s-a identificat în cod cale de a lista `demand_offers` pentru cereri care nu sunt în `myDemands`).

---

## 9. Următorul pas

1. **Raport sinteză statică 7A.11** (agregare PASS/PARTIAL/BLOCKED pe toate seturile RLS).  
2. **Sau** sesiune **live** User D + seller + verificări `UPDATE` / `trimite-oferta` / capital.

---

*Sprint **7A.10** — read-only.*
