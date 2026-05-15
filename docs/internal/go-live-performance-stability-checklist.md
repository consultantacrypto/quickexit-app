# Quick Exit — Go-Live Performance & Stability Checklist

## 1. Context

**Țintă:** play live **săptămâna viitoare** (beta controlat), fără schimbări de design, layout sau flow-uri înainte de live.

**Pregătire documentată (sprinturi recente):**

| Sprint / raport | Concluzie principală |
|-----------------|----------------------|
| RLS profiles hardening + retest **P0-10** | **PASS** — anon nu mai citește `profiles` |
| 8A.2 + 8A.2b + hotfix | Query slimming public; runtime demands/`is_seed`; placeholder imagine |
| 8A.3 | Audit imagini/LCP — recomandări, fără patch masiv |
| 8A.4 | Baseline performanță + buget go-live |
| 8A.5 | Patch conservator: `sizes` pe galeria principală anunț |
| 8A.6 | **Nu** limit query categorii/capital fără paginare |
| Build / deploy | Verde (echipă) |

**Mediu recomandat pentru smoke:** producție `https://quickexit-app.vercel.app` (+ staging dacă există).

**Utilizare:** bifați fiecare item în ziua pre-live și în ziua live; notați tester, dată, PASS/FAIL.

**Reguli:**

- **Nu** rulați plăți Stripe reale fără decizie explicită a owner-ului.
- Console + Network = obligatoriu pe fluxurile critice.
- Un singur FAIL pe **blocant** = **No-Go** până la remediere sau acceptare documentată.

---

## 2. Ce este deja PASS (din audituri automate / statice)

| Zonă | Status | Sursă |
|------|--------|-------|
| `npm run build` | **PASS** | 8A.4, 8A.6, 8A.7 |
| HTTP 200 rute publice core (`/`, capital, 6 categorii, anunț eșantion) | **PASS** | 8A.4 |
| HTTP 500 pe publice (snapshot) | **Nu detectat** | 8A.4 |
| Supabase 400 în HTML static | **Nu detectat** | 8A.4 |
| **P0-10** anon `profiles` | **PASS** (`42501`) | RLS retest |
| `kyc_status` update doar server webhook | **PASS** (grep) | RLS authenticated smoke |
| Homepage prod LCP **2.83 s** (≤ 3.5 s) | **PASS** | 8A.4 Lighthouse prod |
| Homepage CLS **0** | **PASS** | 8A.4 |
| Homepage Lighthouse score **80** (≥ 75 beta) | **PASS** | 8A.4 |
| Query slimming coloane publice | **PASS** (static) | 8A.2b |
| `robots.txt` / `sitemap.xml` | **PASS** | 8A.2b |
| `/anunt/[id]` public HTTP + robots index | **PASS** | RLS retest + 8A.2b |

---

## 3. Ce este PARTIAL acceptat pentru beta

| Zonă | De ce PARTIAL | Acceptabil beta dacă… |
|------|---------------|------------------------|
| **Categorii (×6)** | Conținut dinamic după JS; fără confirmare Console | Carduri sau empty state corect în browser; fără 400 Supabase |
| **Capital disponibil** | Date în `useEffect` | Cereri sau empty după load; search/filter OK |
| **Anunț public** | LCP local mare; greutate imagini | Prod 200; galerie + ofertă funcționale; fără image 400 |
| **Dashboard logat** | Neconfirmat live în audituri agent | Owner confirmă login + profiles 200 + tab-uri |
| **GlobalStats** | Valori 0 pre-hidratare | Numere corecte după 2–3 s |
| **Seller trust public** | Anon nu citește `profiles` | Text generic, fără crash; fără date PII leak |
| **TBT homepage prod ~407 ms** | Peste țintă ideală 300 ms | Interacțiune hero/CTA acceptabilă |
| **Console/Network** | BLOCKED în audituri automate | Smoke manual 30–45 min pre-live |
| **P0-8 / P0-9** oferte | Backlog 7A.13 | Echipa acceptă risc sau retest dedicat |
| **Query fără limit categorii/capital** | Catalog mic acum | Monitorizare post-live; plan 8B.x paginare |

