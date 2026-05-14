# Quick Exit — Runtime Smoke after Public Query Slimming

## 1. Context

- **Sprint anterior:** 8A.2 — Public Pages Query Slimming (`select('*')` → coloane explicite pe `app/page.tsx`, `app/categorii/[slug]/CategorieClient.tsx`, `app/capital-disponibil/CapitalDisponibilClient.tsx`, `app/components/GlobalStats.tsx`).
- **Build local:** reușit în cadrul acestui audit (FAZA 9).
- **Deploy:** Vercel raportat verde de echipă; auditul folosește URL-ul implicit din cod: `https://quickexit-app.vercel.app` (`lib/siteUrl.ts`).
- **Acest sprint (8A.2b):** audit **read-only** post-deploy — fără modificări de cod, DB, RLS, Stripe, webhook, checkout, Auth/KYC sau SEO.

**Data raport (automat):** 2026-05-12

## 2. Metodă

| Tehnică | Folosit |
|--------|---------|
| `git branch`, `git status`, `git log -1` | Da |
| HTTP `HEAD`/`GET` (PowerShell `Invoke-WebRequest`) pe rute publice | Da |
| Fetch HTML fără execuție JavaScript (client MCP / markdown) | Da, limitat |
| DevTools Console / Network în browser real | **Nu** — marcat **BLOCKED** |
| Audit static al query-urilor modificate (FAZA 7) | Da |
| `npm run build` | Da |

## 3. Rute testate

| Rută | HTTP | Vizual (fără JS / parțial) | Erori evidente | Verdict | Note |
|------|------|----------------------------|----------------|---------|------|
| `/` | 200 | Hero, pachete, categorii, carduri anunțuri, cereri capital, secțiune licitații, bloc GlobalStats (valori inițiale 0 înainte de hidratare client) | Nu 500 | **PASS** | Conținut SSR listări/cereri/licitații prezent; prețuri/titluri vizibile în snapshot |
| `/categorii/auto` | 200 | Shell + „Sincronizare terminal…” (client fetch) | Nu 500 | **PARTIAL** | Pagină client-heavy; necesită browser pentru carduri după fetch |
| `/categorii/imobiliare` | 200 | Idem | Nu 500 | **PARTIAL** | Idem |
| `/categorii/auto?sub=SUV` | 200 | Idem + butoane subcategorie în HTML | Nu 500 | **PARTIAL** | URL subcategorie din cod (`categoryDataMap`) |
| `/capital-disponibil` | 200 | UI filtre + „Scuturăm baza de date…” (loading client) | Nu 500 | **PARTIAL** | Datele cererilor vin în `useEffect`; snapshot fără JS nu validează rândurile |
| `/anunt/0acbccd5-f871-4cbc-baa7-fd4b0d544125` | 200 | Titlu în `<title>`; conținut principal „Se încarcă anunțul…” în snapshot fără JS | Nu 500 | **PARTIAL** | Pagina `/anunt/[id]` nu face parte din patch 8A.2; verificare regresie „nu s-a atins” |
| `/robots.txt` | 200 | — | — | **PASS** | |
| `/sitemap.xml` | 200 (GET local audit) | — | Unele unelte externe au raportat 500 la un fetch izolat; GET repetat = 200 | **PASS** | Dacă reapare 500, investigat separat (nu legat de slimming 8A.2) |

## 4. Homepage

| # | Checklist | Rezultat |
|---|-----------|----------|
| 1 | Hero vizibil | Da (snapshot HTML) |
| 2 | CTA principal vizibil | Da (`evaluare`, `capital-disponibil`) |
| 3 | Pachete vizibile | Da (Licitație / Expunere / Vânzare rapidă / Urgentă) |
| 4 | Categorii vizibile | Da |
| 5 | Anunțuri active apar | Da (ex. BMW X5, boxe Linn) |
| 6 | Licitații apar dacă există | Da (ex. Peninsula Resort — card licitație) |
| 7 | Capital / cereri sau empty | Da — carduri cereri cu buget și categorie |
| 8 | GlobalStats fără crash evident | Secțiunea afișată; numere 0 / „—” în snapshot (stare inițială + client fetch) |
| 9 | Imagini carduri | Linkuri către `/anunt/...` prezente; imagini dependente de runtime browser |
| 10 | Fără `undefined` / `NaN` / `null` vizibile în text | Nu observat în snapshot |

**Verdict Homepage:** **PASS** (cu rezervă: GlobalStats complet doar după hidratare în browser real).

## 5. Categorii

| # | Checklist | Rezultat |
|---|-----------|----------|
| 1 | Pagina se încarcă | HTTP 200 |
| 2 | Carduri listări | Necesită JS — nu confirmat în snapshot automat |
| 3 | Cereri pe categorie | Idem |
| 4 | Filtre / subcategorie | Butoane prezente în HTML; fără crash la nivel HTTP |
| 5 | Query `eq('category', categoryName)` | Neschimbat în cod față de patch |
| 6 | Imagini / prețuri / titluri | Necesită browser |
| 7 | Fără undefined/NaN în text | Nu observat în HTML static |
| 8 | `?sub=` | `/categorii/auto?sub=SUV` → 200 |

