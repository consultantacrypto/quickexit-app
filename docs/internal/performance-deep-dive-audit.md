# Quick Exit — Performance Deep Dive Audit

## 1. Context

După închiderea etapei **RLS** (inclusiv **profiles** hardening și **P0-10 PASS**), acest document centralizează un **audit read-only** orientat spre **viteză** și **UX performance**: rute, query-uri Supabase, bundle client, imagini, caching/dynamic și plan de măsurători (**Lighthouse**). **Nu** include modificări de cod, DB, RLS, Stripe, webhook, checkout, Auth/KYC sau SEO.

**Mediu analizat:** repo `quickexit`, **Next.js 16.2.4** (Turbopack), build local `npm run build` (mai 2026).

---

## 2. Build baseline

| Element | Rezultat |
|---------|----------|
| **Build** | **Reușit** (`✓ Compiled`, TypeScript OK, generare pagini 32/32). |
| **Rute generate** | Vezi tabel Next: `/` (ƒ), `/anunt/[id]` (ƒ), `/capital-disponibil` (○), `/categorii/[slug]` (ƒ), `/dashboard` (○), `/hq-admin` (○), `/pune-anunt` (○), `/posteaza-cerere` (○), API routes ƒ, etc. |
| **Static (○) vs Dynamic (ƒ)** | Majoritatea marketing + formulare = **○ static** (shell prerender). **ƒ dynamic:** `/`, `/anunt/[id]`, `/categorii/[slug]`, `/editeaza-anunt/[id]`, `/trimite-oferta/[id]`, rute API. |
| **First load JS** | **Nu** apare în output-ul curent al `next build` (Turbopack nu listează bundle-uri per rută în acest format) — măsurare recomandată cu **analyze** / **Lighthouse** / **@next/bundle-analyzer** (sprint separat, cu aprobare deps). |
| **Warning-uri build** | Nu au fost observate warning-uri relevante în output-ul capturat (doar notificare npm versiune). |

---

## 3. Rute critice

| Rută | Server/Client | Dynamic / cache | Query-uri Supabase | `select('*')`? | Imagini | JS / hydration | Risc perf. | Risc la optimizare |
|------|----------------|-----------------|-------------------|----------------|-----------|----------------|------------|---------------------|
| **`/`** | **Server** `page.tsx` + **Client** `GlobalStats`, `AdCard`, `DemandCard` | `force-dynamic`, `revalidate = 0` | Server: `listings` limit 48, `demands` limit 9 — ambele `*`. Client: `GlobalStats` — `listings`/`demands` fără limit pe agregate + `count` sold | Da (server + parțial client) | `AdCard` → `next/image` + `priority` opțional | **Dublu fetch:** date server + client stats pe același domeniu de date | **Mare** (SSR mereu fresh + client suplimentar greu) | ISR/cache homepage trebuie aliniat cu date fresh; **RLS** la slimming coloane |
| **`/anunt/[id]`** | **Server** `page.tsx` (SEO) + **Client** `AnuntClient` (~1340 linii) | `force-dynamic`, `revalidate = 0` | Client: `listings` `*`, `profiles` subset, `listings` multiple `*`, `listing_offers` insert | Da (listings) | Galerie `Image` fill + thumbnails | **Hydration mare** (form oferte, licitație, share) | **Mare** | Slimming `select` pe `listings`; **nu** reduce filtre `status`/`is_seed`; **profiles** post-RLS |
| **`/capital-disponibil`** | **Server** shell + **Client** `CapitalDisponibilClient` | **○** static page; date în `useEffect` | `demands` `*`, `active`, order | Da | Fără imagini card principale (emoji) | Hydration moderat | **Mediu** | `select` explicit + limit dacă lista crește |
| **`/categorii/[slug]`** | **Server** metadata + **Client** `CategorieClient` | **ƒ** (segment dinamic) | `listings` + `demands` `*`, **fără `.limit()`** pe categorie | Da | `AdCard` | Două query-uri pot returna **multe rânduri** | **Mare** (N+1 date) | **`limit` obligatoriu** înainte de cache — low risk |
| **`/dashboard`** | **Client** unic `page.tsx` (~1376 linii) | **○** static; date după login | Multe: `profiles` `*`, `listings` `*`, `listing_offers` `*`, `demands` `*`, `demand_offers` parțial explicit, etc. | Da | `AdCard` în liste | **Foarte mare** (tab-uri, multe state-uri, liste) | **Foarte mare** | **Split bundle / lazy tabs**; slimming `*` trebuie validat **RLS** + UI |
| **`/hq-admin`** | **Client** `page.tsx` (~1283 linii) | **○** static | `listings`/`demands`/`listing_offers`/`demand_offers` `*` **limit 200**; `profiles` coloane explicite; `admin_risk_resolutions` `*` | Da (4 tabele) | Minim | **Încărcare grea** la `loadAdminData` | **Mare** | Lazy pe tab-uri; păstrați limite; admin **RLS** |
| **`/pune-anunt`** | **Client** `PuneAnuntClient` (~1321 linii) | **○** static | `listings` pentru verificări / duplicate | Parțial `*` în fluxuri | Upload fișiere + preview | Form multi-step mare | **Mare** | Split pași / dynamic import evaluare |
| **`/posteaza-cerere`** | **Client** `PosteazaCerereClient` (~569 linii) | **○** static | `profiles` upsert; `demands` insert | `demands` `.select()` după insert | Minim | Moderat | **Mediu** | Upsert deja coloane limitate — OK |

