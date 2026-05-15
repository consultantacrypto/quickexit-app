# Quick Exit — Public Query Limits Audit

## 1. Context

**Sprint:** 8A.6 — audit read-only al query-urilor publice **fără** `.limit()`, cu decizie explicită ce este safe de limitat fără schimbare UX.

**Pregătire:**

- 8A.4 — Performance Baseline + Go-Live Budget (risc viitor: categorii/capital fără limit)
- 8A.5 — Conservative Image / LCP Patch (`sizes` pe galeria anunț)

**Cele 6 categorii publice** (același client `CategorieClient.tsx`, slug diferit):

| Slug | URL | Nume UI |
|------|-----|---------|
| `auto` | `/categorii/auto` | Auto & Moto |
| `imobiliare` | `/categorii/imobiliare` | Imobiliare |
| `lux` | `/categorii/lux` | Lux & Ceasuri |
| `business` | `/categorii/business` | Afaceri de vânzare |
| `gadgets` | `/categorii/gadgets` | Gadgets |
| `foto` | `/categorii/foto` | Foto & Audio |

**Reguli sprint:** fără patch dacă există risc UX; fără trunchiere fără paginare / „Încarcă mai mult”; fără design, DB, RLS, Auth, Stripe, SEO, API.

**Data audit:** 2026-05-15

---

## 2. Build baseline

| Verificare | Rezultat |
|------------|----------|
| Comandă | `npm run build` |
| Status | **Succes** (Next.js 16.2.4) |
| Warning-uri relevante | **Niciunul** |
| Rute publice relevante | `/` (ƒ), `/categorii/[slug]` (ƒ), `/capital-disponibil` (○ shell + client) |

---

## 3. Query-uri publice — inventar complet

| Fișier | Rută | Tabel | Filtre | Order | Limit actual | Câte elemente afișează UI | Safe să limităm? | Motiv |
|--------|------|-------|--------|-------|--------------|----------------------------|------------------|-------|
| `app/page.tsx` | `/` | `listings` | `status=active`, `is_seed=false` | `created_at` desc | **48** | Max **9** standard + max **4** licitații (din pool 48) | **Nu reduce acum** | UI face `filter` + `slice`; limit sub 48 poate ascunde licitații vechi din top 48 |
| `app/page.tsx` | `/` | `demands` | `status=active` | `created_at` desc | **9** | **9** (`slice(0, 9)`) | **Deja aliniat** | Limit = UI |
| `app/categorii/[slug]/CategorieClient.tsx` | `/categorii/*` (×6) | `listings` | `category`, `status=active`, `is_seed=false` | `created_at` desc | **Niciunul** | **Toate** rândurile filtrate client | **Nu** | Fără paginare; filtru `?sub=` pe set complet |
| `app/categorii/[slug]/CategorieClient.tsx` | `/categorii/*` (×6) | `demands` | `category`, `status=active` | `created_at` desc | **Niciunul** | **Toate** cererile filtrate client | **Nu** | Idem |
| `app/capital-disponibil/CapitalDisponibilClient.tsx` | `/capital-disponibil` | `demands` | `status=active` | `created_at` desc | **Niciunul** | **Toate** după search/categorie client | **Nu** | Căutare + dropdown pe set complet |
| `app/components/GlobalStats.tsx` | `/` (secțiune) | `listings` | `status=active`, `is_seed=false` | — | **Niciunul** | Agregat: count + sumă `exit_price` | **Nu** | Sumă necesită toate rândurile sau RPC |
| `app/components/GlobalStats.tsx` | `/` (secțiune) | `demands` | `status=active` | — | **Niciunul** | Agregat: count + sumă `budget` | **Nu** | Idem |
| `app/components/GlobalStats.tsx` | `/` (secțiune) | `listings` | `status=sold` | — | **count head** | Număr vânzări finalizate | **Deja optim** | `{ count: 'exact', head: true }` |

**`.range(`:** nu este folosit în scope-ul auditat.

---

## 4. Categorii — toate cele 6 rute

**Implementare:** un singur `CategorieClient.tsx`; comportament identic pentru toate slug-urile din `categoryDataMap`.

### UX actual