---

## 4. Blocante go-live (orice = No-Go)

- [ ] HTTP **500** pe orice rută publică critică (lista §5).
- [ ] **Supabase 400** repetat (`column does not exist`, PGRST) pe publice.
- [ ] **Next Image 400** repetat pe carduri/anunțuri.
- [ ] **Checkout** listing sau demand nu pornește / nu finalizează (test controlat).
- [ ] **Webhook Stripe** rupt (semnătură, `payment_status`, activare status).
- [ ] **Login** sau **logout** rupt.
- [ ] **Dashboard** logat rupt (spinner infinit, profiles 403/400 pentru user propriu).
- [ ] **Listing `active`** invizibil public după plată confirmată (test controlat).
- [ ] **`pending_payment`** vizibil în liste publice / homepage / categorii / capital.
- [ ] **Anon SELECT pe `profiles`** revine (regresie **P0-10**).
- [ ] `undefined` / `NaN` / `null` vizibil în UI public.
- [ ] LCP homepage prod repetabil **> 4.5 s** (mobile throttled).

---

## 5. Checklist pagini publice

**Tester:** _______________ **Dată:** _______________ **Mediu:** prod / staging

Pentru fiecare rută: `[ ]` = de verificat → notează **PASS** / **FAIL**.

| # | Rută | HTTP 200 | Fără 500 | Fără Supabase 400 | Fără Next Image 400 | Fără undefined/NaN/null | Design OK | Mobile sanity | Console fără erori critice |
|---|------|----------|----------|-------------------|---------------------|-------------------------|-----------|---------------|----------------------------|
| 1 | `/` | | | | | | | | |
| 2 | `/capital-disponibil` | | | | | | | | |
| 3 | `/categorii/auto` | | | | | | | | |
| 4 | `/categorii/imobiliare` | | | | | | | | |
| 5 | `/categorii/lux` | | | | | | | | |
| 6 | `/categorii/business` | | | | | | | | |
| 7 | `/categorii/gadgets` | | | | | | | | |
| 8 | `/categorii/foto` | | | | | | | | |
| 9 | `/anunt/<id activ din sitemap>` | | | | | | | | |
| 10 | `/tarife` | | | | | | | | |
| 11 | `/cum-functioneaza` | | | | | | | | |
| 12 | `/pune-anunt` (shell, neplatit) | | | | | | | | |
| 13 | `/posteaza-cerere` (shell) | | | | | | | | |

**Note anunț activ:** ID testat: `________________________`

**Smoke rapid Console (publice):** filtrați `error`, `PostgREST`, `hydration`, `Failed to load resource` pe rândurile 1–9.

---

## 6. Checklist toate cele 6 categorii

Aceleași criterii pentru **fiecare** slug (componentă unică `CategorieClient.tsx`).

| Categorie | URL | HTTP | Carduri / empty | Filtre `?sub=` | Cereri investitori | Verdict |
|-----------|-----|------|-----------------|----------------|-------------------|---------|
| Auto & Moto | `/categorii/auto` | | | | | |
| Imobiliare | `/categorii/imobiliare` | | | | | |
| Lux & Ceasuri | `/categorii/lux` | | | | | |
| Afaceri | `/categorii/business` | | | | | |
| Gadgets | `/categorii/gadgets` | | | | | |
| Foto & Audio | `/categorii/foto` | | | | | |

**Verificări suplimentare (o categorie cu subfiltru):**

- [ ] `/categorii/auto?sub=SUV` — rezultate coerente sau empty + reset filtru.
- [ ] Badge „X rezultate” corespunde listei vizibile.
- [ ] Secțiune licitații (dacă există date) + secțiune standard.
- [ ] Loading „Sincronizare terminal…” dispare în < 10 s pe 4G.

---

## 7. Checklist auth / dashboard

