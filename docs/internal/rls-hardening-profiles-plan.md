# Quick Exit — RLS Hardening Plan: profiles anon SELECT

## 1. Context

În **Sprint 7A.13** — test live P0 pentru rol **public anon** (client Supabase cu cheie **anon**, fără service role), **P0-10** a eșuat: interogarea `profiles` cu `select('*', { count: 'exact', head: true })` a returnat **`count >= 1`** fără eroare de permisiune. Acest lucru demonstrează că rolul **anon** are cel puțin **vizibilitate parțială** asupra tabelului `profiles` (inclusiv pentru agregări de tip **COUNT**), ceea ce contrazice obiectivul de bază din planul minimal live: **anon nu poate lista / număra profiles**.

**Decizie produs (7A.14):** se **opresc** testele live **User A / User B / User D** și sprintul de **performanță** până la remedierea acestei axe; se întocmește **planul de hardening RLS** pentru **`profiles` + SELECT anon** (acest document). **Nu** se modifică în acest sprint cod, DB, RLS sau migrații — doar planificare.

**Surse:** `docs/internal/rls-live-public-anon-report.md`, `docs/internal/rls-static-audit-summary.md`, `docs/internal/rls-tests-profiles-report.md`, `docs/internal/rls-privacy-checklist.md` §8, `docs/internal/rls-live-minimal-test-plan.md`.

---

## 2. Rezultat test 7A.13

| Test ID | Tabel | Status | Severitate |
|---------|--------|--------|------------|
| **P0-8** | `listing_offers` | **PARTIAL** | — |
| **P0-9** | `demand_offers` | **PARTIAL** | — |
| **P0-10** | `profiles` | **FAIL** | **Critical** |

**Metodă:** client anon (`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` din `.env.local`); **fără service role**; **fără afișare conținut rânduri**; query **read-only** `select('*', { count: 'exact', head: true })` per tabel.

---

## 3. De ce contează

- **Confirmare existență:** dacă anon poate obține `count > 0`, poate confirma că există cel puțin un profil în sistem (și poate diferenția medii în timp dacă count-ul se schimbă între deploy-uri).
- **Enumerare:** dacă există o policy `SELECT` prea largă pentru `anon`, același rol ar putea putea (în funcție de policy) **`SELECT` cu limit/offset** sau filtre — risc de **scraping** / **OSINT**.
- **Expunere coloane:** PostgREST returnează **rânduri întregi** permise de policy; fără limite stricte, pot apărea **`full_name`**, **`kyc_status`**, **`user_type`**, **`created_at`**, sau alte coloane sensibile în **Network**, chiar dacă UI-ul public afișează doar un subset.
- **Reputație / conformitate:** înainte de **beta larg**, expunerea necontrolată a `profiles` pentru **anon** este inacceptabilă față de checklist-ul intern §8 și față de așteptările P0.

---

## 4. Comportament dorit

| Actor | Comportament dorit |
|--------|---------------------|
| **anon** | **Fără** `SELECT` care returnează rânduri din `profiles`; **fără** `COUNT` vizibil pe `profiles` prin API PostgREST (inclusiv `HEAD` + `Prefer: count=exact`). |
| **anon** | **Fără** citire email / telefon / date personale din `profiles`. |
| **authenticated** | Poate **`SELECT`** **propriul** rând: `auth.uid() = id` (sau echivalent). |
| **authenticated** | Poate **`UPDATE`/`UPSERT`** doar pe **coloane permise** ale propriului rând; **fără** escaladare `kyc_status` / rol admin. |
| **authenticated** | **Nu** poate modifica `kyc_status` din client. |
| **kyc_status** | Scriere **doar** server-side (ex. `app/api/webhooks/kyc/route.ts` cu **service role**). |
| **admin / HQ** | Citire profile pentru operațiuni HQ prin mecanism **controlat** (client autentificat admin + RLS dedicată **sau** server-only cu service role — decizie de arhitectură în sprintul de implementare). |
| **Pagină publică anunț** | Dacă produsul cere **trust** vânzător: doar **date minime** expuse prin mecanism explicit (vezi §6), **nu** prin listare liberă `profiles` pentru anon pe tot tabelul. |

---

## 5. Date `profiles` folosite acum (audit static cod)

