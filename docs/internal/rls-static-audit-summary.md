# Quick Exit — RLS Static Audit Summary

## 1. Context

Acest document **centralizează** rezultatele auditului **static** și **read-only** RLS/privacy pentru Quick Exit, pe baza rapoartelor sprint **7A.5–7A.10** și a documentelor `rls-privacy-checklist.md` / `rls-privacy-execution-plan.md`.

**Scop:** oferi o vedere unică asupra **PASS** / **PARTIAL** / **BLOCKED** / **FAIL**, a **red flag**-urilor, a riscurilor **High/Critical** (la nivel de dependență arhitecturală, nu neapărat incident confirmat), a testelor **live** obligatorii înainte de **beta mai larg**, și a elementelor care pot intra ulterior într-un **sprint de performanță** fără a compromite validarea RLS.

**Limită:** auditul static **nu** înlocuiește politicile Supabase reale; concluziile despre **RLS** și **Storage** rămân condiționate de confirmare în Dashboard / PostgREST / sesiuni cu roluri test.

---

## 2. Rezumat executiv

**Overall RLS static readiness: PARTIAL PASS**

**Explicație:** În toate cele șase rapoarte de set, **nu** s-a raportat **FAIL** (expunere critică **demonstrată** în probele statice/HTTP/HTML analizate). În același timp, **multe** fluxuri sensibile (**UPDATE** fără owner explicit în client, **SELECT** cu `*`, **checkout-demand** fără legare server-side de sesiune, **Storage** / imagini ofertă, **profiles** anon, **Copilot**) depind de **RLS** și politici **Storage** corecte — **nevalidate** în aceste sprinturi fără conturi test și fără SQL/Network controlat.

**Concluzie operațională:** produsul **nu** trebuie declarat „RLS-safe complet” numai pe baza auditului static; **beta controlat** poate continua cu înregistrarea riscurilor; **beta larg** cere **test live minimal** (User A/B/D + anon) și decizii de **privacy** (imagini ofertă, PII în descrieri).

---

## 3. Matrice rapoarte

| Sprint | Zonă | Raport | Verdict | FAIL | Red flags principale | Următor pas |
|--------|------|--------|---------|------|----------------------|-------------|
| **7A.5** | Public anon | `docs/internal/rls-tests-public-anon-report.md` | **PARTIAL** | Nu | `select('*')` public / leak coloane dacă RLS slab; T3/T4/T5/T6/T9 **BLOCKED** fără probă RLS/UUID pending | SQL anon + URL pending în staging |
| **7A.6** | Profiles | `docs/internal/rls-tests-profiles-report.md` | **PARTIAL** | Nu | `select('*')` dashboard profil; P1/P3 anon; P8 Copilot/Gemini snapshot | Network JWT + reducere snapshot admin |
| **7A.7** | User A Seller | `docs/internal/rls-tests-user-a-seller-report.md` | **PARTIAL** | Nu | `editeaza-anunt` read/update doar `id`; `toggleStatus` / `markSold` / `handleOfferAction` fără `user_id` în WHERE | Test live S3/S6 + RLS `listings`/`listing_offers` |
| **7A.8** | Storage | `docs/internal/rls-tests-storage-report.md` | **PARTIAL** | Nu | `demand_offers` + `getPublicUrl` bucket public; ST10 policies **BLOCKED** | Test policy upload/prefix; decizie produs ST5 |
| **7A.9** | User B Buyer | `docs/internal/rls-tests-user-b-buyer-report.md` | **PARTIAL** | Nu | B1 guard sesiune insert; B4/B5 `select('*')` / UPDATE doar `id` | Live B1/B4 + RLS insert/update |
| **7A.10** | Demand Owner | `docs/internal/rls-tests-demand-owner-report.md` | **PARTIAL** | Nu | D5/D6 UPDATE doar `id`; `trimite-oferta` demand fără filtru `active` în query; `checkout-demand` fără ownership API | Live User D + RLS `demands`/`demand_offers` |

**Surse transversale:** `docs/internal/rls-privacy-checklist.md`, `docs/internal/rls-privacy-execution-plan.md`.

---

## 4. Ce este PASS la nivel static

Conform agregării rapoartelor 7A.5–7A.10 (fără a înlocui verificarea RLS live):

