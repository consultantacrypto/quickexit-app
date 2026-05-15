# Quick Exit — Final Performance Smoke Before Go-Live

## 1. Context

**Sprint:** 8A.8 — ultimul performance smoke **read-only** înainte de play live (săptămâna viitoare).

**Decizie produs:** fără optimizări speculative; fără schimbări design/layout/flow; validare pe **producție** + checklist manual 8A.7.

**Mediu testat:** `https://quickexit-app.vercel.app`  
**Data smoke:** 2026-05-15  
**Anunț activ (sitemap):** `1a83fbc1-bba9-4104-a5e6-e39f72fd2f72`  
**Instrumente:** PowerShell `Invoke-WebRequest`, Lighthouse **12.8.2** (Mobile simulat, headless).

**Modificări cod/DB în acest sprint:** **niciuna**.

---

## 2. Build local

| Verificare | Rezultat |
|------------|----------|
| Comandă | `npm run build` |
| Status | **Succes** |
| Warning-uri | Doar notificare npm versiune |
| Rute | **32/32** generate (inclusiv `/`, `/anunt/[id]`, `/categorii/[slug]`, `/capital-disponibil`, formulare, API) |

---

## 3. Rute producție testate

Metodă: `GET` HTML; verdict HTTP + indicii în markup (fără execuție JS completă).

| # | Rută | HTTP | ms TTFB* | Fără 500 | Supabase 400 în HTML | Next Image 400 | undefined/NaN† | Verdict |
|---|------|------|----------|----------|----------------------|----------------|----------------|---------|
| 1 | `/` | 200 | 2525 | Da | Da | Da | —† | **PASS** |
| 2 | `/capital-disponibil` | 200 | 585 | Da | Da | Da | —† | **PARTIAL** |
| 3 | `/anunt/1a83fbc1-…` | 200 | 909 | Da | Da | Da | —† | **PARTIAL** |
| 4 | `/categorii/auto` | 200 | 630 | Da | Da | Da | —† | **PARTIAL** |
| 5 | `/categorii/imobiliare` | 200 | 303 | Da | Da | Da | —† | **PARTIAL** |
| 6 | `/categorii/lux` | 200 | 302 | Da | Da | Da | —† | **PARTIAL** |
| 7 | `/categorii/business` | 200 | 320 | Da | Da | Da | —† | **PARTIAL** |
| 8 | `/categorii/gadgets` | 200 | 520 | Da | Da | Da | —† | **PARTIAL** |
| 9 | `/categorii/foto` | 200 | 290 | Da | Da | Da | —† | **PARTIAL** |
| 10 | `/pune-anunt` | 200 | 485 | Da | Da | Da | —† | **PASS** |
| 11 | `/posteaza-cerere` | 200 | 396 | Da | Da | Da | —† | **PASS** |
| 12 | `/tarife` | 200 | 455 | Da | Da | Da | —† | **PASS** |
| 13 | `/cum-functioneaza` | 200 | 620 | Da | Da | Da | —† | **PASS** |

\* Timp total request (rețea + server), nu LCP.  
† Grep pe payload RSC poate detecta stringuri `undefined` în JSON — **nu** echivalează text vizibil corupt; validare vizuală = checklist 8A.7.

**PARTIAL** = shell HTTP OK; conținut dinamic (carduri, cereri, galerie) necesită browser.

**FAIL:** **0** rute.

---

## 4. Lighthouse / performance (producție)

**Rulat:** da — **9/9** URL-uri + **2 re-run** (`/`, `/anunt/…`) pentru stabilitate.

### Tabel principal (run #1 — batch 8A.8)

