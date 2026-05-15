# Quick Exit — Performance Baseline + Go-Live Budget

## 1. Context

**Sprint:** 8A.4 — Performance Baseline + Budget (read-only).  
**Țintă:** play live săptămâna viitoare, cu performanță „cu artă și precizie”, **fără** schimbări de design, layout, flow-uri sau identitate Quick Exit.

**Pregătire finalizată înainte de acest sprint:**

- 8A.1 — Performance Deep Dive Audit
- 8A.2 — Public Pages Query Slimming
- 8A.2b — Runtime Smoke
- 8A.2c — Hotfix runtime errors după slimming
- 8A.3 — Image / LCP Optimization Audit

**Mediu audit (2026-05-15):**

| Element | Valoare |
|---------|---------|
| Branch | `main` |
| Working tree | **Curat** (`git status --short` gol) |
| Next.js | 16.2.4 (Turbopack) |
| Build local | `npm run build` — **succes** |
| Server test | `npm run start` pe `http://localhost:3000` |
| Producție referință | `https://quickexit-app.vercel.app` (din `lib/siteUrl.ts`) |
| Modificări cod/DB/RLS/Stripe/Auth/SEO | **Niciuna** în acest sprint |

**Regula de aur:** nu schimbăm designul ca să câștigăm performance — optimizăm implementarea, nu identitatea.

---

## 2. Build baseline

| Verificare | Rezultat |
|------------|----------|
| **Status build** | **Succes** — compilare ~5s, TypeScript OK, 32/32 pagini generate |
| **Environments** | `.env.local` încărcat la build |
| **Warning-uri** | Niciun warning Next/TypeScript relevant; doar notificare npm versiune |
| **First Load JS per rută** | **Nu** apare în output-ul `next build` (Next 16 + Turbopack) — baseline bundle necesită Lighthouse / `@next/bundle-analyzer` (sprint implementare, cu aprobare deps) |

### Rute generate (relevante go-live)

| Rută | Tip | Note |
|------|-----|------|
| `/` | ƒ dynamic | `force-dynamic`, `revalidate = 0` |
| `/anunt/[id]` | ƒ dynamic | idem |
| `/categorii/[slug]` | ƒ dynamic | 6 slug-uri publice |
| `/capital-disponibil` | ○ static shell | date în client `useEffect` |
| `/dashboard` | ○ static shell | ~1376 linii client, date post-login |
| `/sitemap.xml` | ○ | revalidate 1h |
| API (`/api/checkout`, webhook, KYC, etc.) | ƒ | în afara scope măsurători UI |

---

## 3. Rute testate

### Metodă

- HTTP `GET` (PowerShell `Invoke-WebRequest`) pe **localhost** (build producție local) și spot-check **Vercel**.
- Analiză HTML static (fără execuție JavaScript completă).
- Lighthouse 12.8.2 headless (Mobile simulat implicit).
- **Nu** s-a folosit Chrome DevTools autentificat pentru dashboard.

### Public core

| Rută | HTTP (local) | HTTP (prod) | Pagină se încarcă | 400/401/500 HTTP | Supabase/PostgREST în HTML | Next image 400 în HTML | Conținut / empty state | Observații runtime |
|------|--------------|-------------|-------------------|------------------|----------------------------|------------------------|------------------------|-------------------|
| `/` | 200 (~213 ms) | 200 (~2s TTFB) | Da | Nu | Nu | Nu (false positive posibil în payload RSC) | SSR: carduri anunțuri (ex. BMW, boxe Linn), cereri capital, licitații, categorii | `force-dynamic` — mereu fresh; `/_next/image` + Supabase storage în HTML |
| `/capital-disponibil` | 200 | 200 | Da (shell) | Nu | Nu | Nu | H1 „Cumpărători pregătiți”; loading client „Scuturăm baza…” în HTML | Date cereri după hidratare — validare completă în browser |
| `/anunt/1a83fbc1-bba9-4104-a5e6-e39f72fd2f72` | 200 (~92 ms) | 200 | Da | Nu | Nu | Nu | Titlu SEO în `<title>`; body client „Se încarcă anunțul…” fără JS | Din sitemap (5 anunțuri active); galerie după hidratare |

