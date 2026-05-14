# Quick Exit — RLS Live P0 Public anon Report

## 1. Context

Test **live**, **read-only**, pentru rolul **public anon** (client Supabase cu **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**, fără sesiune utilizator), conform planului `docs/internal/rls-live-minimal-test-plan.md` — **P0-8**, **P0-9**, **P0-10**.

**Sprint 7A.13** — fără modificări cod, DB, RLS, migrații; fără **service role**; fără insert/update/delete; fără tokenuri sau conținut de rânduri în acest raport.

---

## 2. Metodă

- **Client:** `@supabase/supabase-js` `createClient(SUPABASE_URL, ANON_KEY)` cu `persistSession: false`, `autoRefreshToken: false`.
- **Variabile env:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (încărcate din `.env.local` local; **valorile nu sunt documentate aici**).
- **Interogări:** pentru fiecare tabel — `from(tabel).select('*', { count: 'exact', head: true })` (PostgREST: **HEAD** + `Prefer: count=exact`), fără returnare de corp de rânduri în consolă pentru analiză manuală; în raport se notează doar **count agregat** / prezență eroare.
- **Nu** s-a folosit **service role**.
- **Nu** s-au modificat DB / policies RLS.

**Limită metodologică:** `count = 0` fără eroare HTTP nu diferențiază între „**zero rânduri** în tabel” și „**RLS filtrează tot**”; conform regulilor din brief, acest caz se raportează ca **PARTIAL** până la confirmare în **Supabase Dashboard** (policy / `EXPLAIN` / rol anon) sau până când există date cunoscute în tabel și count rămâne 0.

---

## 3. Rezumat rezultate

| Test ID | Tabel | Așteptat | Observat | Status | Severitate | Note |
|---------|--------|----------|----------|--------|------------|------|
| **P0-8** | `listing_offers` | Anon fără acces la rânduri | `count: 0`, fără `error` în răspunsul client | **PARTIAL** | — | Nu se poate exclude tabel gol; retest cu date cunoscute + Dashboard |
| **P0-9** | `demand_offers` | Anon fără acces la rânduri | `count: 0`, fără `error` | **PARTIAL** | — | Idem P0-8 |
| **P0-10** | `profiles` | Anon fără listare / zero rânduri vizibile | `count >= 1` (anon vede cel puțin un rând agregat) | **FAIL** | **Critical** | Politica `SELECT` pentru `anon` trebuie revizuită în sprint **RLS hardening** (în afara acestui sprint) |

---

## 4. Detalii test

### P0-8 — `listing_offers`

- **Query:** `select('*', { count: 'exact', head: true })` pe `listing_offers`.
- **Acces:** răspuns fără eroare în obiectul `error`; **`count` raportat: 0**.
- **Conținut:** nu s-a logat și nu se reproduce aici.

### P0-9 — `demand_offers`

- **Query:** idem pe `demand_offers`.
- **Acces:** fără `error`; **`count` raportat: 0**.

### P0-10 — `profiles`

- **Query:** idem pe `profiles`.
- **Acces:** fără `error`; **`count` raportat: 1** (anon are vizibilitate agregată pe **cel puțin un** rând).
- **Conținut:** **nu** este inclus în raport; existența `count > 0` este suficientă pentru **FAIL** la cerința „anon nu poate lista `profiles`” în sensul strict al testului P0.

---

## 5. Red flags

- **P0-10 FAIL — Critical:** rolul **anon** poate obține un **count > 0** pe `profiles` → risc de **enumerare / citire** profiluri fără autentificare, în funcție de policy (inacceptabil pentru criteriile P0 din planul minimal).
- **Recomandare:** **oprire** declarație „gata pentru **beta larg**” pe axa **profiles/anon** până la remediere RLS și **retest P0-10**.
- **P0-8 / P0-9:** până la confirmare policy, tratăm ca **zonă de risc mediu** (ambiguitate count 0).

---

## 6. Blocked

- **Nu aplicabil** pentru execuția din 7A.13: variabilele `NEXT_PUBLIC_SUPABASE_URL` și `NEXT_PUBLIC_SUPABASE_ANON_KEY` au fost prezente în `.env.local` și clientul anon a răspuns în timp util.
- Dacă o replică a echipei rulează fără `.env.local`: status **BLOCKED** pentru toate cele trei probe.

---

## 7. Verdict

**Verdict general: FAIL**

**Motiv:** **P0-10** eșuează — anon poate „vedea” cel puțin un rând din `profiles` la nivel de agregare **count**. **P0-8** și **P0-9** rămân **PARTIAL** (fără leak demonstrat prin rânduri > 0, dar fără confirmare clară că RLS blochează vs. tabel gol).

**Regulă aplicată:** FAIL dacă anon citește (inclusiv agregat count > 0 pe) `profiles`; PARTIAL pentru `listing_offers` / `demand_offers` când `count = 0` fără eroare explicită.

---

## 8. Următorul pas

- **Imediat (înainte de beta larg):** sprint **RLS hardening** pentru **`profiles`** — politici `SELECT` pentru rol `anon` (de ex. interzicere totală sau doar cazuri explicite documentate); **retest P0-10** obligatoriu.
- **În paralel:** confirmare în **Dashboard** pentru **P0-8 / P0-9** (existență rânduri în tabele + comportament anon) sau test cu date seed în staging.
- **După PASS P0-8–P0-10 (sau FAIL remediat):** continuare plan live — **User A / User B / User D** (`rls-live-minimal-test-plan.md` §12).

---

*Document generat în **Sprint 7A.13** — probă locală one-off, script temporar rulat și șters, fără commit.*