**Cont owner:** `OWNER_USER_ID` (env) — vede HQ / BMK / Operator Brief.  
**Cont non-admin:** user obișnuit — **nu** vede butoane HQ.

| # | Verificare | Owner | Non-admin | PASS |
|---|------------|-------|-----------|------|
| 1 | Login email/parolă → `/dashboard` fără loop | | | |
| 2 | Logout → sesiune cleared, header actualizat | | | |
| 3 | `GET rest/v1/profiles?id=eq.<own>` → **200**, JSON propriu | | | |
| 4 | Fără 403/400 RLS pe profiles în Network | | | |
| 5 | Tab-uri / liste se populează (anunțuri, cereri, oferte) | | | |
| 6 | Status KYC afișat în card cont | | | |
| 7 | User **fără** plată + **fără** activitate activă → **nu** blocat la postare | | | |
| 8 | User **cu** listing/cerere **active** + KYC neverificat → **KycBanner** vizibil | | | |
| 9 | **KycBanner** nu promite „cont blocat” / hard gate fals | | | |
| 10 | Owner: butoane **HQ Admin**, **BMK Lab**, **Operator Brief** vizibile | | | |
| 11 | Non-admin: **zero** linkuri/butoane HQ/BMK/Operator Brief | | | |
| 12 | Console: fără erori roșii critice pe dashboard (5 min) | | | |

**Timp perceput:** conținut util în dashboard < **5 s** pe 4G → acceptabil beta: `[ ]`

---

## 8. Checklist listing flow

> **Atenție:** plăți reale doar cu decizie explicită. Preferat: Stripe test mode / sumă minimă / anunț de test șters după.

| # | Pas | Verificare | PASS |
|---|-----|------------|------|
| 1 | `/pune-anunt` | Pagina se încarcă, pași formular navigabili | |
| 2 | Upload imagine | Fișier încărcat, preview OK (test controlat) | |
| 3 | Checkout listing | Redirect Stripe Checkout pornește | |
| 4 | Plată | `payment_status=paid` în Stripe Dashboard (test) | |
| 5 | Webhook | Log server: listing activat; fără eroare semnătură | |
| 6 | Public | `status=active` — apare pe `/`, categorie, **nu** pe `pending_payment` public | |
| 7 | `/anunt/[id]` | Pagină 200, galerie, prețuri, fără crash | |
| 8 | Ofertă | Formular ofertă / licitație trimite fără 500 | |
| 9 | `pending_payment` | Anunț neplătit **nu** în feed public | |

---

## 9. Checklist demand / capital flow

| # | Pas | Verificare | PASS |
|---|-----|------------|------|
| 1 | `/posteaza-cerere` | Formular se încarcă | |
| 2 | Submit | `upsert` profiles (dacă nou) — fără 400 RLS | |
| 3 | Checkout demand | Stripe Checkout demand pornește | |
| 4 | Webhook | `demand` → `status=active` | |
| 5 | `/capital-disponibil` | Cererea apare în listă | |
| 6 | Filtru categorie + search | Găsește cererea test | |
| 7 | `pending_payment` | Cerere neplătită **absentă** din capital public | |
| 8 | `/trimite-oferta/[demandId]` | Formular ofertă funcționează | |
| 9 | Privacy `demand_offer` imagini | Fără leak PII critic confirmat (decizie produs ulterioară) | |

---

## 10. Checklist Stripe / webhook

Verificare în **Stripe Dashboard** + loguri Vercel (`/api/webhook`).

| # | Item | Cum verifici | PASS |
|---|------|--------------|------|
| 1 | Checkout **listing** | Session creată; metadata `listingId`, `packageId`, `type` | |
| 2 | Checkout **demand** | metadata `demandId`, `type` | |
| 3 | **Webhook signature** | `constructEvent` OK; fără 400 signature failed | |
| 4 | `payment_status` | Ignoră session dacă ≠ `paid` | |
| 5 | **RON / amount** | `expectedAmount` + currency `ron` validate | |
| 6 | **Idempotency** | Re-play event → `idempotent: true`, fără duplicate active | |
| 7 | Listing după plată | `listings.status = active` | |
| 8 | Demand după plată | `demands.status = active` | |
| 9 | **profiles / KYC** | Webhook plată **nu** modifică `profiles.kyc_status` | |
| 10 | KYC separat | `/api/webhooks/kyc` doar pentru Identity (dacă testat) | |