**ID anunț folosit în baseline:** `1a83fbc1-bba9-4104-a5e6-e39f72fd2f72` (primul din `sitemap.xml` local).

### Private / auth

| Rută | HTTP | Verdict |
|------|------|---------|
| `/dashboard` | 200 (shell static) | **BLOCKED** — fără sesiune auth: nu se pot verifica profiles/KYC, tab-uri, butoane owner-only, erori console/network |

---

## 4. Măsurători performance

### Lighthouse — rulat

| Mediu | URL-uri | Profil |
|-------|---------|--------|
| Localhost (`npm run start`) | `/`, `/capital-disponibil`, `/categorii/auto`, `/anunt/1a83fbc1-…` | Lighthouse 12.8.2, categorie Performance, headless |
| Producție Vercel | `/` | Idem |

**Notă metodologică:** LCP pe **localhost** este **semnificativ mai slab** decât pe Vercel (latență locală, fără CDN edge, imagini mari din storage). **Baseline go-live trebuie validat pe producție** (și pe device real throttled).

### Rezultate localhost (Mobile simulat)

| Rută | Score | LCP (s) | FCP (s) | Speed Index (s) | TBT (ms) | CLS | Requests | Total (KB) | JS (KB) | Img (KB) |
|------|-------|---------|---------|-----------------|----------|-----|----------|------------|---------|----------|
| `/` | 75 | 9.01 | 0.92 | 1.81 | 97 | 0 | 49 | 1669 | 405 | 805 |
| `/capital-disponibil` | 74 | 8.86 | 0.91 | 0.91 | 113 | 0 | 37 | 1636 | 391 | 805 |
| `/categorii/auto` | 76 | 7.21 | 0.91 | 0.91 | 81 | 0 | 44 | 1684 | 397 | 844 |
| `/anunt/…linn…` | 76 | 6.53 | 0.92 | 2.87 | 80 | 0 | 55 | 9090 | 406 | **8239** |

### Rezultate producție — homepage

| Metrică | Valoare |
|---------|---------|
| Performance score | **80** |
| LCP | **2.83 s** |
| FCP | **2.83 s** |
| Speed Index | **3.49 s** |
| TBT | **407 ms** |
| CLS | **0** |
| INP | N/A (Lighthouse 12, fără field INP în acest run) |
| Requests | 48 |
| Total transfer | ~12.8 MB |
| JS transfer | ~410 KB |
| Image transfer | ~12.4 MB |

### Lighthouse — BLOCKED / neacoperit

| Rută | Status |
|------|--------|
| `/categorii/imobiliare`, `/lux`, `/business`, `/gadgets`, `/foto` | **Ne rulat** (auto = proxy rezonabil structură identică) |
| `/dashboard` logat | **BLOCKED** (auth) |
| Mobile throttled manual (Slow 4G, device fizic) | **Recomandat manual** pre-go-live |

### Plan manual Chrome DevTools (obligatoriu pre-play)

1. Incognito, extensii off, tab **Network** + **Console**.
2. Throttling: **Slow 4G** + **Mobile** (iPhone SE + iPhone 14).
3. URL-uri: `/`, `/anunt/<id cu 3+ poze>`, `/categorii/auto`, `/capital-disponibil`, `/dashboard` (logat).
4. Verificați: LCP element, ordinea `/_next/image`, request-uri Supabase `rest/v1` (status 200 vs 400), erori hidratare.
5. Repetați după orice sprint implementare (8A.5+).

---

## 5. Buget go-live