---

## 4. Supabase query audit

| Fișier | Tabel | Query (rezumat) | `*`? | Limit? | Public / Privat | Risc perf. | Risc RLS |
|---------|--------|-----------------|------|--------|-------------------|------------|----------|
| `app/page.tsx` | `listings` | `*`, active, order, **48** | Da | Da | Public SSR | Mediu | Slimming coloane → verificare payload |
| `app/page.tsx` | `demands` | `*`, active, **9** | Da | Da | Public SSR | Mic | Idem |
| `app/components/GlobalStats.tsx` | `listings` | `exit_price` toate active | Nu | **Nu** | Public client | **Ridicat** (scan complet) | Agregare client |
| `app/components/GlobalStats.tsx` | `demands` | `budget` toate active | Nu | **Nu** | Public client | **Ridicat** | Idem |
| `app/categorii/.../CategorieClient.tsx` | `listings` | `*`, categorie, **fără limit** | Da | **Nu** | Public client | **Critic** | Adăugare `limit` low-risk |
| `app/categorii/.../CategorieClient.tsx` | `demands` | `*`, categorie, **fără limit** | Da | **Nu** | Public client | **Critic** | Idem |
| `app/capital-disponibil/CapitalDisponibilClient.tsx` | `demands` | `*`, active | Da | **Nu** | Public client | Mediu | Limit + coloane |
| `app/anunt/.../AnuntClient.tsx` | `listings` | `*`, id | Da | 1 | Public client | Mediu | Păstrați filtre status |
| `app/anunt/.../AnuntClient.tsx` | `profiles` | coloane explicite | Nu | 1 | Public client | Mic | Deja hardening |
| `app/dashboard/page.tsx` | `profiles` | `*`, own id | Da | 1 | Privat auth | Mediu | Dashboard |
| `app/dashboard/page.tsx` | `listings` | `*`, own | Da | Nu | Privat | Mediu | Idem |
| `app/dashboard/page.tsx` | `listing_offers` | `*` în `in(listing_id)` | Da | Nu | Privat | Mediu | Oferte |
| `app/dashboard/page.tsx` | `demands` / `demand_offers` | mix | Parțial | Nu | Privat | Mediu | Idem |
| `app/hq-admin/page.tsx` | multiple | `*` + order + **200** | Da | Da | Admin | Mare | Nu schimba fără QA admin |
| `app/api/hq/copilot/route.ts` | multiple | `*` + **500/300** | Da | Da | Server admin | Mare | Service role |
| `app/trimite-oferta/.../page.tsx` | `demands` | `*` | Da | 1 | Public form | Mic | — |
| `app/editeaza-anunt/.../page.tsx` | `listings` | `*` | Da | 1 | Auth | Mic | Edit |

