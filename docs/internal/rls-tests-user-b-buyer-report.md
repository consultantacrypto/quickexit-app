# Quick Exit — RLS Test Set 3: User B Buyer

## 1. Context

Raport **read-only** pentru **Test Set 3 — User B Buyer** din `docs/internal/rls-privacy-execution-plan.md` (secțiunea **„## 8. Test Set 3 — User B Buyer”**).

Rezumat dependențe anterioare relevante: **7A.7** — `UPDATE` pe `listings` / `listing_offers` adesea doar cu `.eq('id', …)` → **RLS** critic; **7A.8** — imagini ofertă cerere cu **URL publice** în același bucket `listings`.

---

## 2. Metodă

- **Audit static:** `AnuntClient.tsx`, `trimite-oferta/[id]/page.tsx`, `dashboard/page.tsx`, `capital-disponibil/CapitalDisponibilClient.tsx`, `posteaza-cerere/PosteazaCerereClient.tsx`, `api/checkout-demand/route.ts`, `api/webhook/route.ts` (mențiune context activare cerere — fără detaliere Stripe).
- **Grep:** `.from('listing_offers')`, `.from('demand_offers')`, `.from('listings')` în `app/`.
- **Fără** service role, fără date test noi, fără modificări DB/RLS/cod.

---

## 3. Rezumat rezultate

| Test ID | Scenariu | Așteptat | Observat | Status | Severitate | Note |
|---------|-----------|----------|----------|--------|------------|------|
| B1 | User B poate trimite ofertă pe listare activă | Insert permis doar pentru listare activă + user autentificat | `AnuntClient`: listare încărcată doar cu `status === 'active'`; `insert` în `listing_offers` cu `listing_id`, `buyer_user_id: user?.id`, mesaj, telefon, email | **PARTIAL** | Medium | **Lipsă guard explicit** `if (!user) return` înainte de insert — `buyer_user_id` poate fi `null`; RLS/DB trebuie să refuze |
| B2 | User B vede oferta proprie (listări) | Filtru `buyer_user_id` | Dashboard: `.from('listing_offers').select(…).eq('buyer_user_id', user.id)` | **PASS** | None | Coloane limitate în afișare card |
| B3 | User B nu vede ofertele altor buyers | Fără listare globală | Nu există query care listează toate `listing_offers` pentru un `listing_id` fără a fi seller; secțiunea „Oferte pentru activele mele” folosește `myOffers` din listările proprii | **PASS** | None | Confirmare RLS dacă cineva forgează `listing_id` |
| B4 | User B nu acceptă/respinge ca seller | UI + update doar seller | Butoane Accept/Refuz pentru `listing_offers` apar în **`myOffers`** (oferte **primite** pe listările userului); buyer fără listări proprii nu vede această secțiune goală cu oferte străine; `handleOfferAction` folosește doar `eq('id', offerId)` | **PARTIAL** | Medium | **RLS** obligatoriu la `UPDATE`; apel artificial posibil |
| B5 | User B nu vede date seller neintenționate | Trust minim public | Pagină anunț: profil vânzător `select` explicit (fără email în query); `listings` cu `select('*')` — coloane sensibile depind de RLS/schema | **PARTIAL** | Low | Nu se afișează în UI explicit email vânzător din profil în fluxul citit |
| B6 | User B nu modifică listarea sellerului | Fără `update listings` în flux buyer | `trimite-oferta` / `AnuntClient` — fără `update` pe `listings`; `posteaza-cerere` — `demands`; `checkout-demand` — Stripe fără Supabase direct | **PASS** | None | Risc rămas: navigare manuală `editeaza-anunt/[id]` (vezi **7A.7**) |
| B7 | User B nu citește `demand_offers` fără legătură | Query filtrat | Primit ca buyer cerere: `.in('demand_id', demandIds)` unde `demands.buyer_id = user.id`; trimis ca seller pe cerere: `.eq('seller_user_id', user.id)` | **PASS** | None | RLS final |
| B8 | User B nu vede mesaje private ale altor buyers | Fără leak în UI buyer | Pagină publică anunț: **nu** listează ofertele altor buyers cu mesaje; dashboard secțiunea „Ofertele mele trimise” către listări: **fără** afișare `message` în card (doar sumă, status, meta listare) | **PASS** | None | Vânzătorul vede mesajul în `myOffers` — intenționat |
| B9 | Fără date contact străine în flux buyer | Control expunere | UI public anunț: nu include `buyer_phone` al altora; dashboard buyer (oferte trimise listări): nu afișează contactul altui buyer | **PASS** | Low | Ofertele **primite** pe cereri (buyer ca owner cerere) afișează **seller** phone/email — intenționat pentru contact |
| B10 | Insert fără spoofing `buyer_id` | `buyer_user_id` din sesiune | `buyer_user_id` setat din `supabase.auth.getUser()`, **nu** din input utilizator | **PASS** | None | Client malitios poate încerca alt UUID în body — **RLS** trebuie `auth.uid() = buyer_user_id` |

---

## 4. Detalii pe test

### B1 — Ofertă pe listare activă

- **Pași:** `AnuntClient` — `fetchAd` filtrează `active`; `submitListingOffer` / `submitAcceptExitPrice`.
- **Observații:** insert nu verifică explicit `if (!user)` înainte de `insert`; `buyer_user_id` poate fi `null`.
- **Rezultat:** **PARTIAL**.
- **Manual:** ofertă fără login; ofertă pe listare `pending_payment` (URL direct) — trebuie respinsă.

### B2 — Oferte proprii (trimise către listări)

- **Pași:** `fetchDashboardData` — bloc „Ofertele mele trimise”.
- **Rezultat:** **PASS**.

### B3 — Fără oferte altor buyers

- **Pași:** audit query-uri `listing_offers` în `app/` (exclus HQ/Copilot).
- **Rezultat:** **PASS** pentru designul actual.

### B4 — Accept/Refuz ca seller

- **Pași:** `dashboard` tab oferte — `handleOfferAction`.
- **Observații:** butoanele pentru listări sunt pe carduri din `myOffers`; update fără `listing_id` în WHERE.
- **Rezultat:** **PARTIAL** (UI separă rolurile; securitate finală = **RLS**).

### B5 — Date seller

- **Pași:** `AnuntClient` profil + date listare publică.
- **Rezultat:** **PARTIAL** (vezi `select('*')` pe `listings`).

### B6 — Modificare listare

- **Pași:** grep `listings` + `update` în fluxuri buyer.
- **Rezultat:** **PASS** în fluxurile tipice; excepție `editeaza-anunt` dacă user navighează manual.

### B7 — `demand_offers`

- **Pași:** `dashboard` — două query-uri distincte (primit / trimis).
- **Rezultat:** **PASS** (cod).

### B8 — Mesaje alți buyers

- **Pași:** UI public + secțiune „Ofertele mele trimise”.
- **Rezultat:** **PASS** pentru scenariul buyer standard.

### B9 — Contact

- **Pași:** revizuire afișare telefon/email în secțiunile relevante pentru userul care acționează ca **buyer** pe listări.
- **Rezultat:** **PASS** cu nuanța B9 din tabel pentru cereri (contact **vânzător** ofertă).

### B10 — Spoofing

- **Pași:** câmpuri `insert` în `AnuntClient`.
- **Rezultat:** **PASS** (sursă `user.id`); **RLS** confirmare manuală.

---

## 5. Suprafețe de risc Buyer

| Suprafață | Detaliu |
|-------------|---------|
| **Insert `listing_offers`** | Câmpuri: `listing_id`, `buyer_user_id`, preț, telefon, email, `message`, `status`. |
| **`buyer_user_id`** | Din `getUser()`, nu din formular. |
| **Mesaje** | Stocate în DB; vânzătorul le vede în dashboard; **nu** în HTML public anunț pentru alți buyers. |
| **Accept/Refuz** | `handleOfferAction` — dependență **RLS** + separare UI. |
| **`demand_offers`** | Vizibilitate prin `buyer_id` / `seller_user_id` pe query-uri separate. |
| **`select('*')`** | Dashboard încă folosește `*` pentru `listing_offers` primite ca vânzător (aceeași pagină pentru user hibrid). |
| **RLS vs client** | La fel ca în **7A.7**: puține verificări `user_id` în clauze `UPDATE`. |

---

## 6. Red flags

1. **Insert ofertă fără verificare explicită a sesiunii** înainte de `insert` — risc mitigat de **RLS** + eroare Supabase, dar UX și securitate în profunzime slabe.
2. **`handleOfferAction`** — același pattern ca la seller: **UPDATE** doar după `offerId`.
3. **Nu** s-a identificat: listare publică a mesajelor ofertelor altora, sau `buyer_user_id` luat din input text.

---

## 7. Blocked / necesită test manual

- Cont **User B** + listare **User A** + trimitere ofertă end-to-end.
- **Network:** răspunsuri `insert` / `select` pentru `listing_offers`.
- **RLS:** `UPDATE listing_offers` ca buyer pe ofertă care nu îi aparține.
- **Anon:** încercare insert direct API.
- Combinat **User hibrid** (are și listări și oferte) pentru a verifica că nu apare confuzie între secțiuni.

---

## 8. Concluzie

**Verdict general: PARTIAL**

**Motiv:** fluxul buyer în **cod** separă corect citirile (`buyer_user_id`, `seller_user_id`, `demand_id` pe cereri proprii) și setează `buyer_user_id` din autentificare. Există însă **B1** (guard sesiune), **B4** / **UPDATE** (ca în **7A.7**) și confirmarea **RLS** care nu pot fi închise fără teste live — conform regulii din prompt, nu se acordă **PASS** complet.

**FAIL:** nu (nu s-a găsit în cod listare a ofertelor altor buyers pentru același buyer, nici cale clară de a modifica listarea din fluxul `trimite-oferta` / ofertă listare).

---

## 9. Următorul pas

1. **Test Set 4 — Demand owner** (continuare plan execuție).  
2. **Sau** sesiune **live cu User A + User B** (ofertă + încercare `UPDATE` malițios) pentru a închide **B1/B4/B10** la nivel RLS.

---

*Sprint **7A.9** — read-only.*
