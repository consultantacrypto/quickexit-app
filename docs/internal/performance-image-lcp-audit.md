# Quick Exit — Image / LCP Optimization Audit

## 1. Context

**Sprint:** 8A.3 — audit **read-only** pentru imagini și LCP (Largest Contentful Paint), fără modificări de cod, design, layout, copy, business logic, DB, RLS, Stripe, webhook, checkout, Auth/KYC sau SEO/metadata.

**Pregătire:** după 8A.1 (audit performanță), 8A.2 (slimming query-uri publice), 8A.2b (smoke runtime), 8A.2c (hotfix `demands` / fallback imagine).

**Status la momentul auditului:** build local reușit; deploy raportat verde; runtime considerat curat.

**Data document:** 2026-05-12

---

## 2. Build baseline

| Verificare | Rezultat |
|------------|----------|
| Comandă | `npm run build` |
| Status | **Succes** (Next.js 16.2.4, Turbopack) |
| Warning-uri relevante imagini/LCP | **Niciunul** în output-ul build-ului |
| Rute afectate explicit de audit | `/` (dinamic), `/anunt/[id]` (dinamic), `/categorii/[slug]` (client + date), `/capital-disponibil` (static shell + client) |

---

## 3. Inventar imagini (cod)

| Zonă | Fișier | Tehnologie | `priority` | `sizes` | `fill` | `unoptimized` | Fallback / remote |
|------|--------|------------|------------|---------|--------|---------------|-------------------|
| Header / logo | `app/components/Header.tsx` | `next/image` | Da | Nu (container relativ) | Da | **Da** | `/logo.png?v=2` (local `public/logo.png`) |
| Card anunț | `app/components/AdCard.tsx` | `next/image` | Opțional prop `priority` (default false) | Da: `(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw` | Da | Nu | URL din props (Supabase storage sau Unsplash) |
| Homepage listări | `app/page.tsx` | prin `AdCard` | **Nu** transmis | prin `AdCard` | prin `AdCard` | — | `item.images?.[0]` sau URL Unsplash fix (aceeași fotografie ca fallback) |
| Homepage licitații | `app/page.tsx` | prin `AdCard` | **Nu** transmis | prin `AdCard` | prin `AdCard` | — | idem |
| Cereri capital (card) | `app/components/DemandCard.tsx` | **Fără** `<Image>` | — | — | — | — | Doar emoji text; fără imagini produs |
| Categorii | `app/categorii/[slug]/CategorieClient.tsx` | prin `AdCard` | **Nu** transmis | prin `AdCard` | prin `AdCard` | — | `images[0]` sau același URL Unsplash ca pe homepage (post 8A.2c) |
| Anunț — imagine principală | `app/anunt/[id]/AnuntClient.tsx` | `next/image` | **Da** | **Lipsește** pe imaginea principală din galerie | Da | Nu | `displayImages[]` (în practică URL-uri Supabase) |
| Anunț — miniaturi | `AnuntClient.tsx` | `next/image` | Nu (implicit lazy) | **Lipsește** | Da | Nu | Aceleași surse |
| Anunț — lightbox | `AnuntClient.tsx` | `next/image` | **Da** | `100vw` | Da | Nu | Aceeași sursă ca indexul curent |
| Dashboard (referință) | `app/dashboard/page.tsx` | `<img>` nativ (nu `next/image`) în zona notată în cerință | — | — | — | — | Fallback listare (nu face obiectul optimizării în acest sprint) |
| Config imagini remote | `next.config.ts` | `images.remotePatterns` | — | — | — | — | `images.unsplash.com`, `geywuzwbzecknokvnins.supabase.co` |

**Observații tehnice:**

1. **Above-the-fold:** logo-ul din header (fix, pe toate paginile cu `Header`) este candidat puternic la LCP; are `priority` dar și **`unoptimized`** — imaginea nu trece prin optimizatorul `/_next/image` (comportament intenționat probabil pentru PNG/logo).
2. **Homepage hero:** fără imagine mare — tipografie, gradient CSS, carduri text „pachete”; **nu** există `<Image>` în prima secțiune a `page.tsx`.
3. **`priority` pe homepage la `AdCard`:** **nu** este setat (`priority` lipsește la toate instanțele din `app/page.tsx`); primele carduri din secțiunea „Anunțuri” pot intra parțial în viewport pe ecrane înalte — fără `fetchPriority` ridicat explicit.
4. **`sizes` pe `AdCard`:** prezent și rezonabil pentru grid 1/2/3 coloane.
5. **`fill`:** folosit consecvent în `AdCard`, header logo, galerie anunț.
6. **`blurDataURL`:** **nu** apare în fișierele inspectate.
7. **Fallback extern:** URL Unsplash cu `w=800&q=80` în query (permis în `next.config.ts`).
8. **Imagini mari neoptimizate:** URL-urile Supabase din storage sunt folosite ca atare în `src` — dimensiunea efectivă depinde de fișierele încărcate de utilizatori (risc pentru LCP pe anunțuri cu fotografii foarte mari).
9. **Lightbox:** când este deschis, `<Image>` are `priority` — util pentru overlay; risc minor dacă DOM-ul lightbox este montat chiar dacă închis (în cod: render condiționat `isImageLightboxOpen` — în general OK).

