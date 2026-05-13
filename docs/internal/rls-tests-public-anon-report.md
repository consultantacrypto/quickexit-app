# Quick Exit — RLS Test Set 1: Public anon

## 1. Context

Acest raport documentează execuția **Test Set 1 — Public anon** din `docs/internal/rls-privacy-execution-plan.md`, în mod **read-only**: fără modificări de cod, fără DB, fără RLS, fără migrații, fără service role, fără tokenuri în document.

**Mediu HTTP verificat:** domeniul public implicit din cod (`getSiteUrl` fallback): `https://quickexit-app.vercel.app` (mai 2026). Rezultatele pot diferi pe staging sau alt host.

---

## 2. Metodă

- **Request-uri HTTP publice:** `curl` (HEAD/GET) către `/`, `/dashboard`, `/capital-disponibil`, un URL `/anunt/[id]` extras din `sitemap.xml` public (fără a reproduce UUID-uri în secțiuni sensibile de PII).
- **Audit static cod:** `app/page.tsx`, `app/sitemap.ts`, `lib/listingSeo.ts`, `app/anunt/[id]/AnuntClient.tsx`, `app/capital-disponibil/CapitalDisponibilClient.tsx`, `app/layout.tsx`, `app/dashboard/layout.tsx`, rută API publică.
- **Verificare HTML:** căutare substring (fără dump complet de body) pentru `admin_risk`, `listing_offers`, `demand_offers`, `seller_email`, `buyer_email`, `seller_phone`, câmpuri agregate explicite.
- **Fără service role** și fără apeluri PostgREST cu cheie anon din linia de comandă (pentru a nu expune chei în istoric shell).

---

## 3. Rezumat rezultate

| Test ID | Scenariu | Așteptat | Observat | Status | Severitate | Note |
|---------|-----------|----------|----------|--------|------------|------|
| T1 | Homepage anon | 200; robots index/follow; fără date private evidente | HTTP **200**; `Cache-Control` privat/no-store; meta robots conform layout rădăcină (`index`, `follow` în `app/layout.tsx`) | **PASS** | None | Verificare completă meta în browser recomandată (RSC poate altera regex simplu) |
| T2 | Listing activ public | 200; index/follow; fără contact/dashboard în HTML evident | HTTP **200**; meta robots `index, follow` pe eșantion; substring-uri sensibile explicite absente din HTML | **PASS** | None | RLS rămâne sursa finală pentru coloane în JSON client |
| T3 | Listing pending_payment | Nu în liste publice; URL direct indisponibil/noindex | Cod: `homepage`, `sitemap`, `fetchPublicListingSeoRow`, `AnuntClient` filtrează `status === 'active'` și `is_seed === false` | **PARTIAL** | None | **BLOCKED** fără UUID real `pending_payment` pentru probă live acces direct |
| T4 | Demand pending_payment | Doar `active` public | Cod: `CapitalDisponibilClient` — `demands` cu `.eq("status", "active")` | **PARTIAL** | None | **BLOCKED** fără UUID cerere `pending_payment` |
| T5 | Lista profiles anon | Fără listă publică; eventual trust minim pe anunț | Nu există rută/API publică dedicată listării `profiles`; pe anunț: query singular `profiles` cu coloane limitate (`id`, `full_name`, `kyc_status`, `user_type`, `created_at`) | **PARTIAL** | Low | **BLOCKED** pentru `SELECT profiles` anon direct în SQL Editor |
| T6 | Citire listing_offers | Fără listare publică; agregate safe OK | Numele tabelului absent din HTML eșantion; agregatele licitație vin din rândul `listings` (`offer_count` / `highest_offer`), nu din join public explicit | **PARTIAL** | Low | Confirmare RLS PostgREST necesită anon query manual |
| T7 | Citire demand_offers | Fără expunere publică | Pagina capital nu interoghează `demand_offers`; substring absent din HTML | **PASS** | None | — |
| T8 | Acces /dashboard | noindex; fără date private | HTML conține `noindex`; răspuns **200** (shell prerender) | **PASS** | None | Conținut privat depinde de client post-hydration + RLS |
| T9 | Date contact | Fără email/telefon utilizatori în public | Pattern-uri `seller_email`, `buyer_email`, `seller_phone` **absente** din HTML static listing + capital | **PARTIAL** | Low | `listings.select('*')` în client poate aduce coloane în **Network**; audit manual recomandat |
| T10 | admin_risk_resolutions | Nu apare public | Absent din HTML public; tabel folosit în `hq-admin` + API Copilot (server, autentificare) | **PASS** | None | — |

---

## 4. Detalii pe test

### T1 — Homepage

- **Pași:** `curl -sI` către `/`; lectură `app/layout.tsx` (robots global); `app/page.tsx` (query `listings`/`demands` doar `status === 'active'`).
- **Observații:** 200 OK; listările homepage sunt filtrate explicit în cod.
- **Rezultat:** **PASS** (HTTP + logică aplicație).
- **Manual dacă BLOCKED:** N/A.

### T2 — Listing activ