**Quick wins evidențiate:** homepage (`select` + **GlobalStats**), **categorii** (`limit` lipsă), **capital** (limit + coloane), **anunț** (slim `listings`), **dashboard**/`hq-admin` (volum + `*`).

---

## 5. Client bundle / hydration audit

| Fișier | `use client` | Observații | Split / lazy posibil | Librării | Mobile |
|--------|--------------|--------------|----------------------|----------|--------|
| `app/dashboard/page.tsx` | Da | ~**1376** linii; multe `useState` / `useEffect`; tab-uri `portofoliu` / `cumparari` / `oferte` | **Dynamic import** pe secțiuni tab; **lazy** liste oferte | `lucide-react` (multe iconuri) | Risc scroll + re-render |
| `app/hq-admin/page.tsx` | Da | ~**1283** linii; tab-uri `overview`, `copilot`, `listings`, … | **Lazy** tab Copilot + tabele mari | `lucide`, share kit | Idem |
| `app/anunt/[id]/AnuntClient.tsx` | Da | ~**1341** linii; licitație + oferte + galerie | Extrage **AuctionPanel**, **OfferForm** | — | LCP imagini + JS |
| `app/components/Header.tsx` | Da | Nav + `Image` logo | Mic | — | OK |
| `app/pune-anunt/PuneAnuntClient.tsx` | Da | ~**1321** linii; pași + analiză AI | Lazy pas 3+ / evaluare | `Loader2` | Upload memorie |
| `app/posteaza-cerere/PosteazaCerereClient.tsx` | Da | ~**569** linii | Moderat | — | OK |

**lucide-react:** import per icon sau barrel — de verificat în **bundle analyze** (nu extinde acest audit).

---

## 6. Image audit

| Zonă | Tehnologie | Observații | LCP / risk |
|------|-------------|--------------|------------|
| **Header logo** | `next/image` | `Header.tsx` | OK cu dimensiuni din layout |
| **AdCard** | `next/image` `fill` + **`sizes`** + **`priority`** opțional | Quick win deja parțial aplicat pentru carduri prioritare | LCP pe homepage dacă primele carduri au `priority` |
| **AnuntClient** | `Image` galerie principală + thumbnails `fill` | Verificare **`sizes`** pe toate variantele; surse **Supabase storage** (URL extern) | **LCP** dependent de CDN + dimensiune imagine sursă |
| **DemandCard** | Fără imagine foto | Emoji — fără cost imagine | — |
| **Lightbox** | În `AnuntClient` (dacă există) | Verificat fragment: galerie cu `Image` | A doua imagine fără `priority` by default — OK |

**Quick wins:** `sizes` consistent pe toate `fill`; **`priority` doar** pentru primul card / prima imagine anunț; **transformări** Supabase (dacă adoptate politic) pe URL-uri; evitare imagini necompresate la upload.

**Risc:** imagini mari în **bucket** fără variantă thumbnail — încărcare completă pe card.

---

## 7. Caching / dynamic audit

| Config | Unde | Efect |
|--------|------|--------|
| `force-dynamic` + `revalidate = 0` | `app/page.tsx`, `app/anunt/[id]/page.tsx` | **Fără cache** HTML la CDN pentru aceste rute — fiecare vizită = SSR/worker. |
| **○ static** | `/dashboard`, `/capital-disponibil`, `/hq-admin`, etc. | Shell **prerender**; date sensibile tot în **client fetch** (nu devine „public cache” pentru date private). |
| `revalidate = 3600` | `app/sitemap.ts` | ISR pentru sitemap — OK. |

**Ce poate fi cache-uit (conservativ):** subset **public** read-only (ex. listări active) cu **ISR** scurt **numai** dacă produsul acceptă staleness câteva minute și **RLS** rămâne corect pe endpoint.

**Ce nu trebuie cache-uit:** răspunsuri **per-user** (dashboard), **admin**, **checkout**, **webhook**.

**Atenție post-RLS:** orice **edge cache** / ISR pe date `listings`/`demands` trebuie să nu expună rânduri nepermise — preferați **coloane minime** + **TTL scurt** + invalidare la deploy.