| Aspect | Comportament |
|--------|--------------|
| Listă anunțuri | Afișează **integral** `filteredListings` (grid licitații + grid standard) |
| Cereri investitori | Afișează **integral** `filteredDemands` |
| Paginare | **Nu** |
| „Încarcă mai mult” | **Nu** |
| Infinite scroll | **Nu** |
| Empty state | Da (mesaj + reset filtru + CTA publicare) |
| Filtre | **Client-side** `filterBySubcategory` pe `?sub=` (titlu, `details`, `target_asset`) |
| Contor | Badge „X rezultate” pe setul **filtrat** |

### Risc la limit fără UI

| # | Întrebare | Răspuns |
|---|-----------|---------|
| 1 | Limit ar putea ascunde rezultate? | **Da** — anunțe/cereri din afara primelor N rânduri DB |
| 2 | Userul ar ști că există mai multe? | **Nu** — nu există copy „X din Y” sau CTA încărcare |
| 3 | Paginare înainte de limit? | **Da, obligatoriu** (sau load more + mesaj) |
| 4 | Filtru `?sub=` | Depinde de **tot** setul încărcat; limit DB = rezultate subcategorie incomplete |

### Verdict per categorie (toate cele 6)

| Categorie | URL | Limit acum? | Verdict |
|-----------|-----|-------------|---------|
| Auto & Moto | `/categorii/auto` | Nu | **NOT SAFE** |
| Imobiliare | `/categorii/imobiliare` | Nu | **NOT SAFE** |
| Lux & Ceasuri | `/categorii/lux` | Nu | **NOT SAFE** |
| Afaceri de vânzare | `/categorii/business` | Nu | **NOT SAFE** |
| Gadgets | `/categorii/gadgets` | Nu | **NOT SAFE** |
| Foto & Audio | `/categorii/foto` | Nu | **NOT SAFE** |

**Notă volum beta:** la catalog mic, costul query complet este acceptabil; riscul apare la creștere (payload + TTFB client).

---

## 5. Capital disponibil

### UX actual (`CapitalDisponibilClient.tsx`)

| Aspect | Comportament |
|--------|--------------|
| Cereri active | **Toate** rândurile `active`, apoi `filteredBuyers` |
| Căutare | Client: `target_asset` + `description` |
| Categorie | Client: dropdown (7 opțiuni incl. „Toate”) |
| Paginare / load more | **Nu** |
| Contor | „{filteredBuyers.length} Cereri” |
| Empty state | Da (fără rezultate / fără cereri în DB) |

### Verdict capital

| Criteriu | Evaluare |
|----------|----------|
| Limit ar ascunde cereri relevante? | **Da** — căutarea nu poate găsi cereri din afara limitului DB |
| User informat despre trunchiere? | **Nu** |
| Verdict | **NOT SAFE** fără paginare server-side sau load more |

**Safe doar cu UI suplimentar:** paginare, infinite scroll, sau „Încarcă mai mult” + filtre mutate pe server (`.ilike` / `.eq` în query).

---

## 6. Homepage

### Query-uri

```text
listings: limit(48)  →  filter auction/standard  →  slice(4) + slice(9) în UI
demands:  limit(9)   →  slice(0, 9) în UI
```

### Aliniere UI ↔ limit

| Secțiune | Limit DB | Afișat UI | Aliniat? |
|----------|----------|-----------|----------|
| Anunțuri standard | 48 (pool) | 9 max | Parțial — pool 48 pentru a prinde licitații în același fetch |
| Licitații home | din pool 48 | 4 max | Parțial |
| Cereri capital home | 9 | 9 | **Da** |
| JSON-LD ItemList | din standardListings | 20 max | Sub setul de 9 afișat vizual |

### Verdict homepage

| Acțiune | Verdict |
|---------|---------|
| Reduce `limit(48)` | **NOT SAFE** — poate elimina licitații din secțiunea dedicată dacă sunt poziționate după multe standard în sortare |
| Reduce `limit(9)` demands | **NOT SAFE** — deja egal cu UI |
| Mărește limit | **Inutil** acum |
| **Ajustare acum** | **Nu** — păstrăm; la volum mic beneficiul e marginal |

---

## 7. GlobalStats

### Ce face acum

| Query | Coloane | Limit | Procesare |
|-------|---------|-------|-----------|
| `listings` active | `exit_price` | **Niciunul** | `length` + `reduce` sumă |
| `demands` active | `budget` | **Niciunul** | `length` + `reduce` sumă |
| `listings` sold | `id` | **count head** | Doar număr |

### Risc la volum

