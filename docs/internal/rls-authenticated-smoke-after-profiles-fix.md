# Quick Exit — Authenticated smoke after profiles RLS fix

## 1. Context

În **7A.13**, **P0-10** a eșuat: clientul **anon** putea obține **count** pe `profiles` (**FAIL / Critical**). În **Supabase** s-a aplicat manual hardening: **RLS ON** pe `public.profiles`, **fără grants `anon`** pe tabel, **`authenticated`** cu **SELECT** doar pentru propriul rând (`auth.uid() = id`), **INSERT/UPDATE** limitate la câmpuri permise (**fără** `kyc_status` din client), **`service_role`** păstrat pentru **webhook KYC** / backend.

În **7A.15**, retestul **P0-10** a fost **PASS**; **`/anunt/[id]`** public a răspuns **200**; **build** reușit; fluxurile **dashboard** și **posteaza-cerere** au fost validate doar **static**, nu cu sesiune live.

Acest document (**7A.16**) înregistrează **smoke-ul** post-fix: audit static complet + verificări **HTTP publice**; **fără** sesiune autentificată în mediul agentului (browser + cont test indisponibile aici).

---

## 2. Metodă

- **Audit static:** `app/dashboard/page.tsx`, `app/components/KycBanner.tsx`, `app/posteaza-cerere/PosteazaCerereClient.tsx`, `app/anunt/[id]/AnuntClient.tsx`; grep `kyc_status` pe `*.ts` / `*.tsx`.
- **Test manual logat:** **neefectuat** în mediul Cursor (lipsă acces interactiv la cont test + DevTools).
- **Request public:** `curl` **HEAD/GET** către `https://quickexit-app.vercel.app/anunt/...` și GET către `/posteaza-cerere` (shell HTML).
- **Fără** modificări cod, DB, RLS, migrații, plăți, checkout, webhook, provider KYC, SEO.

---

## 3. Rezumat rezultate

| Test ID | Scenariu | Așteptat | Observat | Status | Note |
|---------|----------|----------|----------|--------|------|
| **A1** | Dashboard logat | Încărcare; `profiles` propriu fără eroare RLS | Nu s-a putut deschide sesiune autentificată în mediul agentului | **BLOCKED** | Static: `getUser()` → `from('profiles').select('*').eq('id', user.id).single()` — aliniat cu policy „own profile” |
| **A2** | Status KYC în dashboard | Afișare din `userProfile.kyc_status` | Neconfirmat live | **BLOCKED** | Cod: `kycStatusLabel`, card cont; depinde de citirea profilului propriu |
| **A3** | KycBanner | Banner + flux Stripe Identity fără `update profiles` | Audit static OK; UI live neexercitat | **PARTIAL** | `KycBanner` apelează doar `POST /api/create-verification-session`; **fără** `supabase.from('profiles').update` |
| **A4** | Postează cerere | Formular + `upsert` compatibil grants | GET public **200**; submit/upsert logat netestat | **PARTIAL** | `upsert({ id, full_name, user_type: 'buyer' })` — potrivit cu INSERT/UPDATE permise declarate |
| **A5** | `/anunt` public | **200**; robots; fără crash | **200 OK**; `robots: index, follow` | **PASS** | Același URL eșantion ca în 7A.15 (listare activă) |
| **A6** | Console / Network erori `profiles` | Fără erori critice vizibile | Nu s-a putut inspecta Network în browser logat | **BLOCKED** | Pe public, `AnuntClient` încarcă `profiles` ca anon — așteptat **eșec silențios** (`sellerProfile` null) dacă RLS blochează |
| **A7** | Absență `update kyc_status` din client | Doar server webhook | Singurul `update({ kyc_status })` pe `profiles` în surse: `app/api/webhooks/kyc/route.ts` | **PASS** | Grep repo: fără update `kyc_status` din componente client |

---

## 4. Detalii

### A1 — Dashboard

- **Static:** după autentificare, `fetchDashboardData` citește `profiles` cu `.eq('id', user.id)` — conform policy „read own”.
- **Live:** **BLOCKED** — necesită login în browser.

### A2 — KYC status

- **Static:** `userProfile?.kyc_status` pentru etichete și condiții (`hasPaidActivity`, banner).
- **Live:** **BLOCKED**.

### A3 — KycBanner

- **Static:** componenta primește `kycStatus` din părinte; butonul pornește doar sesiune verificare Stripe via API route — **nu** scrie `kyc_status` în Supabase din client.

### A4 — Postează cerere

- **Static:** `upsert` limitat la `id`, `full_name`, `user_type`.
- **Public GET:** pagina răspunde **200**, titlu/meta coerente — shell încărcat.
- **Live autentificat:** **BLOCKED** (fără submit; fără creare cerere).

### A5 — Anunț public

- **HTTP:** **200**; **robots** `index, follow`.
- **Logică:** la eșec `profiles` pentru anon, `setSellerProfile((profileRes.data ?? null))` — listarea rămâne din `adData`; trust vânzător poate fi gol (text generic `kycStatusRo(null)` etc.).

### A6 — Erori

- **Live:** **BLOCKED**. În cod, `profileRes.error` **nu** este verificat explicit înainte de `setSellerProfile` — erorile pot apărea în consolă doar la rulare client (de verificat manual).

### A7 — `kyc_status`

- **Static PASS:** mutația pe `profiles.kyc_status` rămâne în **webhook KYC** server-side.

---

## 5. Impact observat

| Zonă | Impact |
|------|--------|
| **Seller trust public** | După hardening, **anon** nu mai citește `profiles`; UI poate afișa stări **fără** nume/KYC real până la view dedicat sau copy generic (**vezi** `rls-hardening-profiles-plan.md` opțiuni A/B). |
| **Dashboard** | Așteptat **OK** pentru user autentificat; **neconfirmat** live. |
| **Postează cerere** | `upsert` aliniat static cu grants; **neconfirmat** la submit live. |
| **KYC** | Flux banner → API verificare neschimbat în cod; actualizare status tot prin webhook. |

---

## 6. Ce rămâne de făcut

1. **Smoke manual** cu cont test: `/dashboard` + Network pentru `rest/v1/profiles` (status **200**, JSON propriu).  
2. **Postează cerere:** pasul de **upsert** în staging (fără finalizare checkout dacă nu e nevoie).  
3. **Decizie trust public:** generic vs **view** minimal — apoi ajustare cod dacă e cazul.  
4. **P0-8 / P0-9** (oferte) — din backlog 7A.13.  
5. **User A / B / D** — plan live minimal, după închiderea smoke autentificat.

---

## 7. Verdict

**Verdict: PARTIAL**

**Motiv:** **`/anunt` public** și shell **`/posteaza-cerere`** verificate la nivel **HTTP** (**PASS** pentru A5; A4 parțial). **Dashboard** + **KYC UI** + **Network/console** pentru sesiune logată sunt **BLOCKED** în acest sprint. **Nu** există dovezi de **FAIL** (pagină dashboard „ruptă” de RLS) — doar ** lipsă test live**.

**FAIL:** nu raportat (nu s-a putut reproduce scenariul autentificat).

---

*Sprint **7A.16** — read-only în repo.*