| Zonă | Metrică | Target go-live (beta) | Target ideal post-beta | Blocant? |
|------|---------|----------------------|-------------------------|----------|
| **Homepage mobile (prod)** | Fără runtime errors | Obligatoriu | Obligatoriu | **Da** |
| **Homepage mobile (prod)** | LCP | **≤ 3.5 s** (throttled) | ≤ 2.5 s | **Da** (dacă > 4.5 s repetabil) |
| **Homepage** | CLS | **< 0.1** | < 0.05 | **Da** dacă > 0.25 |
| **Homepage** | TBT | **< 300 ms** | < 150 ms | Parțial (prod măsurat **407 ms** — monitorizare) |
| **Homepage** | Performance score Lighthouse | ≥ 70 acceptabil beta | ≥ 85 | Nu (dacă stabil) |
| **Anunț public** | HTTP + titlu SEO | 200 | 200 | **Da** |
| **Anunț public** | Prima imagine vizibilă rapid | LCP imagine ≤ 4 s prod | ≤ 2.5 s | **Da** pe rute cu trafic |
| **Anunț public** | Galerie funcțională | Da | Da | **Da** |
| **Anunț public** | CLS | < 0.1 | < 0.05 | Mediu |
| **Anunț public** | Greutate imagini | Evitat > 5 MB total pagină | Thumbnail policy | Nu la beta mică |
| **Cele 6 categorii** | HTTP | **200 toate** | 200 | **Da** |
| **Categorii** | Fără Supabase 400 | Obligatoriu | Obligatoriu | **Da** |
| **Categorii** | Carduri sau empty state corect | Da (browser) | Da | **Da** |
| **Categorii** | Fără undefined/NaN/null vizibil | Obligatoriu | Obligatoriu | **Da** |
| **Capital disponibil** | HTTP 200 | Da | Da | **Da** |
| **Capital** | Cereri sau empty state | Da post-fetch | Da | **Da** |
| **Capital** | Search/filter funcțional | Da (browser) | Da | Mediu |
| **Dashboard** | Login + încărcare fără crash | Da | Da | **Da** |
| **Dashboard** | Profiles/KYC fără 400 RLS | Da | Da | **Da** |
| **Dashboard** | LCP / TBT | Acceptabil beta | Optimizare majoră | Nu |
| **Global** | JS transfer | ~400 KB (observat) — urmărit | < 300 KB | Nu la beta |
| **Global** | Erori 500 rute publice | **0** | 0 | **Da** |

**Verdict buget homepage prod (Lighthouse 2026-05-15):** LCP **2.83 s** → **în buget**; CLS **0** → **în buget**; TBT **407 ms** → **peste țintă ideală**, de monitorizat; volum imagini **mare** (~12 MB) → risc bandwidth, nu neapărat blocant dacă LCP rămâne sub 3.5 s.

---

## 6. Runtime error budget

### Blocante pentru go-live

- Orice **HTTP 500** pe rute publice.
- Orice **Supabase/PostgREST 400** repetat pe rute publice (coloane, RLS, policy).
- Orice **Next Image 400** repetat pe carduri/anunțuri.
- **Dashboard** logat rupt (profiles, liste, oferte).
- **Checkout / webhook** rupt.
- **Login / logout** rupt.
- Conținut corupt vizibil: `undefined`, `NaN`, `null` în UI.

### Acceptabile temporar (beta)

- Lighthouse sub scor ideal (ex. 74–80) dacă pagina e **stabilă** și LCP prod ≤ 3.5 s.
- **TBT** ușor ridicat pe homepage prod dacă nu blochează interacțiunea critică.
- **Dashboard** mai greu (bundle mare) dacă nu crapă după login.
- Categorii cu puține date dacă **empty state** e corect.
- **Seller trust** public generic temporar.
- Categorii: loading „Sincronizare terminal…” scurt înainte de carduri.
- **GlobalStats** cu valori 0 înainte de hidratare client.

### Status audit 8A.4 (HTTP + Lighthouse)

| Tip eroare | Detectat în acest audit? |
|------------|---------------------------|
| HTTP 500 | **Nu** |
| Supabase 400 în HTML | **Nu** |
| Next image 400 confirmat | **Nu** (grep HTML = zgomot RSC; necesită Network în browser) |
| Console runtime | **BLOCKED** fără browser autentificat |

---

## 7. Cele 6 categorii — matrice

