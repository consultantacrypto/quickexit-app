# Quick Exit — RLS Test Set 5: Profiles

## 1. Context

Acest raport documentează **Test Set 5 — Profiles** din `docs/internal/rls-privacy-execution-plan.md` (secțiunea **„## 10. Test Set 5 — Profiles”**), complementar cu **§8 — profiles** din `docs/internal/rls-privacy-checklist.md`.

Execuție **read-only**: fără modificări de cod, DB, RLS, fără service role, fără tokenuri sau chei în document. Legătura cu **7A.5**: pentru **P1** (echivalent anon list `profiles`) rămâne **PARTIAL/BLOCKED** la nivel PostgREST până la rulare manuală în Supabase; acest raport închide parțial gap-ul prin **audit static** și verificări de rută publică.

---

## 2. Metodă

- **Audit static** în repo: toate aparițiile `.from("profiles")` / `'profiles'`, `kyc_status`, `upsert`/`update` pe `profiles`, `trackEvent`, construire snapshot **HQ Copilot** → Gemini.
- **Request HTTP public** (unde relevant): confirmare că nu există rute dedicate de director profil (căutare în `app/`).
- **Fără service role**, fără apeluri `curl` către PostgREST cu chei din env.
- **Fără** modificări DB/RLS.

---

## 3. Rezumat rezultate

| Test ID | Scenariu | Așteptat | Observat | Status | Severitate | Note |
|---------|-----------|----------|----------|--------|------------|------|
| P1 | Anon nu poate lista `profiles` | Fără rută/API publică listă; RLS refuză `SELECT` masiv | Nu există pagină/API Next dedicată listării; HQ folosește client Supabase cu gate UI admin | **PARTIAL** | Low | Confirmare **RLS** necesită SQL/PostgREST anon în Dashboard |
| P2 | User își vede propriul profil | Dashboard încarcă profil pentru `auth.uid()` | `app/dashboard/page.tsx`: `.from('profiles').select('*').eq('id', user.id).single()` | **PASS** | None | Comportament cod; **RLS** trebuie să permită doar rândul propriu (verificare manuală) |
| P3 | User nu vede profil complet alt user (în afară de trust public) | Izolare între conturi | Nu există query explicit „profil user B” în dashboard pentru alt UUID; pagina anunț încarcă **vânzătorul** anunțului public | **PARTIAL** | Low | **RLS** decide dacă B poate citi profilul lui A fără context anunț |
| P4 | Public = trust minim pe anunț | `kyc_status`, eventual nume; fără email/telefon în `select` | `AnuntClient`: `select("id, full_name, kyc_status, user_type, created_at")` pentru `user_id` vânzător | **PASS** | Low | `full_name` = PII ușoară, intenție produs „trust”; fără email/telefon în acest `select` |
| P5 | User nu poate `update kyc_status` din client | Doar server webhook | Nu există `update({ kyc_status })` în cod client; doar citire în UI | **PASS** | None | Confirmare **RLS** `UPDATE` pentru client = manual |
| P6 | User nu poate modifica roluri / admin | Fără upsert `is_admin` etc. | Singur upsert client: `PosteazaCerereClient` setează `user_type: "buyer"` + `full_name` din metadata auth | **PASS** | Low | `user_type` nu este flag admin în cod; schema DB poate include alte coloane — RLS manual |
| P7 | `kyc_status` doar din webhook KYC | Un singur writer în cod | `app/api/webhooks/kyc/route.ts`: `supabaseAdmin.from('profiles').update({ kyc_status }).eq('id', userId)` | **PASS** | None | Singurul `update` pe `kyc_status` identificat în sursele aplicației (exclud trigger-e/migrații DB externe repo) |
| P8 | HQ / Copilot | HQ operațional; Gemini minim PII | HQ Admin: `select("id, full_name, kyc_status, user_type, created_at")` limit 300. Copilot: același select limit 500; în **snapshot** JSON trimis la Gemini, `profiles.recent` conține doar `id`, `kyc_status`, `user_type`, `created_at` (**fără** `full_name` în slice-ul `recent`) | **PARTIAL** | Low | `full_name` rămâne în memorie server din query; în `JSON.stringify(snapshot)` nu intră câmp cu `full_name` în ramura `profiles` agregată; alte părți ale promptului includ date listings/demands — risc separat |
| P9 | Analytics fără profil/email/telefon | Fără `trackEvent` cu profil | Evenimente dashboard/checkout: `listing_id`, `demand_id`, `offer_id`, `session_id`, `category`, etc. — **fără** obiect profil sau email în params | **PASS** | None | Email sesiune folosit în **UI** (`setSessionEmail` din `auth.getUser()`), nu în `trackEvent` |
| P10 | Fără director public de profile | Fără `/profil`, `/users` | Nicio rută `app/profil*`; text „utilizatori” apare doar în pagini legale/copy | **PASS** | None | — |

---

## 4. Detalii pe test

### P1 — Anon nu poate lista profiles

- **Pași:** grep `.from("profiles")` în `app/api` (rute publice); căutare rute `app/` pentru listă profiluri.
- **Observații:** interogări `profiles` apar în `dashboard`, `anunt` (singular), `posteaza-cerere` (upsert), `hq-admin`, `webhooks/kyc`, `hq/copilot`.
- **Rezultat:** **PARTIAL** — la nivel **aplicație** nu există listă publică; **RLS** pentru `SELECT` anon fără filtru = **BLOCKED** fără Dashboard.
- **Manual:** rulare `SELECT id FROM profiles LIMIT 10` ca **anon** în SQL Editor Supabase.

### P2 — Propriul profil

- **Pași:** `app/dashboard/page.tsx` după `getUser()`.
- **Observații:** `select('*')` pe `profiles` pentru `user.id` — expune toate coloanele returnate de RLS în **browser** (suprafață de risc dacă RLS e prea larg).
- **Rezultat:** **PASS** (flux cod).
- **Manual:** Network tab autentificat — verificare coloane în JSON.

### P3 — Profil alt utilizator

- **Pași:** căutare `profiles` + `.eq('id',` care nu e `user.id`.
- **Observații:** `AnuntClient` încarcă profil pentru `data.user_id` al listării publice (vânzător).
- **Rezultat:** **PARTIAL** — intenționat pentru trust public; izolare B→A în afara contextului anunț = **RLS**.
- **Manual:** user B încearcă să citească profilul lui A fără middle public (PostgREST).

### P4 — Trust minim public

- **Pași:** `AnuntClient` select explicit + UI `kycStatusRo`, nume afișat unde e prevăzut în design.
- **Observații:** nu apare `email`/`phone` în `select` pentru seller pe anunț.
- **Rezultat:** **PASS** (conform select explicit; PostgREST respectă de obicei lista de coloane).
- **Manual:** verificare răspuns REST real.

### P5 — `kyc_status` client

- **Pași:** grep `update`/`upsert` + `kyc_status` în tot repo-ul TS/TSX.
- **Observații:** doar `webhooks/kyc/route.ts` face `update({ kyc_status })`.
- **Rezultat:** **PASS** în cod; **BLOCKED** pentru „client malicios direct la API Supabase”.
- **Manual:** încercare `UPDATE profiles SET kyc_status='verified'` cu JWT user în SQL Editor (trebuie să **eșueze**).

### P6 — Roluri / admin

- **Pași:** grep `upsert`/`update` pe `profiles`.
- **Observații:** `PosteazaCerereClient`: `id`, `full_name`, `user_type: "buyer"` — nu există `is_admin` / `role` în cod.
- **Rezultat:** **PASS** pentru cod; **RLS** trebuie să blocheze coloane privilegiate dacă există în schema.
- **Manual:** încercare update câmp admin dacă există în tabel.

### P7 — Sursă unică KYC în cod

- **Pași:** grep `kyc_status` + mutații.
- **Observații:** confirmat un singur path de scriere `kyc_status` în codul sursă.
- **Rezultat:** **PASS**.
- **Manual:** migrații/trigger-e DB în afara repo — revizie ocazională.

### P8 — HQ / Copilot / Gemini

- **Pași:** `hq-admin/page.tsx` (client anon + gate email); `copilot/route.ts` snapshot + `fullPrompt`.
- **Observații:** snapshot-ul `profiles` trimis la model exclude `full_name` din lista `recent`; agregate KYC pe toată baza încărcată server-side. `generateOperationalRisks` folosește `profiles` pentru riscuri KYC (`entity_id` = `p.id`).
- **Rezultat:** **PARTIAL** — acceptabil pentru **admin**; pentru **beta** recomandare rămâne reducere date (vezi checklist §13).
- **Manual:** log proxy staging pe body Gemini (fără a lipi în repo).

### P9 — Analytics

- **Pași:** grep `trackEvent` + revizuire params în `dashboard`, `anunt`, `posteaza-cerere`.
- **Observații:** niciun `trackEvent` nu transmite obiect `profiles`, `email` sau `phone`.
- **Rezultat:** **PASS**.

### P10 — Director public

- **Pași:** glob/căutare rute `profil`, `users`, `utilizatori` în `app/`.
- **Observații:** doar limbaj legal „utilizatori”.
- **Rezultat:** **PASS**.

---

## 5. Suprafețe de risc `profiles`

| Zonă | Risc | Mitigare în cod | Rămâne |
|------|------|-----------------|--------|
| **Dashboard** | `select('*')` pe propriul profil | Coloane limitate doar dacă RLS restricționează | **RLS** + eventual `select` explicit în sprint viitor |
| **Anunț public** | `full_name` + `kyc_status` vizibile | Select explicit, fără email în query | Produs / GDPR — documentat |
| **Postează cerere** | `upsert` cu `user_type: "buyer"` | Nu e escaladare admin | RLS să nu permită suprascrierea altui `id` |
| **kyc_status** | Escaladare falsă | Doar webhook în cod | **RLS** pe `UPDATE` |
| **HQ Copilot** | `full_name` în rânduri citite DB | Agregat `recent` fără `full_name` în JSON snapshot | Datele brute există în proces Node până la GC — risc operațional scăzut |
| **create-verification-session** | — | Nu atinge `profiles` în fișierul route | — |

---

## 6. Red flags

- **Niciun red flag Critical** din auditul static curent.
- **Atenție:** `select('*')` pe `profiles` în **dashboard** — dacă RLS returnează email/telefon în rând, acestea pot apărea în **Network** (nu neapărat în HTML). Verificare manuală recomandată.
- **Atenție:** `full_name` vânzător pe pagină publică anunț — PII ușoară, probabil **intenționată** pentru încredere.

---

## 7. Blocked / necesită test manual

- **`SELECT` anon / JWT** pe `profiles` în Supabase (confirmare P1, P3, P5, P6 end-to-end).
- **Network autentificat** — conținut exact JSON `profiles` pentru dashboard.
- **Trigger-e / policy-uri** definite doar în DB, absente din repo.
- **Comparație** staging vs producție după deploy.

---

## 8. Concluzie

**Verdict general: PARTIAL**

**Motiv:** în **codul aplicației**, nu există listă publică de profile, nu există update `kyc_status` din client, există un singur writer `kyc_status` în `webhooks/kyc`, iar analytics nu trimite profiluri. Totuși **P1, P3, P8** și confirmarea **RLS** pentru **P2, P5, P6** depind de teste în Supabase / Network — neconfirmate în acest sprint → verdict **PARTIAL**.

**FAIL:** nu s-a constatat (nu există în cod listă publică sau update client `kyc_status`).

---

## 9. Următorul pas

Recomandare: **Test Set 2 — User A Seller** (flux proprietar + oferte), deoarece **profiles** pe dashboard este strâns legat de încărcarea listărilor/ofertelor pentru același utilizator.

Alternativ, dacă prioritatea este fișiere: **Test Set 6 — Storage** (bucket `listings`, path `user_id/…`).

---

*Document generat în cadrul Sprint **7A.6** — read-only.*