---

## 8. Lighthouse / measurement plan

**În acest sprint nu s-a rulat Lighthouse** (fără instalare tool nou fără aprobare).

**Plan manual recomandat:**

| Pagină | Metrici | Unelte |
|--------|---------|--------|
| `/` | **LCP**, **CLS**, **INP**/TBT, dimensiune JS | Chrome DevTools → Lighthouse (mobile) |
| `/anunt/[id]` activ | LCP (imagine hero), TBT, request-uri `rest/v1` | Idem + tab Network |
| `/capital-disponibil` | LCP, TBT | Idem |
| `/dashboard` | După **login** test; TBT, long tasks | Idem (autentificat) |

**Înregistrări:** salvare rapoarte HTML Lighthouse în spațiu intern (fără tokenuri în repo).

---

## 9. Top 10 probleme probabile

1. **Homepage** `force-dynamic` + **dublu** fetch (SSR + `GlobalStats` client fără limit).  
2. **Categorii** — `select('*')` pe `listings`/`demands` **fără `limit`**.  
3. **Dashboard** — fișier monolitic + multe `select('*')`.  
4. **HQ Admin** — 4× `select('*')` cu limit 200 simultan la load.  
5. **AnuntClient** — fișier mare + multiple `listings` `*`.  
6. **PuneAnuntClient** — form mare + logică evaluare în același bundle.  
7. **LCP** — imagini listări din storage fără variantă optimizată garantată.  
8. **Hydration** — multe componente client pe homepage.  
9. **Fără bundle analyzer** în pipeline — orb la creșteri viitoare.  
10. **Turbopack build** — lipsă metrici First Load JS în output standard.

---

## 10. Top 10 quick wins (low-risk)

1. Adăugare **`.limit(N)`** pe `CategorieClient` pentru `listings` și `demands` (ex. 48/24).  
2. **GlobalStats:** înlocuire cu **count** head sau limit + agregare **SQL** (sau RPC) — *medie complexitate*, dar fără schimbare UX.  
3. **Homepage server:** `select` explicit pe coloanele folosite de `AdCard`/`DemandCard`.  
4. **Capital:** `select` explicit + `limit` rezonabil.  
5. **Anunț:** `listings` `select` explicit pentru primul fetch.  
6. **`priority={true}`** doar pentru **primele 2–4** `AdCard` pe homepage.  
7. **Dynamic import** pentru sub-arbori mari din **dashboard** (ex. tab Oferte).  
8. **Dynamic import** pentru **HQ** tab „Copilot”.  
9. Documentare **sizes** lipsă pe orice `Image fill` rămas.  
10. Activare **bundle analyzer** ocazional în CI (cu aprobare).

---

## 11. Ce NU optimizăm încă

- Politici **RLS** / **Storage** — nu schimbați comportamentul pentru a câșta performanță fără review securitate.  
- **Slimming agresiv** `select('*')` pe **oferte** / **profiles** fără teste de regresie **RLS** și UI.  
- **ISR agresiv** pe homepage dacă produsul cere date **live** la fiecare refresh.  
- **Debundling lucide** fără măsurare (risc micro-optimizare).  
- **Checkout / webhook / Stripe** — out of scope.

---

## 12. Sprinturi recomandate

| Sprint | Conținut |
|--------|----------|
| **8A.2** | **Public pages query slimming** — homepage, capital, categorii (`limit` + coloane explicite); revisit `GlobalStats`. |
| **8A.3** | **Image / LCP** — `sizes`, `priority`, politici imagini upload; eventual width/height sau transformări CDN. |
| **8A.4** | **Dashboard bundle split** — lazy tab-uri, extragere componente, reducere re-fetch. |
| **8A.5** | **HQ Admin lazy tabs** — încărcare la click pentru tabele mari + Copilot. |
| **8A.6** | **Cache strategy** — experiment ISR / `revalidate` conservativ doar pentru rute publice validate; nu înlocuiește RLS. |

---

*Sprint **8A.1** — audit read-only; fără modificări în repo.*