| Categorie | URL | HTTP (local/prod) | Conținut / empty state | Erori Supabase (HTML) | Erori imagine (HTML) | Verdict |
|-----------|-----|---------------------|------------------------|----------------------|----------------------|---------|
| Auto & Moto | `/categorii/auto` | 200 / 200 | Shell OK; „Sincronizare terminal…” → carduri după JS | Nu | Nu | **PASS** HTTP; **PARTIAL** conținut dinamic |
| Imobiliare | `/categorii/imobiliare` | 200 / 200 | Idem | Nu | Nu | **PASS** / **PARTIAL** |
| Lux & Ceasuri | `/categorii/lux` | 200 / 200 | Idem | Nu | Nu | **PASS** / **PARTIAL** |
| Afaceri de vânzare | `/categorii/business` | 200 / 200 | Idem | Nu | Nu | **PASS** / **PARTIAL** |
| Gadgets | `/categorii/gadgets` | 200 / 200 | Idem | Nu | Nu | **PASS** / **PARTIAL** |
| Foto & Audio | `/categorii/foto` | 200 / 200 | Idem | Nu | Nu | **PASS** / **PARTIAL** |

**Observație cod (read-only):** `CategorieClient.tsx` încă **nu aplică `.limit()`** pe query-uri `listings` / `demands` — risc performanță la creștere catalog (8A.1, încă valabil după slimming coloane).

---

## 8. Homepage baseline

| Check | Rezultat |
|-------|---------|
| HTTP 200 | Da (local + prod) |
| Hero / pachete / categorii | Prezente în HTML SSR |
| Anunțuri active în HTML | Da (titluri, prețuri, linkuri `/anunt/…`) |
| Licitații | Prezente dacă există în DB |
| Cereri capital | Carduri cu buget/categorie în SSR |
| GlobalStats | Secțiune prezentă; valori complete după client fetch |
| Imagini carduri | `/_next/image` + URL-uri Supabase în SSR |
| Query slimming 8A.2 | `listings` / `demands` cu coloane explicite + limit 48 / 9 |
| LCP prod (Lighthouse) | **2.83 s** — în buget |
| LCP local (Lighthouse) | **9.01 s** — nu folosiți localhost ca singur semnal |

**Verdict homepage:** **GO condiționat** — validare TBT + Network imagini pe device real; fără erori runtime în browser.

---

## 9. Anunț public baseline

| Check | Rezultat |
|-------|---------|
| HTTP 200 | Da |
| Titlu SEO | Da (ex. boxe Linn) |
| Conținut fără JS | Loading state client |
| LCP local | 6.53 s (imagini ~8.2 MB transfer în run) |
| CLS | 0 |
| Galerie / priority (din 8A.3) | Imagine principală cu `priority`; `sizes` lipsă pe hero galerie — backlog |

**Verdict anunț:** **PARTIAL** — routing + metadata OK; LCP dominat de greutate imagini; implementare 8A.5 recomandată fără schimbare design.

---

## 10. Capital disponibil baseline

| Check | Rezultat |
|-------|---------|
| HTTP 200 | Da |
| Shell + filtre | Da în HTML |
| Date cereri | Loading client — confirmare în browser |
| LCP local | 8.86 s |
| Query slimming | Coloane explicite pe `demands` (8A.2) |

**Verdict capital:** **PARTIAL** — stabil la nivel HTTP; performanță client de confirmat în DevTools.

---

## 11. Dashboard baseline

**Status:** **BLOCKED** — lipsă credențiale sesiune în mediul de audit.

### Checklist manual owner (pre-go-live)

- [ ] Login email/parolă → redirect `/dashboard` fără loop.
- [ ] Tab Portofoliu / Cumpărări / Oferte se încarcă fără spinner infinit.
- [ ] Request `profiles` → **200**, fără 400 PostgREST.
- [ ] KYC banner / status corect după RLS fix.
- [ ] Listări proprii + `AdCard` imagini OK.
- [ ] Butoane editare doar pe anunțuri owner.
- [ ] Console: fără hidratare mismatch, fără `column does not exist`.
- [ ] Timp perceput acceptabil (< 5 s până la conținut util) pe 4G.

---

## 12. Prioritizare optimizări (fără implementare în 8A.4)