---

## 4. Homepage — audit image / LCP

| # | Verificare | Rezultat |
|---|------------|----------|
| 1 | Logo header | `next/image`, `priority`, `unoptimized`, `fill` — încărcare timpurie, fără pipeline optimizare Next |
| 2 | Hero imagine mare | **Nu există** — doar text și CSS |
| 3 | Primele carduri anunțuri | `AdCard` fără `priority` — imagini din listări sau Unsplash fallback |
| 4 | Carduri licitații | Același pattern `AdCard`, fără `priority` |
| 5 | Supabase / Unsplash | Ambele tipuri posibile pe carduri |
| 6 | `priority` prime imagini card | **Nu** pe homepage |
| 7 | `sizes` carduri | Prezent în `AdCard` |
| 8 | Fallback | Unsplash valid și permis în config |
| 9 | Layout shift (CLS) | Container imagine cu `h-64` fix — risc CLS relativ controlat pentru zona imagine |

**Verdict homepage image/LCP:** **PARTIAL** — structură sănătoasă (fără hero image grea), dar LCP poate fi dominat de **logo** (unoptimized) sau de **primul card** fără `priority`; lipsă tuning explicit pentru primul `AdCard` din viewport.

---

## 5. Anunț public — audit image / LCP

| # | Verificare | Rezultat |
|---|------------|----------|
| 1 | Imagine principală | `Image` `fill` + **`priority`** — accent pe LCP pentru fotografia principală |
| 2 | Miniaturi | Grid până la 4 coloane, `fill`, fără `sizes` explicit |
| 3 | Lightbox | `Image` cu `sizes="100vw"`, `priority` când overlay deschis |
| 4 | `sizes` / `priority` | Principală: `priority` fără `sizes`; lightbox: ambele |
| 5 | Prima imagine merită `priority` | **Deja** pe hero galerie — corect pentru intent |
| 6 | Toate imaginile prea devreme | Miniaturile folosesc același `next/image` fără `priority` — comportament lazy implicit favorabil |
| 7 | Fișiere mari Supabase | Posibil — fără transformare în URL în codul auditat |
| 8 | Fallback | Logica `displayImages` în client; depinde de datele listării |

**Verdict anunț image/LCP:** **PARTIAL** — `priority` pe imaginea principală este bine pentru LCP, dar **lipsește `sizes`** pe imaginea principală cu `fill` (recomandare Next: ajută la alegerea lățimii de descărcare); risc de **greutate mare** dacă imaginile originale sunt foarte mari.

---

## 6. Categorii / Capital — audit image

### `/categorii/[slug]`

- Aceleași `AdCard` ca homepage: `sizes` da, `priority` nu.
- Fallback Unsplash (aliniat cu homepage după 8A.2c).
- **Verdict:** **PARTIAL** (aceleași observații ca grid-ul de carduri de pe home).

### `/capital-disponibil`

- **Fără** componente `next/image` pentru conținutul principal al cererilor; UI text + emoji.
- **Risc LCP legat de imagini produs:** **mic**; LCP poate veni din alt element (text, bloc hero).

**Verdict categorii / capital (combinat):** **PARTIAL** (categorii ca mai sus; capital „PASS” pe dimensiunea riscului imagini, dar verdictul combinat rămâne PARTIAL din cauza categorii).

---

## 7. `next.config.ts` — config imagini

| # | Element | Valoare / observație |
|---|---------|----------------------|
| 1 | Domenii remote | `images.unsplash.com`, `geywuzwbzecknokvnins.supabase.co` |
| 2 | Storage Supabase | Acoperit prin hostname-ul proiectului |
| 3 | Unsplash | Acoperit |
| 4 | Fallback folosit în app | URL Unsplash din lista de mai sus — **permis** |
| 5 | `formats` / `deviceSizes` / `imageSizes` custom | **Nu** — default Next |
| 6 | Riscuri `next/image` | Orice hostname nou (CDN alternativ) va necesita extindere `remotePatterns`; fișiere locale fără `public/` nu sunt servite |

---