- **Homepage** public: query-uri orientate spre listări/demands **active** în cod (`app/page.tsx`); indexare conform layout (raport 7A.5 T1).
- **Listing activ** public: filtre `active` / `is_seed` în fluxuri publice și SEO (7A.5 T2, checklist §4).
- **Dashboard / HQ / edit:** layout-uri cu **noindex** unde e cazul (7A.5 T8); nu se tratează ca „indexabile” pentru date private.
- **Profiles:** nu există rută Next dedicată de **director** public de utilizatori (7A.6 P10); trust pe anunț cu **select explicit** fără email/telefon în acel query (7A.6 P4).
- **`kyc_status`:** în codul sursă auditat, scrierea **`kyc_status`** apare la **`app/api/webhooks/kyc/route.ts`** (service role server) — fără `update kyc_status` din client (7A.6 P5/P7).
- **Dashboard:** citire **listări proprii** `listings` cu `.eq('user_id', user.id)`; **cereri proprii** `demands` cu `.eq('buyer_id', user.id)` (7A.7 S1, 7A.10 D1/D2).
- **Oferte primite (seller):** `listing_offers` cu `listing_id` ∈ listările userului (7A.7 S4/S5).
- **Oferte primite (demand owner):** `demand_offers` cu `demand_id` ∈ cererile cu `buyer_id` = user (7A.10 D3/D4).
- **Buyer — oferte trimise listări:** filtru `buyer_user_id` (7A.9 B2); **fără** listare globală oferte pe `listing_id` pentru anon în fluxul buyer standard (7A.9 B3).
- **Storage — cod:** path upload include **`user.id`** (`pune-anunt`, `trimite-oferta` demand) (7A.7 S9, 7A.8 ST2).
- **Public sample:** fără **`token=`** / signed evident în HTML anunț eșantion (7A.8 ST6); **fără** `service_role` în client în probele raportate.
- **Analytics:** `trackEvent` nu pare să trimită obiecte `profiles`, email sau telefon ca parametri (7A.6 P9).

---

## 5. Ce este PARTIAL / BLOCKED

### Dependență puternică de RLS (fără confirmare live)

- **Profiles:** `SELECT` masiv anon / profil alt user în afara contextului anunț (7A.6 P1, P3).
- **Anon PostgREST:** `listing_offers`, `demand_offers`, `profiles` — rapoartele marchează **PARTIAL** până la SQL/anon în Dashboard (7A.5 T6/T7, 7A.6 P1).

### Scrieri / citiri fără guard explicit de owner în client

- **`editeaza-anunt/[id]`:** `fetch` + `update` pe `listings` doar cu `.eq('id', …)` (7A.7 S3).
- **`handleOfferAction`:** `update` pe `listing_offers` / `demand_offers` cu **doar** `.eq('id', offerId)` (7A.7 S6, 7A.9 B4, 7A.10 D5).
- **Dashboard demands:** `toggleDemandStatus`, `markDemandAsResolved` — `update` cu **doar** `.eq('id', …)` (7A.10 D6).
- **Dashboard listings:** `toggleStatus`, `markListingAsSold` — pattern similar (7A.7 §5).

### API / fluxuri plată

- **`checkout-demand`:** body cu `demandId` — **fără** verificare în codul route-ului că utilizatorul autentificat este `buyer_id` al cererii (7A.10 §5); activarea statusului rămâne în **webhook** după plată.

### Storage

- **Policies** upload/delete/overwrite pe bucket **`listings`** — **BLOCKED** în sprinturile read-only (7A.8 ST10).
- **Imagini `demand_offers`:** `getPublicUrl` — **decizie produs** + test acces anonim la URL (7A.8 ST5).

### Observabilitate / date lipsă

- **Network tab** autentificat pentru payload-uri `select('*')` (7A.5 T9, 7A.6 P2).
- **URL direct** `pending_payment` listing/demand — **BLOCKED** fără UUID-uri de test (7A.5 T3/T4).

### Inserări buyer

- **B1:** insert ofertă listare — lipsă guard explicit `if (!user)` înainte de insert; `buyer_user_id` din sesiune dar **RLS** trebuie să refuze cazurile marginale (7A.9).

---

## 6. Red flags importante

Tabelul de mai jos sintetizează punctele obligatorii din brief; severitatea este **statică** (probabilitate/risc de design dacă RLS sau produsul nu compensează).