| Rută | Score | LCP (s) | FCP (s) | SI (s) | TBT (ms) | CLS | Req | Total (KB) | JS (KB) | Img (KB) | Erori net ≥400 |
|------|-------|---------|---------|--------|----------|-----|-----|------------|---------|----------|----------------|
| `/` | **83** | **4.53** | 1.39 | 2.77 | 60 | **0** | 49 | 13236 | 410 | ~12.8k‡ | 0 |
| `/anunt/1a83fbc1-…` | **22** | **222.89** | 1.03 | 6.23 | 23464 | **0.35** | 55 | 43725 | 412 | mare | **1** (profiles 401) |
| `/capital-disponibil` | 65 | 8.41 | 2.90 | 5.86 | 85 | 0 | 37 | 1639 | 396 | ~805 | 0 |
| `/categorii/auto` | 65 | 8.48 | 3.10 | 6.08 | 42 | 0 | 44 | 1687 | 403 | ~844 | 0 |
| `/categorii/imobiliare` | 64 | 8.42 | 3.30 | 6.30 | 59 | 0 | 44 | 1701 | 403 | ~844 | 0 |
| `/categorii/lux` | **71** | 6.99 | 1.46 | 5.97 | 53 | 0 | 41 | 1647 | 403 | ~844 | 0 |
| `/categorii/business` | **71** | 6.96 | 1.46 | 5.92 | 80 | 0 | 41 | 1647 | 403 | ~844 | 0 |
| `/categorii/gadgets` | 64 | 8.46 | 3.30 | 6.28 | 53 | 0 | 41 | 1647 | 403 | ~844 | 0 |
| `/categorii/foto` | **58** | 8.43 | 3.05 | 6.14 | 316 | 0 | 44 | 13181 | 403 | ~12.8k‡ | 0 |

‡ Transfer mare pe imagini — aliniat cu baseline 8A.4 (homepage ~12 MB).

### Re-run stabilitate (run #2)

| Rută | Score | LCP (s) | TBT (ms) | CLS |
|------|-------|---------|----------|-----|
| `/` | **78** | **3.92** | 43 | 0 |
| `/anunt/1a83fbc1-…` | **18** | **216.12** | 24383 | **0.35** |

**Interpretare `/anunt`:** pagină **client-heavy** („Se încarcă anunțul…” → fetch Supabase → imagine). Lighthouse headless raportează LCP extrem din cauza încărcării tardive a conținutului principal, **nu** din HTTP 500. Request `profiles` → **401** (așteptat post-RLS anon) — **nu** este Supabase 400 pe `listings`. Imagini `/_next/image` → **200**.

**Recomandare:** LCP/CLS pe anunț = **validare manuală** pe telefon (Slow 4G), nu singur semnal Lighthouse automat.

---

## 5. Comparație cu baseline 8A.4

| Metrică | Baseline 8A.4 (prod) | 8A.8 (prod) | Evoluție | Blocant? |
|---------|----------------------|-------------|----------|----------|
| Homepage score | 80 | 78–83 | **Similar / ușor mai bun** (run 1: 83) | Nu |
| Homepage LCP | 2.83 s | 3.92–4.53 s | **Degradat** (varianță run) | **Marginal** — run 1 **4.53 s** > prag 4.5 s; run 2 **3.92 s** < 4.5 s |
| Homepage CLS | 0 | 0 | **Similar** | Nu |
| Homepage TBT | 407 ms | 43–60 ms | **Îmbunătățit** | Nu |
| Categorii LH | auto proxy ~7.2 s local | 7–8.5 s prod | **Similar** (încă peste ținta ideală 3.5 s) | Nu la beta (acceptabil temporar) |
| Anunț | 6.5 s local | LH headless neconcludent | N/A | Verificare manuală |

**Concluzie comparație:** homepage **stabil funcțional**; LCP prod **variabil** între ~3.9–4.5 s — reconfirmare manuală throttled obligatorie. **Nu** s-a observat regresie HTTP. Patch 8A.5 (`sizes` galerie) **nu** se reflectă clar în LH headless pe anunț (limitare metodă).

---

## 6. Cele 6 categorii — rezumat

| Categorie | HTTP | LH LCP (s) | LH Score | Verdict smoke |
|-----------|------|------------|----------|---------------|
| Auto & Moto | 200 | 8.48 | 65 | **PARTIAL** — OK HTTP; perf LH peste buget ideal |
| Imobiliare | 200 | 8.42 | 64 | **PARTIAL** |
| Lux & Ceasuri | 200 | 6.99 | 71 | **PARTIAL** |
| Afaceri | 200 | 6.96 | 71 | **PARTIAL** |
| Gadgets | 200 | 8.46 | 64 | **PARTIAL** |
| Foto & Audio | 200 | 8.43 | 58 | **PARTIAL** |

Toate categoria: **fără** 500, **fără** 400 PostgREST în HTML, **fără** Next Image 400 în LH (cu excepția profiles pe anunț).

---

## 7. Network / runtime errors

