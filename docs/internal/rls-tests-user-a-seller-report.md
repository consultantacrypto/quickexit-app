# Quick Exit — RLS Test Set 2: User A Seller

## 1. Context

Raport **read-only** pentru **Test Set 2 — User A Seller** din `docs/internal/rls-privacy-execution-plan.md` (secțiunea **„## 7. Test Set 2 — User A Seller”**), aliniat cu checklist-ul **listings** / **listing_offers** / storage.

Legat de sprinturile anterioare: **7A.5** și **7A.6** au lăsat **PARTIAL/BLOCKED** pentru confirmarea **RLS** live — același tip de limitare se aplică aici: auditul confirmă **intent** și **query-uri** în cod, nu politicile Supabase efective.

---

## 2. Metodă

- **Audit static** în repo: `app/dashboard/page.tsx`, `app/pune-anunt/PuneAnuntClient.tsx`, `app/editeaza-anunt/[id]/page.tsx`, `app/anunt/[id]/AnuntClient.tsx`, `app/trimite-oferta/[id]/page.tsx`, `app/api/webhook/route.ts` (context activare listare), `app/api/checkout/route.ts` (fără query direct `listings` în fișierul route — flux Stripe).
- **Fără service role**, fără tokenuri, fără date test noi, fără modificări DB/RLS/cod.

---

## 3. Rezumat rezultate

| Test ID | Scenariu | Așteptat | Observat | Status | Severitate | Note |
|---------|-----------|----------|----------|--------|------------|------|
| S1 | User A vede propriile listings | Query filtrat pe owner | `fetchDashboardData`: `.from('listings').select('*').eq('user_id', user.id)` | **PASS** | None | Depinde de `user.id` din `auth.getUser()` |
| S2 | User A vede `pending_payment` propriu | Fără filtru care exclude pending pe listările lui A | Același query ca S1 — **toate** statusurile returnate dacă RLS permite | **PASS** | None | Confirmare UI: anunțurile apar în dashboard indiferent de status (în limitele RLS) |
| S3 | User A nu poate edita listing User B | Verificare owner sau RLS strict | `editeaza-anunt/[id]/page.tsx`: `select`/`update` doar `.eq('id', id)` — **fără** verificare `user_id === auth.uid()` în client | **PARTIAL** | High | Protecție așteptată **doar de RLS**; mesaj eroare menționează deja „politica SQL de UPDATE” |
| S4 | User A vede ofertele primite pe listările sale | `listing_offers` filtrate prin `listing_id` ∈ listările lui A | `listingIds = listings.map(l => l.id)` apoi `.from('listing_offers').select('*').in('listing_id', listingIds)` | **PASS** | None | Dacă RLS greșit, s-ar putea injecta ID-uri străine — inexistent în cod pentru acest query |
| S5 | User A nu vede oferte pe listările altui seller | Fără `listing_id` din afara setului propriu | Ofertele „primite” provin exclusiv din `listingIds` derivate din listările cu `user_id = user.id` | **PASS** | None | Ofertele „trimise” (buyer) sunt query separat pe `buyer_user_id` — alt rol |
| S6 | User A nu modifică oferta altuia ca seller | Update doar pe oferte legitime | `handleOfferAction`: `.update({ status }).eq('id', offerId)` — **fără** `listing_id` sau `user_id` în `WHERE`; oferta e aleasă din `myOffers` în UI | **PARTIAL** | Medium | Apel API direct cu `offerId` străin = **RLS** trebuie să refuze |
| S7 | User A nu schimbă `kyc_status` | Doar webhook KYC | Flux seller în dashboard: **citire** `profiles` + UI KYC; fără `update`/`upsert` `kyc_status` (vezi **7A.6**) | **PASS** | None | — |
| S8 | User A nu devine admin | Fără update rol | Nu există `update`/`upsert` pe `profiles` pentru rol/admin în `dashboard` / `pune-anunt` / `editeaza-anunt`; linkuri HQ doar pentru `OWNER_USER_ID` hardcodat (nu escaladare generică) | **PASS** | None | Schema DB poate avea coloane suplimentare — verificare RLS coloane |
| S9 | Upload imagini doar în path propriu | `user.id` în path | `PuneAnuntClient`: `filePath = \`${user.id}/${fileName}\`` + `storage.from("listings").upload` | **PASS** | None | Politici **Storage** = verificare manuală |
| S10 | Fără suprascriere imagine alt user | Fără API care scrie în path B | Nu există în cod flux explicit „overwrite” cross-user; `editeaza-anunt` **nu** gestionează storage în fișierul curent | **PARTIAL** | Low | **BLOCKED** fără test manual policy storage |

---

## 4. Detalii pe test

### S1 — Propriile listings

- **Pași:** `app/dashboard/page.tsx` — bloc `fetchDashboardData`.
- **Observații:** filtru explicit `user_id` = utilizator autentificat.
- **Rezultat:** **PASS** (cod).
- **Manual:** dacă RLS returnează rânduri altora cu același query → **FAIL** RLS.

### S2 — `pending_payment` propriu

- **Pași:** același query ca S1; nu există `.eq('status','active')` pe listările din dashboard.
- **Observații:** vânzătorul poate vedea și anunțuri în așteptare plată în listă.
- **Rezultat:** **PASS** (cod).
- **Manual:** confirmare vizuală listă dashboard.

### S3 — Editare listing alt user

- **Pași:** `editeaza-anunt/[id]/page.tsx` — `fetchAd` + `handleUpdate`.
- **Observații:** încărcare și salvare după **doar** `id` din URL; nu se compară `data.user_id` cu `auth.getUser().id` înainte de editare.
- **Rezultat:** **PARTIAL** — **defensă în profunzime absentă în client**; alerta la eroare sugerează dependență de politici SQL.
- **Manual:** User A deschide `/editeaza-anunt/{id_B}` — așteptat eroare RLS / date goale la fetch.

### S4 — Oferte primite

- **Pași:** `listingIds` din `myListings` → `listing_offers.in('listing_id', listingIds)`.
- **Observații:** model corect pentru „doar pe anunțurile mele”.
- **Rezultat:** **PASS** (cod).

### S5 — Fără oferte pe listări străine

- **Pași:** idem S4 — setul de ID-uri este derivat strict din listările userului.
- **Rezultat:** **PASS** (cod).

### S6 — Modificare ofertă (accept/respinge)

- **Pași:** `handleOfferAction` — `update` pe `listing_offers` / `demand_offers` cu `eq('id', offerId)`.
- **Observații:** UI limitează la `myOffers` / `myDemandOffers`; request-ul Supabase nu repetă ownership explicit.
- **Rezultat:** **PARTIAL**.
- **Manual:** PATCH direct cu `offerId` al altui seller — trebuie refuzat de RLS.

### S7 — `kyc_status`

- **Pași:** confirmare încrucișată cu **7A.6** — singur writer `kyc_status` în `app/api/webhooks/kyc/route.ts`.
- **Rezultat:** **PASS** pentru fluxul seller în fișierele analizate.

### S8 — Admin / roluri

- **Pași:** grep `profiles` + `update`/`upsert` în `dashboard`, `pune-anunt`, `editeaza-anunt`.
- **Observații:** fără modificare câmpuri admin; `toggleStatus` / `markListingAsSold` modifică **`listings`**, nu rolul utilizatorului.
- **Rezultat:** **PASS** (cod).

### S9 — Path upload

- **Pași:** `PuneAnuntClient` — construire `filePath`.
- **Rezultat:** **PASS** (cod).
- **Manual:** policy bucket `listings` pe prefix `auth.uid()`.

### S10 — Suprascriere cross-user storage

- **Pași:** nu există în cod apel explicit de delete/overwrite pe path extern.
- **Rezultat:** **PARTIAL** / **BLOCKED** pentru policy.

---

## 5. Suprafețe de risc Seller

| Zonă | Ce face codul | Risc dacă RLS slab |
|------|----------------|-------------------|
| **Editare anunț** | `editeaza-anunt`: read/update doar după `id` | Citire/editare cross-owner |
| **Dashboard `toggleStatus` / `markListingAsSold`** | `update` pe `listings` cu `.eq('id', item.id)` fără `user_id` în WHERE | Schimbare status pe listări străine |
| **`handleOfferAction`** | `update` pe ofertă doar cu `eq('id', offerId)` | Schimbare status pe oferte străine |
| **`listing_offers` în dashboard** | `select('*')` pentru ofertele primite | Expunere coloane (telefon buyer etc.) în browser — controlat de RLS + UI |
| **Storage `pune-anunt`** | Path `user_id/filename` | Fără policy → scriere în alt prefix |
| **Webhook** | Activează listare după plată (server) | Nu este acțiune seller client — OK |

**Concluzie arhitectură:** multe operațiuni de **scriere** se bazează pe **RLS** (lipsește `user_id` în clauza `UPDATE` din client). Acest pattern este frecvent cu Supabase, dar **crește importanța** testelor manuale din §7.

---

## 6. Red flags

1. **`editeaza-anunt`:** lipsă verificare explicită owner în client — **depinde critic de RLS** pentru `SELECT` și `UPDATE` pe `listings`.
2. **Dashboard:** `toggleStatus`, `markListingAsSold`, `handleOfferAction` — `UPDATE` doar cu `id` / `offerId` — același tip de dependență **RLS**.
3. **Nu** s-a identificat în fluxul seller (fișierele de mai sus) modificare `kyc_status` sau rol admin — OK.
4. **Date buyer** în oferte: `select('*')` pe `listing_offers` poate include mesaje/telefon — **intenție marketplace** dar suprafață sensibilă; **RLS** trebuie să limiteze la ofertele relevante listărilor lui A.

---

## 7. Blocked / necesită test manual

- Cont **User A** și **User B** + listări și oferte reale.
- **Network** autentificat: răspunsuri `listings` / `listing_offers` după acțiuni.
- **Supabase:** policy-uri `UPDATE`/`SELECT` pe `listings` și `listing_offers`.
- **Storage:** încercare upload cu path falsificat (în staging).
- Scenariu **S3**: acces direct la URL editare cu ID listare alt user.

---

## 8. Concluzie

**Verdict general: PARTIAL**

**Motiv:** query-urile de **citire** pentru listările și ofertele „primite” sunt **bine filtrate** în cod după `user_id` / `listing_id`-uri proprii. În schimb, **scrierile** (`UPDATE` listări, oferte) și **pagina de editare** nu adaugă în client filtre `user_id` — conform regulii din prompt („PASS doar dacă toate testele sunt confirmate live”) rămâne **PARTIAL** până la validare RLS.

**FAIL:** nu s-a declanșat la audit static (nu există în cod cale evidentă de a lista listări altui user în dashboard); riscul este **condiționat de RLS incorect**.

---

## 9. Următorul pas

Recomandare: **Test Set 3 — User B Buyer** (`trimite-oferta`, `listing_offers` insert, oferte trimise) pentru a închide cercul ofertelor din perspectiva cumpărătorului.

Alternativ: **Test Set 6 — Storage** dacă prioritatea este bucket-ul `listings` după observațiile **S9/S10**.

---

*Sprint **7A.7** — read-only.*