**Verdict Categorii:** **PARTIAL** (HTTP + structură pagină OK; conținut dinamic neconfirmat fără browser).

## 6. Capital disponibil

| # | Checklist | Rezultat |
|---|-----------|----------|
| 1 | Pagina se încarcă | HTTP 200 |
| 2 | Cereri active sau empty | Snapshot arată loading; validare completă în browser |
| 3 | Search / filter | Controale prezente în HTML |
| 4 | Buget / categorie / descriere | Necesită date post-fetch |
| 5 | CTA publicare cerere | Da |
| 6 | Date lipsă / undefined | Nu observat în shell |
| 7 | Erori Supabase vizibile | Nu detectabile fără Console |

**Verdict Capital:** **PARTIAL**

## 7. Anunț public

| # | Checklist | Rezultat |
|---|-----------|----------|
| 1 | HTTP 200 | Da |
| 2 | Titlu, conținut | Titlu în metadata; body client „Se încarcă…” în snapshot fără JS |
| 3 | Neafectat de 8A.2 | Confirmat static — `anunt/[id]` nu e în scope patch |
| 4 | Robots anunț activ | Cod: `robots: { index: true, follow: true }` când există listing (`app/anunt/[id]/page.tsx`) |
| 5 | Erori profil/Supabase evidente | Nu din HTTP |

**Verdict Anunț public:** **PARTIAL** (routing + metadata OK; UI complet = browser).

## 8. Console / Network

**Status:** **BLOCKED** — mediu de audit fără Chrome DevTools; nu s-au putut căuta mesaje de tip `column does not exist`, `Could not find column`, `PostgREST`, `failed to fetch`, erori de hidratare.

**Recomandare:** smoke manual 5 minute în producție cu DevTools deschis pe `/`, `/categorii/auto`, `/capital-disponibil`.

## 9. Query sanity (audit static)

| Fișier | Query (rezumat) | Status | Observații |
|---------|-----------------|--------|------------|
| `app/page.tsx` | `listings`: coloane pentru `AdCard`, licitație, JSON-LD, filtre | **OK** | `category` / `details` nu sunt necesare pe home pentru UI curent; `status`, `is_seed` păstrate |
| `app/page.tsx` | `demands`: câmpuri pentru `DemandCard` | **OK** | Aliniat la props `DemandCard` |
| `CategorieClient.tsx` | `listings` + `details`, `category` | **OK** | Filtru subcategorie folosește `details` / `title` |
| `CategorieClient.tsx` | `demands` fără `details` (în DB cererile folosesc `requirements`) | **OK** | Filtrul folosește `target_asset` / `title` pentru cereri |
| `CapitalDisponibilClient.tsx` | `demands` coloane card + filtre + tracking | **OK** | `.eq('status','active')`, `order` neschimbate |
| `GlobalStats.tsx` | `listings` count sold: `select('id', { count, head })` | **OK** | Echivalent funcțional cu `*` pentru count |

Confirmări:

1. Coloanele selectate sunt folosite în cod/UI sau în filtre/sort.
2. `.eq`, `.order`, `.limit` pe `page.tsx` neschimbate semantic față de intent patch.
3. Filtre status (`active`, `sold`, `is_seed`) neschimbate.

## 10. Verdict general

**PARTIAL**

- **Motiv:** Console/Network **BLOCKED**; paginile **client-only** nu expun datele în snapshot fără JavaScript.
- **Semnale pozitive (8A.2):** homepage livrează prin SSR listări, cereri și licitații cu prețuri și titluri — consistent cu query-ul explicit pe `listings`/`demands`; **fără HTTP 5xx** pe rutele țintă.
- **Nu s-a identificat** necesitate de revert pe baza acestui audit.

## 11. Ce facem dacă apare problemă

1. **Coloană lipsă în PostgREST:** reintroducem coloana în `select(...)`.
2. **UI `undefined` / NaN:** reintroducem câmpul sau adăugăm fallback (doar în sprint de remediere, nu în acest audit).
3. **Eroare majoră:** revert commit 8A.2 + redeploy.

---

## Închidere sprint 8A.2b (rezumat operațional)

| Item | Valoare |
|------|---------|
| Fișier creat | `docs/internal/performance-public-query-slimming-runtime-smoke.md` |
| Build local (`npm run build`) | **Succes** |
| Modificări cod în acest sprint | **Niciuna** |
| DB / RLS / Stripe / webhook / checkout / Auth / KYC | **Neatinse** |

**Mesaj commit recomandat (doar pentru acest raport):**  
`docs: add runtime smoke report after public query slimming (8A.2b)`

**Următor sprint recomandat:** smoke manual DevTools în producție + (opțional) tipuri generate Supabase pentru validare coloane la compile-time; apoi 8A.3 sau backlog din `performance-deep-dive-audit.md`.
