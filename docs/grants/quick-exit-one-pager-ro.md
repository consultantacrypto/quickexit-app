# Quick Exit — One-Pager (Română)

**Infrastructură digitală de lichiditate asistată de AI pentru active distressed și sub-utilizate**

---

## Companie — date esențiale

| Câmp | Detaliu |
|------|---------|
| **Entitate legală** | QuickExit, LLC |
| **Formă juridică** | Delaware Limited Liability Company (SUA) |
| **EIN** | 61-2350228 |
| **Sediu înregistrat** | 131 Continental Dr, Suite 305, Newark, DE 19713, New Castle County, SUA |
| **Agent înregistrat** | Legalinc Corporate Services Inc. |
| **Constituire** | Certificate of Formation Delaware — depus 27 aprilie 2026 (File No. 10599896) |
| **Manager autorizat** | Mihai Daniel |
| **Brand** | Quick Exit |
| **Produs live** | [www.quickexit.ro](https://www.quickexit.ro) |
| **Contact** | vip@quickexit.ro |

---

## Problema

Proprietarii de active reale — autovehicule, afaceri, imobiliare, bunuri de lux, echipamente — au adesea nevoie de **viteză, nu de preț maxim**. Piețele tradiționale optimizează pentru descoperire și cicluri lungi de negociere. Vânzătorii sub presiune (relocare, succesiuni, lichidări, stocuri neutilizate) nu dispun de un **strat de lichiditate dedicat** care să combine:

- listare rapidă pe piață
- verificare identitate pentru încredere între părți
- evaluare și ghidare de preț asistată de AI
- fluxuri structurate de ofertare (preț exit fix, oferte custom, licitații deschise)
- inteligență operațională pentru operatorii platformei

În paralel, cumpărătorii cu capital disponibil — investitori, flipperi, antreprenori — întâmpină dificultăți în a găsi **oportunități verificate**, cu fricțiune redusă față de piața convențională.

---

## Soluția

**Quick Exit** este o platformă digitală live de marketplace și infrastructură de lichiditate care conectează vânzători care au nevoie de exit rapid cu cumpărători care au capital și apetit pentru oportunități sub prețul pieței sau sensibile la timp.

Platforma este **deployată în producție** la quickexit.ro și include:

- Marketplace activ cu listări în 6+ categorii de active
- Postări **capital disponibil** (marketplace invers — cereri de cumpărare)
- **Licitații deschise** și strategii de vânzare cu **preț exit** fix
- Monetizare **Stripe** (pachete listare, cereri, taxe ofertă)
- Verificare identitate **Didit KYC** (integrare live)
- **HQ Copilot** — inteligență operațională AI pentru admin (analiză snapshot Gemini)
- Funnel **evaluare AI** pentru onboarding vânzători
- **GA4** — analiză produs cu taxonomie de evenimente privacy-first
- **SEO** — structured data, sitemap, pagini de achiziție dedicate

Quick Exit **nu** deține fonduri în custodie și **nu** intermediază plățile între părți — facilitează descoperirea, verificarea, negocierea și fluxurile structurate de ofertare, cu claritate reglementară.

---

## Wedge-ul produsului

> *„Vinde acum. Cumpără sub piață. Mișcă-te rapid."*

| Parte | Propunere de valoare |
|-------|----------------------|
| **Vânzători** | Publicare în minute; evaluare AI; pachete listare (Economy / Standard / Urgent / Licitație); kit distribuție socială; cameră de negociere |
| **Cumpărători / investitori** | Active live și cereri de capital; oferte custom; accept preț exit; postare cereri buy-side |
| **Operatori** | HQ Admin — listări, cereri, oferte, profiluri KYC, riscuri, Copilot AI (daily, risk, priorities, growth) |

**Categorii active (live):** Auto & Moto · Imobiliare · Lux & Ceasuri · Afaceri de vânzare · Gadgets · Foto & Audio

---

## Stack tehnologic

| Strat | Tehnologie | Rol |
|-------|------------|-----|
| Frontend / SSR | Next.js 16 (App Router) | UI marketplace, dashboard-uri, pagini SEO |
| Bază de date & Auth | Supabase (PostgreSQL + RLS) | Profiluri, listări, cereri, oferte, status KYC |
| Plăți | Stripe Checkout + Webhooks | Activare listări, cereri, monetizare pachete |
| Identitate | Didit KYC (verificare hosted + webhooks) | Strat de încredere vânzător/cumpărător |
| AI — Evaluare | API evaluare server-side | Ghidare preț pentru vânzători |
| AI — Operațiuni | HQ Copilot (Gemini) + integrare GA4 | Inteligență admin, insight funnel |
| Analytics | Google Analytics 4 | Evenimente funnel, achiziție, intenție ofertă |
| Infrastructură | Vercel | Hosting producție, edge delivery |

---

## Tracțiune & status live

| Milestone | Status |
|-----------|--------|
| Deploy producție | **Live** — quickexit.ro |
| Marketplace (listări + cereri) | **Live** |
| Plăți Stripe | **Live** |
| Didit KYC | **Live** |
| HQ Copilot inteligență admin | **Live** |
| Taxonomie evenimente GA4 | **Live** (30+ evenimente produs) |
| SEO / structured data / sitemap | **Live** |
| Modul licitații deschise | **Live** |
| Loop feedback beta | Activ (roadmap board intern) |

**Focus geografic:** România (GTM primar); structură US Delaware LLC pentru granturi internaționale, cloud credits și programe Web3.

---

## Direcție strategică — Web3 & pod active reale

Quick Exit solicită integrarea **Binance OAuth** pentru a conecta utilizatorii crypto-native cu **lichiditatea activelor reale verificate** — un pod controlat între semnalele de identitate/capital on-chain și listările off-chain.

Tiering-ul holderilor token legacy **BMK** (BSC, laborator read-only) informează straturi opționale de acces VIP, fără plăți publice în token în scope-ul producției curente.

**Poziționare pentru granturi ecosystem:** șine de lichiditate RWA (real-world assets) pe BNB Chain / Web3 mai larg — nu DeFi speculativ, ci **infrastructură pentru exit-uri verificate**.

---

## Utilizare fonduri grant / credite (rezumat)

| Zonă alocare | Scop |
|--------------|------|
| Cloud & inferență AI | Scalare HQ Copilot, API evaluare, inteligență admin |
| Identitate & compliance | Extindere fluxuri KYC, tooling audit, semnale fraudă |
| Integrare Web3 | Binance OAuth, profiluri legate de wallet, atestări listări RWA |
| Creștere & GTM | Expansiune România, achiziție buyer/seller, conținut/SEO |
| Inginerie | Marketplace v2 (matching, alerte, experimente preț dinamic) |

Buget detaliat $100K: vezi `budget-100k.md`.

---

## Echipă

| Rol | Nume |
|-----|------|
| Manager / Fondator | Mihai Daniel |

Echipă lean, product-led, cu ownership full-stack pe marketplace, plăți, KYC, AI ops și infrastructură.

---

## Cerere

Quick Exit caută **credite cloud**, beneficii **programe startup** și **granturi ecosystem Web3** pentru accelerarea:

1. Inteligenței de lichiditate AI la scară
2. Infrastructurii identitate verificată + listări active reale
3. Podului utilizator crypto → RWA (calea Binance OAuth)
4. Efectelor de rețea de lichiditate regională în România și piețe adiacente UE

**Contact:** vip@quickexit.ro · [quickexit.ro](https://www.quickexit.ro)

---

*QuickExit, LLC · Delaware · EIN 61-2350228 · © 2026*