---

## 11. Checklist KYC / trust

| # | Verificare | PASS |
|---|------------|------|
| 1 | Anon pe `/anunt/[id]` — pagina **200**, fără crash dacă profiles refuzat | |
| 2 | Trust vânzător: generic sau gol — **fără** nume/KYC real din `profiles` anon | |
| 3 | Dashboard: `KycBanner` doar după `hasPaidActivity` | |
| 4 | `showKycSoftHint` pentru user fără plată — mesaj **fără** blocare | |
| 5 | Stripe Identity session pornește din banner (staging) | |
| 6 | `kyc_status` se actualizează doar via webhook KYC server | |

---

## 12. Checklist performance

**Instrument:** Lighthouse Mobile (Incognito) + DevTools Slow 4G pe prod.

| Metrică / zonă | Țintă go-live beta | Măsurat | PASS |
|----------------|-------------------|---------|------|
| Homepage LCP | ≤ **3.5 s** | (baseline **2.83 s**) | |
| Homepage CLS | < **0.1** | (baseline **0**) | |
| Homepage Lighthouse Performance | ≥ **75** | (baseline **80**) | |
| Homepage TBT | monitorizat (< 500 ms tolerat beta) | (~407 ms) | |
| Fără runtime errors publice | obligatoriu | | |
| Fără Supabase 400/500 publice | obligatoriu | | |
| Fără Next Image 400 repetat | obligatoriu | | |
| Cele 6 categorii HTTP | **200** toate | | |
| `/anunt` activ HTTP | **200** | | |
| Anunț LCP | nu „rușinos” (> 5 s repetabil pe prod) | | |
| Dashboard | acceptabil beta (nu perfect) | | |

**După deploy 8A.5:** re-măsurați LCP pe `/anunt/<id cu poze>`.

---

## 13. Checklist mobile

Viewport: **375×667** (iPhone SE) + un device mediu.

| # | Zonă | Verificare | PASS |
|---|------|------------|------|
| 1 | Header | Logo, meniu hamburger, fără overflow | |
| 2 | Meniu mobil | Linkuri funcționale, închidere | |
| 3 | Homepage hero | CTA „Cât valorează…” tapabil | |
| 4 | Carduri homepage | Scroll, imagini, prețuri lizibile | |
| 5 | Categorii | Grid carduri, filtre subcategorie tap | |
| 6 | Capital | Search + select + carduri | |
| 7 | Anunț | Galerie, swipe/thumbnails, lightbox | |
| 8 | Dashboard | Tab-uri / liste scroll, butoane tap | |
| 9 | `/pune-anunt` | Pași formular pe ecran mic | |
| 10 | `/posteaza-cerere` | Formular completabil | |

---

## 14. Runtime error budget

### Blocante (identic §4)

Orice item din §4 deschis = **No-Go**.

### Acceptabile temporar (beta controlat)

- Lighthouse sub 85 dar ≥ 75 și pagină stabilă.
- Dashboard mai lent (< 5 s util OK).
- Seller trust generic pe anunț public.
- GlobalStats delay scurt (0 → valori reale).
- Lipsă funcție „Mega Reduceri” (dacă neplanificată).
- **KYC soft prompt** fără hard gate înainte de plată.
- TBT homepage ~400 ms dacă CTA răspunde.
- Categorii/capital fără paginare la catalog mic.
- Volume imagini mari dacă LCP rămâne în buget.

---

## 15. Rollback plan