- **Pași:** `curl -sI` + GET pe `/anunt/[id]` din sitemap; scan substring pentru tabele sensibile.
- **Observații:** 200; robots `index, follow`; fără nume de tabele oferte/admin în HTML simplu.
- **Rezultat:** **PASS**.
- **Manual:** verificare DevTools → răspunsuri `rest/v1/listings` pentru coloane returnate de RLS.

### T3 — Listing pending_payment

- **Pași:** audit `listingSeo.ts` (`.eq("status", "active")`); `AnuntClient` (aceleași filtre); `sitemap.ts` (doar active).
- **Observații:** `pending_payment` nu intră în query-urile publice din cod; URL direct cu ID pending nu a fost testat (lipsește ID cunoscut fără creare date).
- **Rezultat:** **PARTIAL** (garanție la nivel de aplicație); **RLS** necunfirmat pentru bypass API.
- **Manual:** în Supabase sau cu UUID pending real: GET `/anunt/{id}` + PostgREST `listings?id=eq.&select=*` cu anon.

### T4 — Demand pending_payment

- **Pași:** audit `CapitalDisponibilClient.tsx` — doar `active`.
- **Observații:** consistent cu așteptarea produsului.
- **Rezultat:** **PARTIAL** (cod); probă directă **BLOCKED** fără ID.

### T5 — Profiles

- **Pași:** grep rute `app/api` pentru expos public profiles; analiză `AnuntClient` (profil singular vânzător).
- **Observații:** nu există endpoint public list profiles; trust = subset coloane, nu email în `select` explicit.
- **Rezultat:** **PARTIAL** (fără SQL anon).
- **Manual:** `SELECT id FROM profiles LIMIT 5` ca rol anon în SQL Editor.

### T6 — listing_offers

- **Pași:** scan HTML; audit `AnuntClient` (insert ofertă doar autentificat; afișare agregate pe obiect listing).
- **Observații:** nu s-a detectat listă brută oferte în HTML static.
- **Rezultat:** **PARTIAL**.
- **Manual:** PostgREST anon `listing_offers?select=*`.

### T7 — demand_offers

- **Pași:** scan HTML capital; audit cod — fără `from("demand_offers")` pe această pagină.
- **Rezultat:** **PASS** la nivel aplicație publică capital.

### T8 — Dashboard

- **Pași:** GET `/dashboard`; căutare `noindex` în HTML.
- **Observații:** `app/dashboard/layout.tsx` exportă `robots: noindex, nofollow`; prezent în HTML.
- **Rezultat:** **PASS** pentru SEO shell; date utilizator = după login în client.

### T9 — Contact / PII

- **Pași:** scan substring-uri cheie în HTML listing + capital.
- **Observații:** pattern-uri explicite absente; email de suport din footer este permis de specificație (nu îl reproducem aici).
- **Rezultat:** **PARTIAL** (nu înlocuiește inspectarea Network pentru `select('*')`).
- **Manual:** filtrare răspuns JSON după `phone`, `email`, `whatsapp`.

### T10 — admin_risk_resolutions

- **Pași:** grep cod public + scan HTML; API Copilot folosește service role pe server, nu e rută anonimă de citire rezoluții.
- **Rezultat:** **PASS** pentru expunere evidentă în paginile testate.

---

## 5. Red flags

- **Niciun red flag Critical** din probele HTTP/HTML de mai sus.
- **Atenție (Low → Medium dacă RLS e slab):** `select('*')` pe `listings` în `AnuntClient` poate livra coloane sensibile în **JSON** către browser dacă politica Supabase le returnează — riscul se reduce prin RLS pe coloane sau prin `select` explicit (viitor sprint cod, în afara acestui raport).

---

## 6. Blocked / necesită test manual

- **ID-uri** `pending_payment` pentru `listings` / `demands` (fără creare date în acest sprint).
- **Interogări SQL / PostgREST** cu cheie **anon** din Supabase Dashboard sau client controlat (fără a loga cheia în repo).
- **Inspecție Network completă** pentru PII în payload-uri `listings` / `profiles`.
- **Confirmare** că producția folosește același cod ca repo-ul auditat la data raportului.

---

## 7. Concluzie

**Verdict general: PARTIAL**

**Motiv:** majoritatea verificărilor HTTP + audit static sunt **conforme**; testele care cer **RLS brut anon** sau **UUID pending** reale sunt **BLOCKED** / **PARTIAL**, deci nu se poate emite **PASS** complet conform regulii stricte din plan.

Nu s-a constatat **FAIL** (expunere publică evidentă de offers/profiles/admin în HTML-ul scanat).

---

## 8. Următorul pas

Conform `rls-privacy-execution-plan.md` **§15 (ordinea de execuție)**, după Set 1 urmează **Profiles** — în același document secțiunea **„## 10. Test Set 5 — Profiles”**.

Alternativ (dacă echipa vrea mai întâi flux proprietar): **„## 7. Test Set 2 — User A Seller”**.

Recomandare: **Profiles** întâi, pentru a închide gap-urile **T5/T6** cu teste JWT / SQL în Supabase, fără a crea date noi în acest sprint.