| Red flag | Severitate statică | De ce contează | Fix posibil (nu implementat aici) | Când |
|----------|-------------------|-----------------|-------------------------------------|------|
| 1. `app/editeaza-anunt/[id]` — fetch/update listing doar după `id`, fără verificare owner în client | **High** | Dacă RLS pe `SELECT`/`UPDATE` `listings` e defect, userul poate citi sau modifica anunțul altcuiva din UI sau API client | Compară `data.user_id` cu `auth.uid()` înainte de editare; sau RPC server-side; întărire RLS | Înainte de beta larg |
| 2. Dashboard — `handleOfferAction`: `update` `listing_offers` / `demand_offers` cu `.eq('id', offerId)` fără `listing_id` / `demand_id` / owner în WHERE client | **High** | Apeluri artificiale către PostgREST ar putea schimba statusul ofertei altora dacă RLS nu verifică lanțul seller/listing sau buyer/demand | Policy `UPDATE` cu `EXISTS` pe ownership; sau filtre suplimentare în query client + RLS | Înainte de beta larg |
| 3. Dashboard — `toggleDemandStatus` / `markDemandAsResolved`: `update demands` cu `.eq('id', …)` fără `buyer_id` în client | **High** | Modificare status / rezolvare pe cererea altui utilizator dacă RLS lipsește | RLS `UPDATE` pe `buyer_id = auth.uid()`; opțional guard client | Înainte de beta larg |
| 4. `trimite-oferta` (flux **demand**) — încărcare cerere după `id` fără `.eq('status','active')`; UI poate afișa „activ” hardcodat | **Medium** | Leak semantic sau UX greșit; seller ar putea vedea câmpuri ale unei cereri neactive dacă RLS e prea permisiv | Filtru status în query + UI din `row.status` | Beta / hardening |
| 5. `app/api/checkout-demand/route.ts` — nu leagă server-side `demandId` de user autentificat | **Medium** | Integritate flux plată / abuz sesiune (cine plătește pentru ce `demandId`); separat de RLS pe tabel | Validare sesie Stripe metadata + verificare `buyer_id` înainte de session create | Înainte de beta larg (recomandat) |
| 6. Imagini `demand_offers` — `getPublicUrl`, bucket **`listings`** (citire publică dacă policy e publică) | **Medium** | Confidențialitate ofertă vs listare publică; oricine cu URL poate vedea imaginea | Bucket privat + signed URL; sau bucket dedicat oferte; policy read restrânsă | Decizie produs + sprint privacy |
| 7. Descriere publică **demands** — poate conține PII introdusă de utilizator | **Low** | GDPR / trust; nu e bug RLS clasic ci suprafață de conținut | Validare/avertisment la submit; moderare sau filtre | Beta / policy conținut |
| 8. `select('*')` în client pe `listings`, `profiles`, oferte, cereri | **Medium** (condiționat de RLS) | Orice coloană returnată de policy apare în **Network**, chiar dacă UI o ascunde | `select` explicit pe coloane minime | Performance + privacy sprint |
| 9. HQ **Copilot** / Gemini — snapshot operațional (listings, demands, profiles agregate) | **Medium** (zonă admin) | Risc PII / date business în prompt; greșeli de configurație pot expune mai mult decât UI | Reducere câmpuri în snapshot; review prompt; logging fără PII | Înainte de beta larg dacă HQ e folosit pe date reale |
| 10. Confirmarea reală a izolării | **High** (meta) | Tot ce e „PASS în cod” devine **FAIL în producție** dacă RLS/Storage sunt greșite | Teste live + revizuire policies în Supabase | **Obligatoriu** înainte de beta larg |

---

## 7. Teste live obligatorii înainte de beta larg

Cu conturi **anon**, **User A** (seller), **User B** (buyer), **User D** (demand owner), în **staging** (recomandat):

1. **Anon:** `listing_offers` — `SELECT` / PostgREST — **0 rânduri** sau eroare policy (checklist §6).
2. **Anon:** `demand_offers` — idem (checklist §7).
3. **Anon:** `profiles` — fără enumerare masivă (plan 1.5, 7A.6 P1).
4. **User A:** nu poate deschide/edita listing **User B** (`/editeaza-anunt/{id_B}`) — refuz sau date goale (7A.7 S3).
5. **User A:** nu poate accepta/refuza ofertă pe listare care nu îi aparține — `UPDATE` respins (7A.7 S6).
6. **User B:** nu vede ofertele altor buyers pe același listing (7A.9 B3 + RLS).
7. **User D:** nu vede `demand_offers` pentru cereri care nu sunt ale sale (7A.10 D4 + RLS).
8. **User D:** nu poate `UPDATE` `demands` ale altui utilizator (7A.10 D6).
9. **User:** nu poate seta `kyc_status` la `verified` prin `UPDATE` client/SQL cu rol normal (7A.6 P5).
10. **User A:** nu poate **upload**/scrie în path Storage al userului B (7A.8 ST2).
11. **Public:** listing `pending_payment` — URL direct și JSON — inaccesibil sau minimal (7A.5 T3).
12. **Public:** demand `pending_payment` — nu apare în capital / homepage active (7A.5 T4, 7A.10 D7).
13. **`demand_offers.images`:** acces anonim la URL salvat — conform **deciziei produs** (acceptat public vs nu) (7A.8 ST5).
14. **Copilot:** revizuire payload trimis la model (fără lipire secrete în tickete) (7A.6 P8).