| Zonă | Câmpuri folosite | Public? | Observații |
|------|------------------|-----------|-------------|
| **Dashboard** (`app/dashboard/page.tsx`) | `select('*')` cu `.eq('id', user.id)` | Nu (utilizator autentificat) | Toate coloanele returnate de RLS ajung în browser — minimizare recomandată ulterior. |
| **Anunț public** (`app/anunt/[id]/AnuntClient.tsx`) | `id, full_name, kyc_status, user_type, created_at` cu `.eq('id', data.user_id)` | **Da** (pagină publică; client folosește același SDK cu cheie **anon** pentru vizitator neautentificat) | Acest flux **necesită** o cale controlată de citire „trust seller” după ce `anon` este blocat pe tabelul de bază — vezi §6–§7. |
| **Postează cerere** (`PosteazaCerereClient.tsx`) | `upsert`: `id`, `full_name`, `user_type: "buyer"` | Nu | Scriere ca utilizator autentificat. |
| **HQ Admin** (`app/hq-admin/page.tsx`) | `id, full_name, kyc_status, user_type, created_at` (limit 300) | Nu (pagină admin; nu indexabil pentru public) | Depinde de RLS pentru rol admin + cheie anon în browser — separat de problema **anon public**, dar trebuie aliniat la politici după hardening. |
| **HQ Copilot** (`app/api/hq/copilot/route.ts`) | `adminSupabase`: aceleași coloane, limit 500; snapshot agregat `profiles.recent` fără `full_name` în slice | Nu (server, route API) | Query-ul folosește client **admin**; nu este anon browser, dar datele intră în prompt — PII minim (deja parțial tratat în raportul profiles). |
| **KYC webhook** (`app/api/webhooks/kyc/route.ts`) | `update({ kyc_status }).eq('id', userId)` | Nu | **Service role** server-side — trebuie **păstrat** după ce `UPDATE` client pe `kyc_status` rămâne interzis. |

**Alte apariții:** grep repo — `.from('profiles')` / `.from("profiles")` limitat la fișierele de mai sus pentru fluxul curent analizat.

---

## 6. Decizie produs: trust info public

### Opțiunea A — Fără `profiles` public deloc

- **Pro:** maximă siguranță pentru **anon**; P0-10 devine ușor de trecut după blocare totală.
- **Contra:** pagina publică de anunț **pierde** nume + badge KYC dacă nu sunt înlocuite din altă sursă.
- **Mitigare UX:** text generic („Vânzător verificat”) fără date din `profiles`, sau date replicate minim în `listings` (decizie schema — sprint separat).

### Opțiunea B — Trust minimal prin **view** / **RPC** dedicat (recomandată dacă produsul cere trust)

- **View** (sau funcție `SECURITY DEFINER` read-only) de tip `public_seller_trust` cu coloane stricte: ex. `seller_id`, `display_label`, `is_verified`, eventual `member_since` agregat — **fără** email/telefon; opțional **fără** `full_name` complet dacă se acceptă doar inițiale.
- **Grants:** doar `SELECT` pentru `anon` pe **view**, nu pe `profiles` direct.
- **RLS pe `profiles`:** `SELECT` pentru `anon` = **interzis** sau zero rânduri garantat.

### Opțiunea C — Păstrare `SELECT` direct pe `profiles` pentru anon cu RLS „condiționat”

- **Pro:** puține schimbări de routing în app.
- **Contra:** greu de auditat; risc mare de regresii (COUNT, coloane noi); **nu** recomandat pentru beta larg.

**Recomandare document:** **B** dacă trust-ul rămâne cerință de produs; **A** pentru hardening cel mai rapid. **C** — **nu** recomandată.

---

## 7. Strategie RLS recomandată (conceptual, fără execuție SQL)

1. **Revocare / nealocare** a oricărui drept `SELECT` pe tabelul **`public.profiles`** pentru rolul **`anon`** (sau policy care returnează rânduri / permite agregări vizibile anon).
2. **`authenticated` — `SELECT`:** permis **doar** unde `id = auth.uid()` (propriul profil).
3. **`authenticated` — `UPDATE`/`INSERT`:** permis doar pe propriul `id`, **doar** coloane agreate (ex. `full_name`, `user_type` pentru fluxuri documentate); **interzis** `kyc_status` din JWT utilizator normal (policy `WITH CHECK` fără coloană sau trigger guard).
4. **`kyc_status`:** actualizare **doar** prin **`service_role`** în `webhooks/kyc` (stare actuală în cod).
5. **Trust public anunț:** după opțiunea **A** sau **B** — view/RPC cu set minimal de coloane + `GRANT SELECT ON view TO anon` (sau echivalent), **fără** grant pe `profiles` pentru anon.
6. **HQ / Copilot:** aliniați **după** hardening — fie RLS pentru „admin JWT”, fie mutare completă a citirii agregate pe server cu service role (în afara scope-ului acestui document de plan).