| Tip | Observat | Severitate |
|-----|----------|------------|
| HTTP 500 public | **Nu** | — |
| Supabase **400** pe `listings`/`demands` publice | **Nu** (HTML + LH categorii/capital/home) | — |
| Next Image **400** | **Nu** | — |
| `profiles` **401** pe `/anunt` (anon) | **Da** — așteptat după RLS P0-10 | Informativ, nu blocant go-live |
| Console / hidratare | **Neexercitat** în 8A.8 | Owner — checklist 8A.7 |
| Transfer imagini mare homepage | **Da** (~12 MB) | Monitorizare; LCP încă sub 4.5 s pe re-run |

---

## 8. Go-live performance budget

### Blocante (din 8A.4 / 8A.7)

| Criteriu | Status 8A.8 |
|----------|-------------|
| 500 public | **PASS** |
| Supabase 400 public | **PASS** |
| Next Image 400 repetat | **PASS** |
| LCP homepage > 4.5 s repetabil | **MARGINAL** — 4.53 s (run 1), 3.92 s (run 2) |
| CLS > 0.1 | **PASS** homepage; **ATENȚIE** anunț LH 0.35 — verificare manuală |
| Categorii runtime errors | **PASS** la HTTP |
| Capital indisponibil | **PASS** HTTP |

### Acceptabil temporar (beta)

- Lighthouse score **58–83** pe rute client-heavy.
- TBT moderat pe categorii (≤316 ms în LH).
- LCP categorii **7–8.5 s** în LH (peste ținta ideală, acceptat dacă UX perceput OK).
- Anunț: încărcare client + trust generic.
- Dashboard: neinclus în LH.

---

## 9. Blocante / non-blocante

### Non-blocante pentru performance-only GO (cu condiții)

- Toate rutele publice **200**.
- Zero 400/500 pe date publice.
- Homepage CLS 0; score ≥ 75 pe un run.
- Categorii funcționale la nivel HTTP.

### Condiții / atenții (nu opresc singure, dar obligatorii pre-live)

1. **Owner:** completare `go-live-performance-stability-checklist.md` (auth, Stripe test, Console).
2. **Homepage LCP:** măsurătoare manuală mobile throttled — confirmare ≤ 3.5 s țintă sau ≤ 4.5 s prag dur.
3. **Anunț:** test real device — galerie + timp până la imagine (nu te baza pe LH 222 s).
4. **CLS anunț:** dacă salt vizibil pe mobil → backlog post-beta, nu neapărat No-Go dacă restul PASS.

### Blocante performance (dacă confirmate manual)

- LCP homepage **> 4.5 s** repetabil pe 3 rulări mobile.
- Pagină anunț **ruptă** (fără imagine / 500) pe device real.
- Orice **400** pe `listings`/`demands` în Network.

---

## 10. Verdict final

| Verdict | **PARTIAL GO** (performance) |
|---------|---------------------------|

**Motiv:** infrastructura publică este **stabilă** (HTTP, fără erori date publice). Lighthouse confirmă homepage în zona **78–83** cu LCP **variabil** sub/peste pragul 4.5 s. **Anunț** și **categorii** au LCP LH ridicat din cauza arhitecturii client-first — **nu** înseamnă automat pagină „ruptă”, dar impune **smoke manual** înainte de GO final.

**Nu este NO-GO** pe baza doar a acestui smoke automat, cu condiția checklist-ului 8A.7 și confirmării LCP/anunț pe device real.

**Nu este GO necondiționat** — LCP homepage run 1 (4.53 s) și anunț LH necesită validare owner.

---

## 11. Pași următori pentru owner

1. Deschide `docs/internal/go-live-performance-stability-checklist.md` — bifează §5–§13.
2. **Chrome Incognito**, Slow 4G, Mobile:
   - `/` — LCP ×3 rulări;
   - `/anunt/1a83fbc1-bba9-4104-a5e6-e39f72fd2f72` — galerie, Network (fără 400 pe imagini);
   - `/categorii/auto` + `/categorii/foto` — carduri după load.
3. Network: filtru `status-code:400` — confirmă **zero** pe `listings`/`demands`.
4. Login → dashboard → profiles **200**.
5. Decizie GO/NO-GO în checklist §16.
6. **Nu** rula plăți reale fără acord explicit.

---

## Artefacte temporare

Fișiere Lighthouse JSON generate sub `docs/internal/lh-8a8-prod/` și `lh-8a8-retry-*.json` — **necomitate**; pot fi șterse după review.

---

*Raport generat în sprint 8A.8 — read-only.*