| # | Observație |
|---|------------|
| 1 | La sute/mii de rânduri: **2 scan-uri complete** + transfer JSON + CPU client |
| 2 | **Nu** e blocant la beta cu catalog mic |
| 3 | Optimizare fără schimbare UX vizibilă: **RPC/view** `sum(exit_price)`, `sum(budget)`, `count(*)` — necesită DB (post-beta) |
| 4 | `count` head pentru sold — **deja corect** |

### Verdict GlobalStats

| Acțiune | Verdict |
|---------|---------|
| `.limit()` pe rânduri | **NOT SAFE** — distorsionează „Valoare declarată” și numerele afișate |
| Slimming coloane | **Deja făcut** (`exit_price`, `budget` only) |
| Patch acum | **Nu** |

---

## 8. Riscuri dacă limităm fără paginare

1. **Categorii + `?sub=`:** utilizatorul crede că nu există anunțuri în subcategorie, deși există în DB dincolo de limit.
2. **Capital + search:** căutarea „ROLEX” nu găsește cereri aflate la poziția 51+ în sortare `created_at`.
3. **Badge „X rezultate”:** devine incorect față de totalul real din platformă.
4. **GlobalStats:** sume și numere sub raportate — încredere produs afectată.
5. **Homepage licitații:** reducerea pool-ului 48 fără query separat pentru `sale_strategy=auction` poate goli secțiunea licitații.

---

## 9. Recomandare produs

| Zonă | Recomandare acum | De ce | Risc dacă limităm acum | Sprint potrivit |
|------|------------------|-------|------------------------|-----------------|
| **Cele 6 categorii** | **Nu punem limit** | UI = listă completă + filtre client | Rezultate ascunse, filtre incomplete | **8B.x** — paginare sau load more + limit server |
| **Capital disponibil** | **Nu punem limit** | Search/filter pe tot setul | Cereri invizibile la căutare | **8B.x** — query server pentru search + paginare |
| **Homepage listings** | **Păstrăm limit 48** | Buffer licitații + standard | Licitații lipsă din home | Opțional: query separat licitații (4) + standard (9) |
| **Homepage demands** | **Păstrăm limit 9** | Aliniat UI | N/A | — |
| **GlobalStats** | **Păstrăm; monitorizăm** | Beta OK | Statistici greșite | **Post-beta** — RPC agregat |
| **Volum general** | **Lăsăm așa până crește catalogul** | UX corect > micro-optimizare | — | Reevaluare la ~100+ listări/categorie |

---

## 10. Ce patch este safe acum

**Niciun patch aplicat în 8A.6** — **audit only**.

| Candidat | Motiv respingere |
|----------|------------------|
| `.limit(50)` pe categorii | Schimbă output vizual fără paginare |
| `.limit(N)` pe capital | Strică căutarea globală |
| Reduce homepage `48` → `13` | Poate ascunde licitații |
| GlobalStats limit | Distorsionează agregatele |

Singurele limite **deja safe** (implementate anterior): homepage `listings` 48, `demands` 9.

---

## 11. Ce rămâne pentru post-beta

1. **Categorii (×6):** `.limit()` + paginare sau „Încarcă mai mult” + mutare filtru `?sub=` pe server unde e posibil.
2. **Capital:** același pattern; eventual `.or()` / `ilike` în Supabase pentru search.
3. **Homepage:** fetch dedicat licitații (`limit 4`) + standard (`limit 9`) — fără pool 48.
4. **GlobalStats:** funcție SQL / RPC `get_public_stats()` cu `sum`, `count` — fără transfer masiv client.
5. **Monitor:** alertă când răspunsul `listings` pe categorie depășește prag (ex. 100 rânduri sau >500 KB).

---

## 12. Verdict

| Întrebare | Răspuns |
|-----------|---------|
| Putem limita categorii acum? | **Nu** — NOT SAFE (toate 6 rutele) |
| Putem limita capital acum? | **Nu** — NOT SAFE |
| Putem ajusta homepage? | **Nu** — deja limitat; fără câștig clar fără risc licitații |
| Putem optimiza GlobalStats acum? | **Nu** cu `.limit()` — doar RPC post-beta |
| Patch 8A.6 | **Audit only** — zero fișiere cod modificate |
| Go-live beta | **Acceptabil** — volum actual mic; plan clar pentru 8B.x |

---

*Document generat în sprint 8A.6 — read-only.*