**Atenție:** în PostgreSQL, **RLS pe rând** nu înlocuiește automat **protecția la nivel de coloană** în toate scenariile PostgREST; pentru control fin, **view**-uri sau **coloane separate** / **masking** pot fi necesare.

---

## 8. SQL de investigat în Supabase (manual — nu rula în acest sprint din repo)

În **Supabase Dashboard → SQL Editor** (sau `psql`), echipa verifică:

- dacă **RLS** este activat pe `profiles`;
- lista completă **`pg_policies`** pentru `profiles` (în special orice `USING (true)` sau `qual` lipsă pentru `SELECT`);
- **grants** pe tabel pentru `anon` / `authenticated` / `authenticator`;
- existența **view**-urilor care fac `SELECT` din `profiles` și **grants** pe acele view-uri;
- comportamentul **PostgREST** pentru `HEAD` + `Prefer: count=exact` ca **anon** (reprodus ca în 7A.13).

**Interogări orientative (doar pentru reviewer uman în Dashboard):**

```sql
-- RLS activ pe tabel?
select relname, relrowsecurity, relforcerowsecurity
from pg_class
join pg_namespace n on n.oid = pg_class.relnamespace
where n.nspname = 'public' and relname = 'profiles';

-- Policies pe profiles
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where tablename = 'profiles';

-- Grants pe tabel
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'profiles';

-- View-uri care referă profiles (indicativ; ajustează după catalogul real)
select table_schema, table_name
from information_schema.view_table_usage
where referenced_table_name = 'profiles';
```

După modificări viitoare: rerula **aceeași probă** ca în 7A.13 (`count: exact, head: true` pe `profiles` cu client anon) — așteptat **eroare** sau **count null/0 stabil** cu confirmare că există rânduri în tabel dar anon nu vede.

---

## 9. Retest P0-10 după fix

1. **Mediu:** staging (recomandat) cu aceeași versiune de policies ca propunerea de producție.
2. **Client:** anon, fără service role — identic 7A.13.
3. **Query minim:** `from('profiles').select('*', { count: 'exact', head: true })`.
4. **PASS:** răspuns care **nu** permite deducerea existenței profilurilor de către anon — practic: **eroare** policy / acces interzis, **sau** `count` strict `0` **și** confirmare separată (Table Editor / `select count(*)`) că tabelul conține rânduri (deci RLS blochează).
5. **FAIL:** `count > 0` pentru anon sau rânduri returnate la `select('id').limit(1)`.
6. **PARTIAL:** doar `count = 0` fără eroare și **fără** confirmare că există date în `profiles` — insuficient pentru închiderea P0-10.
7. **Regresie UI:** verificare manuală pagină **`/anunt/[id]`** pentru anunț activ — trust vânzător conform opțiunii **A** sau **B**.

---

## 10. Dependențe cu alte backlog-uri

- **Anunț public:** orice blocare `anon` pe `profiles` impune **schimbare de cod** și/sau **view** dacă se păstrează trust-ul (sprint implementare după acest plan).
- **HQ Admin:** verificat că politicile noi **nu** împiedică accesul legitim al adminului (rol separat sau service role).
- **P0-8 / P0-9:** rămân **PARTIAL** până la probe dedicate; nu depind direct de `profiles`, dar **ordinea** recomandată: **închide P0-10**, apoi reconfirmă ofertele.

---

## 11. Concluzie plan

Problema **P0-10** este **Critical** pentru că **anon** poate confirma (și potențial exploata) acces la **`profiles`** prin API-ul Supabase. Hardening-ul trebuie să **elimine SELECT/COUNT pentru anon pe `profiles`**, să **păstreze** fluxurile autentificate și webhook KYC, și să **redefinească** trust-ul public prin **opțiunea A sau B**. După implementare în sprint dedicat, **retest obligatoriu P0-10** înainte de reluarea testelor **User A / B / D** și înainte de **beta larg**.

---

*Sprint **7A.14** — document-only.*