---

## 8. Ce trebuie fixat posibil înainte de beta larg

**Doar propuneri — fără implementare în acest sprint.**

### A. Ownership guards (client și/sau server) înainte de update

- **`editeaza-anunt`:** verificare `listing.user_id === session.user.id` înainte de randare form / submit.
- **`handleOfferAction`:** păstrare RLS strict + opțional `and('demand_id', …)` / `and('listing_id', …)` acolo unde schema permite.
- **`toggleDemandStatus` / `markDemandAsResolved`:** `.eq('buyer_id', user.id)` în plus față de `id` (defensiv) + RLS.

### B. Filtre suplimentare

- **`trimite-oferta` (demand):** încărcare cerere cu `.eq('status', 'active')` (sau echivalent produs).
- **`checkout-demand`:** validare sesiune utilizator + că `demandId` aparține aceluiași `buyer_id` înainte de crearea sesiunii Stripe.

### C. Privacy

- Avertisment / validare ușoară pentru **PII** în `description` la demands (și eventual listări).
- **Decizie produs:** imagini ofertă cerere — publice vs private (bucket/policy/signed).

### D. Data minimization

- Înlocuire progresivă a `select('*')` cu liste de coloane în fluxuri publice și dashboard.
- Reducere **snapshot Copilot** (câmpuri, limite, agregate).

---

## 9. Ce poate intra în performance sprint fără să afecteze RLS

**Sigur de explorat** după ce testele live de bază trec (sau în paralel pe ramuri fără schimbare de policies):

- **Lighthouse** / Web Vitals pe rute cheie.
- **Bundle analysis** (importuri, code splitting).
- **`select` explicit** pe homepage, categorii, capital — **dacă** coloanele sunt strict aceleași ca în contractul UI și **nu** schimbăm logica de acces (doar reducem suprafața de date returnată accidental).
- **Lazy loading** tab-uri dashboard / HQ (UI-only).
- **Optimizare imagini** (dimensiuni, `next/image`, CDN) fără schimbare bucket policy.
- **Caching prudent** pentru pagini publice **active** — cu atenție la `revalidate` / stale data; **nu** cache-ui conținut user-specific fără separare strictă.

**Important:** **Nu** optimiza agresiv query-uri sensibile (oferte, profiluri, admin) **înainte** de a înțelege impactul asupra evaluării RLS și a testelor de regresie privacy.

---

## 10. Recomandare de ordine

1. **Închidem** sinteza statică RLS (acest document + revizuire echipă).
2. **Executăm** setul **minimal** de teste live §7 cu User A/B/D + anon în staging.
3. **Dacă** apar probleme **Critical/High** (RLS permisiv, leak oferte/profiles, edit cross-owner): sprint dedicat **hardening RLS + ownership guards** (A–B din §8).
4. **Dacă** nu apar Critical/High: intrăm în **performance deep dive** (§9) cu PR-uri mici și măsurători.
5. **Separat:** decizie scrisă pentru **imaginile `demand_offers`** (§11) — poate fi sprint privacy dedicat.

---

## 11. Decision log (deschis)

| Subiect | Întrebare | Stare |
|---------|-----------|--------|
| Imagini `demand_offers` | Publice (URL permanent) vs private (signed / bucket separat)? | **Deschis** — vezi 7A.8 ST5 |
| Descrieri cereri | Filtrare / avertisment PII obligatoriu? | **Deschis** — vezi 7A.10 D9 |
| Owner checks | Vrem **mereu** verificări explicite în client/server **peste** RLS? | **Deschis** — trade-off UX vs defense in depth |
| Copilot | Snapshot redus / anonimizat înainte de beta larg pe date reale? | **Deschis** — vezi 7A.6 P8 |
| `checkout-demand` | Legare strictă server-side `demandId` ↔ sesiune utilizator? | **Deschis** — vezi 7A.10 §5 |

---

## 12. Verdict final

Auditul static **nu** a găsit **FAIL** critic **demonstrat** în codul și probele HTTP/HTML din rapoartele 7A.5–7A.10. **Totuși**, produsul **nu** trebuie declarat **complet RLS-safe** până la **testele live** cu roluri reale și validarea **politicilor** Supabase **Storage** / **RLS**.

**Beta controlat** poate continua cu lista de riscuri și **decision log** actualizat. **Beta larg** trebuie să **aștepte** validarea live (§7), deciziile de **privacy** pentru imagini ofertă și conținut cereri, și, după caz, hardening-ul din §8.

---

*Sprint **7A.11** — document-only, read-only.*