## 8. Riscuri LCP / CLS (rezumat)

**LCP (prioritate descrescătoare):**

1. Fișiere imagine foarte mari servite direct de **Supabase Storage** pe pagina anunț și pe carduri.
2. **Logo header** cu `unoptimized` — dimensiunea fișierului `logo.png` contează integral (fără resize automat Next).
3. **Lipsă `priority`** pe primul `AdCard` vizibil pe homepage / categorii când imaginea devine candidat LCP.
4. **Lipsă `sizes`** pe imaginea principală `fill` din `AnuntClient` (poate sub-optimiza lățimea cerută de la optimizator).

**CLS:**

1. Zonele cu `h-64` fix pe carduri reduc saltul imaginii; text lung în titluri poate tot provoca micro-shift-uri în layout.
2. Header fix înalt (`h-20` / `md:h-28`) — conținutul paginii are padding; risc CLS moderat la încărcare font dacă nu sunt acoperite de strategia font (în afara scope-ului strict imagini).

---

## 9. Quick wins low-risk (doar recomandări — fără implementare în 8A.3)

1. Setați `priority={true}` doar pentru **primul** `AdCard` vizibil pe homepage și eventual pe categorii (fără schimbare vizuală).
2. Rafinați `sizes` pe `AdCard` dacă măsurătorile Lighthouse arată descărcări prea late (ex. mai strâns pe viewport real al cardului).
3. Adăugați `sizes` pe **imaginea principală** din `AnuntClient` (ex. proporțional cu `lg:col-span-8` și înălțimea containerului).
4. **Lazy** explicit sau `loading` pentru miniaturi dacă în viitor se trece la un pattern care forțează eager load.
5. **Supabase Image Transformation** sau generare thumbnail la upload — sprint separat, atinge storage / pipeline.
6. Evitați încărcarea eager a tuturor pozelor din galerie la același nivel de rezoluție (politică la upload sau transform URL).
7. Audit dimensiuni și greutate fișier pentru **`public/logo.png`** (și variantă `?v=2`).

---

## 10. Ce NU optimizăm încă (în acest sprint)

- Schimbarea designului cardurilor sau a raportului imagine.
- Modificarea `remotePatterns` fără nevoie de domeniu nou verificat.
- Înlocuirea `unoptimized` pe logo fără test vizual și export asset dedicat.
- Migrarea `<img>` din dashboard către `next/image` (în afara scope-ului „doar referință fallback”).
- Orice modificare SEO/metadata sau structură JSON-LD pentru imagini.

---

## 11. Plan Lighthouse manual

**Lighthouse nu a fost rulat** din mediul de audit (fără Chrome headless configurat în pipeline-ul acestui pas).

**Plan recomandat (Chrome, profil Mobile sau „Slow 4G” în Throttling):**

1. Deschideți **Incognito** cu extensii dezactivate (evită zgomotul tip lockdown/SES).
2. **Lighthouse** → mod Mobile → categorii Performance + Best practices.
3. URL-uri: `/`, un `/anunt/<id>` cu cel puțin 3 imagini, `/categorii/auto`.
4. În raport, identificați **LCP element** (tree în „Diagnostics” / „Largest Contentful Paint”).
5. În tab-ul **Network**, filtrați **Img** și notați greutatea și ordinea pentru prima imagine LCP.
6. În **Performance** recording, verificați **Layout Shift** pe încărcarea logo și pe apariția cardurilor.
7. Repetați cu **viewport** mic (iPhone SE) și mediu (iPad) pentru a vedea dacă primul `AdCard` intră în ecran.

---

## 12. Sprinturi recomandate (următorii pași)

1. **8A.4 sau similar:** implementare conservatoare — `priority` pe primul card + `sizes` pe galeria principală anunț + măsurare Lighthouse înainte/după.
2. **Backlog tehnnic:** politică imagini la upload (dimensiune maximă, thumbnail); eventual integrare Supabase transform sau CDN cu resize.
3. **Continuare** din `docs/internal/performance-deep-dive-audit.md` pentru alte zone (non-imagine) după ce LCP imagini este stabilizat.

---

## Fișier sursă audit

Fișiere citite pentru acest document (read-only):  
`app/components/Header.tsx`, `app/page.tsx`, `app/components/AdCard.tsx`, `app/components/DemandCard.tsx`, `app/anunt/[id]/AnuntClient.tsx`, `app/categorii/[slug]/CategorieClient.tsx`, `app/capital-disponibil/page.tsx`, `app/capital-disponibil/CapitalDisponibilClient.tsx`, `app/dashboard/page.tsx` (referință `<img>`), `next.config.ts`, `app/layout.tsx`.