| Prioritate | Zonă | Impact estimat | Risc design/funcție | Efort | Recomandare |
|------------|------|------------------|---------------------|-------|-------------|
| **A** | Imagini / LCP (`priority` prim AdCard, `sizes` galerie anunț, politică dimensiuni upload Supabase) | **Ridicat** pe LCP anunț + homepage | **Scăzut** dacă nu schimbăm layout | Mic–mediu | **Go-live** (8A.5) |
| **B** | JS / hydration (lazy tab-uri dashboard/hq-admin, split `AnuntClient`) | **Ridicat** TBT/INP | Mediu (regresii form oferte) | Mare | **Post-beta** parțial; lazy safe tabs **go-live** dacă timp |
| **C** | Query-uri publice (`.limit()` categorii + capital; revizuire `GlobalStats` agregare client) | **Ridicat** la scale | **Scăzut** cu QA RLS | Mic | **Go-live** limit categorii |
| **D** | Dashboard bundle | **Mediu** perceput login | Mediu | Mare | **Post-beta** |
| **E** | Caching public prudent (ISR homepage cu revalidate scurt, nu `force-dynamic` permanent) | **Ridicat** TTFB | **Mediu** (date stale) | Mediu | **Post-beta** după măsurare stale OK |

---

## 13. Ce NU schimbăm pentru performance

- Design vizual, spacing, tipografie, culori, identitate brand.
- Layout pagini, structură secțiuni, flow-uri utilizator.
- Copy / mesaje marketing.
- Business logic (licitații, oferte, strategii vânzare).
- DB schema, RLS, policies.
- Stripe, webhook, checkout.
- Auth, KYC, metadata SEO.
- Rute API noi sau tracking nou.

---

## 14. Go / No-Go criteria pentru next week

### GO (beta public) dacă:

1. Toate rutele publice critice returnează **200** (confirmat pentru cele 6 categorii + core).
2. **Zero** 500 și **zero** Supabase 400 repetat în smoke browser pe `/`, categorii, capital, anunț.
3. LCP homepage **≤ 3.5 s** pe **producție** mobile throttled (măsurat **2.83 s** într-un run — reconfirmați).
4. CLS **< 0.1** (măsurat **0**).
5. Dashboard checklist owner **PASS**.
6. Checkout smoke minim **PASS** (în afara scope 8A.4 — obligatoriu echipă).

### NO-GO dacă:

1. 500 sau 400 Supabase pe fluxuri publice principale.
2. Anunțuri fără imagine / galerie ruptă pe ID-uri din sitemap.
3. Categorii cu crash sau text `undefined`/`NaN` vizibil.
4. Login sau dashboard owner rupt după RLS.
5. LCP prod repetabil **> 4.5 s** pe homepage sau anunțe top trafic.

**Recomandare sprint 8A.4:** **GO condiționat** — baseline stabil la HTTP; performanță prod homepage în buget LCP; **TBT + dashboard auth + smoke imagini** rămân de închis manual înainte de play.

---

## 15. Următorii pași recomandați

1. **Smoke manual 30 min** (owner): DevTools pe cele 6 categorii + dashboard logat + checkout.
2. **Sprint 8A.5 — Implementare performance (conservator):** A + C din prioritizare, fără design changes.
3. **Re-run Lighthouse prod** după 8A.5: `/`, `/anunt/<id>`, `/categorii/auto`.
4. **Politică imagini upload** (thumbnail / max dimensiune) — sprint tehnic separat.
5. **Bundle analyze** dashboard — post-beta.

---

## Anexe

### Comenzi rulat în audit

```text
git status --short
git branch --show-current
npm run build
npm run start
# HTTP smoke localhost + quickexit-app.vercel.app
# npx lighthouse@12.8.2 (localhost 4 URL + prod homepage)
```

### Sitemap local (snapshot)

- **5** URL-uri `/anunt/…` active
- **6** URL-uri `/categorii/…`

### Fișiere artefact temporare (necomitate)

Rapoarte Lighthouse JSON au fost generate sub `docs/internal/lighthouse-8a4/` și `lighthouse-8a4-prod/` doar pentru extragere metrici; **nu** fac parte din livrabil obligatoriu — pot fi șterse sau ignorate la commit.

---

*Document generat în sprint 8A.4 — read-only, fără modificări cod.*
