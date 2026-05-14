# Quick Exit — profiles RLS hardening retest report

## 1. Context

În **Sprint 7A.13**, testul live **P0-10** a eșuat: clientul **anon** (cheie publică Supabase, fără service role) putea obține **`count >= 1`** pe tabelul **`profiles`** prin interogare tip `select('*', { count: 'exact', head: true })` — **FAIL / Critical** (vezi `docs/internal/rls-live-public-anon-report.md`).

Între timp, echipa a aplicat **manual** în Supabase politici și drepturi conform planului din `docs/internal/rls-hardening-profiles-plan.md` (rezumat în §2 de mai jos). Acest document înregistrează **retestul read-only** **P0-10** și verificări complementare **fără** modificări de cod, DB sau RLS în sprintul curent.

---

## 2. Fix aplicat în Supabase (descriere fără secrete)

Conform informațiilor furnizate de echipă (nevalidate din repo; **nu** există migrație în acest repo pentru aceste schimbări):

| Element | Stare declarată |
|---------|-----------------|
| **RLS** | Activat pe `public.profiles`. |
| **Rol `anon`** | Fără **grants** pe tabelul `profiles` (acces direct eliminat). |
| **`authenticated`** | **SELECT** permis conform policy „own profile”. |
| **`authenticated`** | **INSERT** doar pe rând propriu, câmpuri limitate (`id`, `full_name`, `user_type` — formulare echivalente fluxului app). |
| **`authenticated`** | **UPDATE** doar pe `full_name`, `user_type` (fără `kyc_status` din client). |
| **Policies** | „Users can read own profile”, „Users can insert own profile”, „Users can update own profile”. |
| **`service_role`** | Păstrat pentru **webhook KYC** / backend (scriere `kyc_status` server-side). |

---

## 3. Retest P0-10

**Metodă (identică spirit 7A.13):** `createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)` din `.env.local` local; **fără** service role; **fără** persist session; interogări **read-only**.

**Probe executate (script temporar local, neversionat):**

1. `from('profiles').select('*', { count: 'exact', head: true })`  
2. `from('profiles').select('id').limit(1)`

**Rezultat brut (fără conținut rânduri, fără chei):**

- **HEAD / count:** nu s-a obținut `count` numeric pozitiv; răspunsul include obiect `error` (mesaj gol în serializarea scurtă — comportament PostgREST/supabase-js la refuz pe `HEAD`).  
- **`select('id').limit(1)`:** eroare PostgreSQL **`42501`** — **`permission denied for table profiles`**, fără rânduri returnate.

| Test ID | Așteptat | Observat | Status | Severitate | Note |
|---------|----------|----------|--------|------------|------|
| **P0-10** | Anon nu poate citi / număra `profiles` | `42501` la `select id limit 1`; fără `count > 0` și fără rânduri | **PASS** | None | Blocare clară pentru citire anon |

---

## 4. Verificare impact public `/anunt/[id]`

| Câmp | Valoare |
|------|---------|
| **URL testat** | `https://quickexit-app.vercel.app/anunt/0acbccd5-f871-4cbc-baa7-fd4b0d544125` (listare **activă** extrasă prin același proiect Supabase anon pe `listings`, fără a expune date din `profiles`) |
| **HTTP** | **200 OK** |
| **Robots** | `meta name="robots" content="index, follow"` (listare activă publică) |
| **Funcționalitate** | Pagina se încarcă; shell HTML și metadata listare prezente. |

**Impact seller trust:** în browser, `AnuntClient` încă apelează `from('profiles').select(...).eq('id', seller_id)` cu clientul **anon** pentru vizitator neautentificat. După hardening, acest apel **eșuează** cu permisiune interzisă — **trust-ul** (nume, KYC) poate **lipsi** sau fi înlocuit cu stări goale în UI, **fără** a face pagina **404** dacă listarea se încarcă. Acest lucru este **acceptat** pentru sprintul de retest (pagina „funcționează” la nivel HTTP); remedierea UX (view public / text generic) intră în **sprint separat** (vezi §6).

---

## 5. Verificare impact dashboard / posteaza-cerere (audit static)

| Flux | Fișier | Comportament în cod | Aliniere cu fix declarat |
|------|--------|---------------------|---------------------------|
| **Dashboard** | `app/dashboard/page.tsx` | `from('profiles').select('*').eq('id', user.id).single()` după `getUser()` | **SELECT** pe propriul `id` — consistent cu policy „read own profile” pentru JWT **authenticated**. |
| **Postează cerere** | `app/posteaza-cerere/PosteazaCerereClient.tsx` | `upsert({ id: user.id, full_name, user_type: 'buyer' })` | Câmpuri în setul permis pentru **INSERT/UPDATE** declarat. |
| **kyc_status** | `app/api/webhooks/kyc/route.ts` | `update({ kyc_status })` cu client **admin** server | Nu trece prin client anon; rămâne pe **service_role**. |

**Neacoperit în acest sprint:** sesiuni **live** autentificate pentru confirmare Network (dashboard / posteaza-cerere) — recomandat înainte de închiderea completă a epicii.

---

## 6. Ce rămâne de făcut

1. **Retest live autentificat:** login utilizator real în staging; confirmare `profiles` se încarcă în **dashboard** și `upsert` reușește la **posteaza-cerere**.  
2. **Retest P0-8 / P0-9** (oferte) — încă **PARTIAL** din 7A.13 până la probe dedicate.  
3. **Decizie seller trust public** (conform `rls-hardening-profiles-plan.md`):  
   - **A.** Text generic fără query `profiles` pentru anon;  
   - **B.** View / RPC minimal cu grant doar pe view;  
   - **C.** Nu reveniți la **SELECT anon** pe `profiles` întreg.

---

## 7. Verdict

| Tip | Verdict |
|-----|---------|
| **P0-10 (anon pe `profiles`)** | **PASS** — blocare clară (`42501`, fără rânduri, fără count pozitiv). |
| **Retest global sprint 7A.15** | **PARTIAL** — `/anunt` verificat HTTP public; **dashboard** / **posteaza-cerere** validate doar **static**, nu și cu sesiune live în acest sprint. |

**FAIL:** nu pentru P0-10 după retest.

---

## 8. Următorul pas

1. Implementare produs **opțiune A sau B** pentru trust pe anunț, dacă UX o cere.  
2. **Retest live** autentificat dashboard + posteaza-cerere.  
3. Reluare **plan live minimal** — User A / B / D — după închiderea punctelor de mai sus și retest P0-8/P0-9 dacă echipa le consideră obligatorii.

---

*Sprint **7A.15** — read-only în repo; script temporar de probă rulat local și **nu** comis.*