| Situație | Acțiune |
|----------|---------|
| **Bug critic UI/funcție** după deploy | `git revert <commit>` pe branch deployat; redeploy Vercel; verificare smoke §5 (minim `/`, anunț, categorii auto) |
| **Regresie RLS** (ex. P0-10) | **Nu** revert policy în panică — analiză Supabase; restaurare policy din backup documentat; retest P0-10 |
| **Stripe / webhook** | Opriți promovarea traficului plătit; verificați Stripe Dashboard → Webhooks → deliveries; logs `/api/webhook`; fix forward sau revert commit API |
| **Performanță** (image/query) | Patch mic targeted sau revert commit 8A.5; **nu** schimba design pentru rollback |
| **UX minor** | Ticket backlog; **nu** bloca live dacă §4 e verde |
| **Date corupte** | Contact owner DB; **nu** ștergeri masive fără backup |

**Ordine revert:** ultimul commit suspect → rebuild → smoke 15 min → anunț echipă.

---

## 16. Go / No-Go criteria

### GO (beta public) când:

1. Toate rutele §5 critice (1–9) **PASS** în browser real.
2. Cele **6 categorii** §6 **PASS** (sau empty state corect documentat).
3. §4 **zero** blocante deschise.
4. Owner confirmă §7 dashboard + §8 sau §9 (minim un flux plată **test**).
5. §10 webhook **PASS** pe cel puțin un listing + un demand (test).
6. Homepage LCP prod ≤ **3.5 s** (reconfirmat post-deploy final).
7. **P0-10** revalidat rapid (script anon count profiles = refuz).

### NO-GO când:

- Orice blocant §4 sau §14.
- Checkout/webhook nefuncțional pentru fluxul principal ales la launch.
- Dashboard owner nu poate opera platforma.

**Verdict document (la completare):** ☐ GO  ☐ GO condiționat  ☐ NO-GO

**Condiții (dacă GO condiționat):** _______________________________________________

---

## 17. Ziua de live — ordine recomandată

### T−24h (pre-live)

1. `npm run build` local — verde.
2. Deploy pe producție; confirmare Vercel success.
3. Smoke §5 rute 1–9 (30 min, 2 persoane: desktop + mobil).
4. Lighthouse prod: `/` + `/anunt/<id>`.
5. Retest **P0-10** anon profiles.
6. Owner: §7 dashboard + §11 KYC.

### T−2h

1. Stripe Dashboard: webhook endpoint activ, evenimente recente OK.
2. Verificare env prod: Supabase, Stripe keys (fără expunere în chat).
3. Un anunț și o cerere **test** `active` vizibile public.

### T0 (launch)

1. Anunț intern: live beta.
2. Monitor 60 min: Vercel logs, Stripe webhooks, rapoarte utilizatori.
3. Smoke spot: `/`, `/categorii/auto`, `/capital-disponibil`, login dashboard.

### T+24h

1. Review erori Console raportate de utilizatori.
2. Lighthouse spot-check.
3. Decizie backlog: paginare categorii (8B.x), logo LCP, GlobalStats RPC.

---

## 18. Verdict

| Element | Stare la crearea checklist-ului |
|---------|--------------------------------|
| Document operațional | **Creat** — de completat de echipă pre-live |
| Cod / DB / RLS / Stripe | **Neatins** în sprint 8A.7 |
| Build | **PASS** |
| Go-live tehnic (din audituri) | **GO condiționat** — necesită smoke manual §5–§11 și confirmare plăți test |
| Risc principal rămas | Console/Network neconfirmat; dashboard live; volum imagini; query fără limit la scale |

---

## Referințe interne

- `docs/internal/performance-baseline-and-budget.md`
- `docs/internal/performance-image-lcp-audit.md`
- `docs/internal/performance-public-query-limits-audit.md`
- `docs/internal/performance-public-query-slimming-runtime-smoke.md`
- `docs/internal/rls-profiles-hardening-retest-report.md`
- `docs/internal/rls-authenticated-smoke-after-profiles-fix.md`

---

*Checklist generat în sprint 8A.7 — docs only.*
