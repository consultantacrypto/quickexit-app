# Quick Exit — RLS Live Minimal Test Plan

## 1. Scop

Acest document definește **testele live minimale** pentru validarea **RLS** (și a politicilor **Storage** asociate) cu **conturi reale de rol** (**User A** vânzător, **User B** cumpărător, **User D** proprietar cerere de capital), **înainte** de **beta mai larg** și **înainte** de sprintul dedicat **performanței**.

**Sprint 7A.12** pregătește **pașii** și **criteriile de ieșire**; **nu** include execuția testelor în acest moment. Rezultatele se vor înregistra ulterior în `docs/internal/rls-live-minimal-test-report.md` (vezi §9 — fișierul **nu** se creează încă).

**Legătură:** derivă din `docs/internal/rls-static-audit-summary.md` (§6 red flags, §7 teste obligatorii) și din `docs/internal/rls-privacy-execution-plan.md` (seturi de test și conturi).

---

## 2. Reguli

- **Nu** modificăm politici **RLS** sau **Storage** în timpul sesiunii de test (doar observăm și notăm).
- **Nu** „reparăm” în același sprint ca testul; orice remediere intră într-un **sprint separat** de hardening, planificat explicit.
- Folosim **conturi test** dedicate (staging recomandat); maparea alias → cont se ține în **registru intern**, nu în acest document.
- **Nu** folosim date sensibile reale (CNP, conturi bancare complete, conversații private identificabile).
- **Nu** ștergem date de producție; în staging evităm ștergeri destructive în timpul probei dacă nu e strict necesar.
- **Notăm tot** în raportul live (când va exista): ID test, rol, pași, observat, PASS/FAIL/BLOCKED, severitate, acțiune.
- Dacă apare rezultat **Critical** sau **High** neacceptat pentru produs: **oprim** execuția pe ramura respectivă, clasificăm, deschidem **sprint hardening** (RLS / ownership / API), apoi **retestăm** doar zona afectată.
- **Fără service role** în browser; cheia **anon** + JWT utilizator test este suficientă pentru a reproduce comportamentul aplicației.
- **Nu** lipim tokenuri, chei anon sau JWT în chat/repo/raport public.

---

## 3. Roluri test

| Alias | Rol | Scop în planul minimal |
|--------|-----|-------------------------|
| **user_a_seller** | **User A — Seller** | Listări proprii; oferte primite; încercări cross-owner pe editare și pe acțiuni ofertă |
| **user_b_buyer** | **User B — Buyer** | Oferte trimise către listări; vizibilitate oferte vs alți buyers |
| **user_c_random** | **User C — Random** | Utilizator autentificat **fără** relație cu artefactele țintă; verificări negative (opțional în extensie P0 dacă timpul permite) |
| **user_d_demand_owner** | **User D — Demand Owner** | Cereri `demands` ca `buyer_id`; oferte `demand_offers` primite; update cerere |
| **user_x_seller** | **User X — Alt vânzător** | Deține listare activă (și opțional pending) folosită ca țintă pentru teste **User A nu modifică listing User X** |
| **user_admin_hq** | **Admin / Owner produs** | HQ / Copilot (P2); **nu** înlocuiește testele anon sau A/B/D |

**Notă:** nu includem adrese de email reale în acest document.

---

## 4. Date test necesare

Pregătite **înainte** de execuție (staging sau mediu controlat); UUID-urile se notează doar în **registrul privat** al echipei și în **raportul live**, nu aici.

| Artefact | Descriere |
|----------|-----------|
| **Listing activ User A** | `status = active`, vizibil public conform produsului |
| **Listing pending_payment User A** | Pentru P1-1 (vizibilitate publică / URL direct) |
| **Listing activ User X** | Alt vânzător; folosit la P0-1, P0-2, P0-4 |
| **Listing pending_payment User X** | Opțional, dacă fluxul permite — paralel P1-1 |
| **listing_offers: User B → listing User A** | Ofertă validă pe anunț activ A |
| **listing_offers: alt buyer → același listing User A** | Al doilea rând (alt cont sau același B — după regulile produsului); necesar pentru P0-3 |
| **Demand activ User D** | `status = active`, vizibil în flux public (ex. capital) dacă produsul o cere |
| **Demand pending_payment User D** | Pentru P1-2 și consistență cu audit static |
| **Demand activ alt user** | Proprietar ≠ D; pentru P0-5, P0-6 |
| **demand_offer către cererea lui D** | Seller (ex. User A sau B) trimite ofertă pe cererea lui D |
| **demand_offer către cererea altui owner** | Ofertă pe `demand_id` care nu aparține lui D — pentru verificare că D **nu** o vede în dashboard |
| **Imagine listare User A** | Fișier în Storage sub path-ul lui A — P1-3/P1-4 |
| **Imagine demand_offer** | URL(uri) salvate în `demand_offers.images` — P1-7 |

---

## 5. Teste live P0 — Critical

| ID | Test | Rol | Pași | Rezultat așteptat | PASS/FAIL | Note |
|----|------|-----|------|-------------------|-----------|------|
| **P0-1** | User A nu poate deschide `/editeaza-anunt/[id]` pentru listing User X | **User A** | Login A; navigare la URL editare cu `id` = listare activă **User X** | Pagină goală / eroare / redirect; **fără** formular populat cu datele listării X; în Network, `SELECT` pe `listings` fără rând sau eroare RLS | | Dacă formularul se încarcă → **FAIL Critical** |
| **P0-2** | User A nu poate modifica listing User X | **User A** | După P0-1: dacă UI permite salvare, încercare `UPDATE`; altfel PostgREST/REST din client cu token A | **UPDATE** respins; niciun câmp modificat în DB pentru listarea X | | Confirmare în Table Editor sau re-fetch |
| **P0-3** | User B nu vede `listing_offers` ale altor buyers | **User B** | Login B; dashboard tab oferte trimise / secțiuni relevante; opțional Network la `listing_offers` | B vede **doar** rândurile cu `buyer_user_id = B`; **zero** rânduri cu alt `buyer_user_id` pe același `listing_id` | | Depinde de RLS + UI |
| **P0-4** | User A nu poate accepta/refuza oferta de pe listing User X | **User A** | Identifică `offer_id` pe listare X (din cont X sau SQL intern echitabil); login A; încercare acțiune sau `PATCH`/`update` prin client | **UPDATE** respins; status ofertă neschimbat | | Poate necesita reproducere manuală cu DevTools |
| **P0-5** | User D nu vede `demand_offers` de pe cererea altui owner | **User D** | Login D; dashboard; inspectare Network pentru `demand_offers` | Doar oferte cu `demand_id` ∈ cererile cu `buyer_id = D` | | |
| **P0-6** | User D nu poate modifica `demands` ale altui user | **User D** | Obține `id` cerere alt user (din registru intern); încercare `toggleDemandStatus` / `markDemandAsResolved` din UI dacă expus, sau update echivalent prin client | **UPDATE** respins | | |
| **P0-7** | User normal nu poate `UPDATE profiles.kyc_status` | **User A** sau **B** | Supabase SQL Editor cu rol **authenticated** al userului (sau client): `UPDATE profiles SET kyc_status = 'verified' WHERE id = auth.uid()` | Eroare policy / 0 rows affected conform politicii | | Nu folosi service role în browser |
| **P0-8** | Public anon nu poate citi `listing_offers` | **Anon** | Fereastră privată; fără login; PostgREST `listing_offers?select=id&limit=1` cu **cheie anon** din proiect (Dashboard / client izolat) | 0 rânduri sau eroare RLS | | Fără lipire cheie în raport public |
| **P0-9** | Public anon nu poate citi `demand_offers` | **Anon** | Idem pentru `demand_offers` | 0 rânduri sau eroare RLS | | |
| **P0-10** | Public anon nu poate lista `profiles` | **Anon** | `profiles?select=id&limit=5` cu cheie anon | 0 rânduri sau eroare RLS | | |

*(Coloanele PASS/FAIL/Note se completează la execuție în raportul live.)*

---

## 6. Teste live P1 — High

| ID | Test | Rol | Pași | Rezultat așteptat | PASS/FAIL | Note |
|----|------|-----|------|-------------------|-----------|------|
| **P1-1** | `pending_payment` listing nu apare public | **Anon** | GET `/anunt/[id]` pentru ID listare **pending_payment** User A; homepage/categorii/sitemap dacă aplicabil | 404 / indisponibil / fără date complete; **nu** în liste publice | | Aliniat cu plan execuție 1.3 |
| **P1-2** | `pending_payment` demand nu apare public | **Anon** | `/capital-disponibil`, homepage; căutare ID cerere pending în Network | Cererea pending **absentă** din payload-uri publice | | |
| **P1-3** | User nu poate upload în Storage path alt user | **User A** | Încercare `storage.upload` cu path prefix `user_x_uuid/...` din consolă sau instrument controlat | Eroare policy | | Staging only |
| **P1-4** | User nu poate delete/overwrite imagine alt user | **User A** | Dacă există API/UI delete: încercare pe obiect din folder B; altfel `upload` același path ca B (dacă policy permite detectarea) | Refuz policy | | Dacă nu există delete în app — notă N/A + policy-only |
| **P1-5** | `checkout-demand` nu permite scenariu abuziv fără plată reală, dacă e testabil | **User B** (sau cont fără ownership) | **Fără plată reală:** observare că ruta `POST /api/checkout-demand` acceptă `demandId` fără sesiune; încercare cu `demandId` al lui D din sesiune neautentificată sau user neowner | Documentare comportament; ideal: **401/403** sau refuz când se adaugă guard — până atunci **BLOCKED** sau **FAIL documentat** după criterii produs | | Dacă nu e testabil fără Stripe — marcat **BLOCKED** cu motiv |
| **P1-6** | `trimite-oferta` (demand) nu permite ofertă pe demand inactive/pending | **User A** sau **B** | Deschidere `/trimite-oferta/[id]` pentru ID cerere **pending_payment** sau **suspended** (dacă există în staging) | Formular indisponibil / fără date / insert respins | | Depinde de date test |
| **P1-7** | `demand_offers` images — privacy decisă și testată | **Anon** + **User D** | Copiere URL din `images` din DB sau dashboard; deschidere în fereastră privată | Conform **deciziei produs** (public acceptat vs trebuie refuz anon) | | Înregistrați decizia în decision log 7A.11 §11 |

---

## 7. Teste live P2 — Medium

| ID | Test | Rol | Pași | Rezultat așteptat | PASS/FAIL | Note |
|----|------|-----|------|-------------------|-----------|------|
| **P2-1** | Network dashboard — coloane sensibile | **User A** / **D** | DevTools → filtre pe `phone`, `email`, `stripe`, `session` în JSON `listings`, `profiles`, oferte | Doar coloane necesare UI; fără surprize vs politica minimă | | Legat de `select('*')` static |
| **P2-2** | Contact seller/buyer doar după relație / ofertă acceptată | **User A**, **B**, **D** | Parcurgere flux accept ofertă; verificare când apare telefon/email | Conform **politicii produsului** documentate | | |
| **P2-3** | Descriere demand fără PII în datele publice de test | **User D** | Cerere activă cu descriere de test **fără** email/telefon real; verificare `/capital-disponibil` | Doar textul de test; fără PII introdusă intenționat | | Test de proces, nu scanner automat obligatoriu |
| **P2-4** | Copilot snapshot — PII minim | **user_admin_hq** | Trigger Copilot în staging; revizuire proxy/log intern a corpului trimis către model | Fără câmpuri neagreate; respectă checklist HQ | | Fără lipire conținut în repo |
| **P2-5** | Analytics nu primește email/telefon/mesaje | **Orice** | DevTools → filtre pe evenimente analytics (dacă vizibile) | Parametrii fără PII sensibil | | Confirmare încrucișată cu 7A.6 P9 |

---

## 8. Metodă de execuție

| Literă | Metodă |
|--------|--------|
| **A** | Test în **aplicație** cu browser normal (autentificat) și **incognito** (anon unde e cazul). |
| **B** | **Network tab** (DevTools): filtrare după `rest/v1/` sau host Supabase; inspectare status HTTP și corp JSON (fără a copia tokenuri în rapoarte publice). |
| **C** | **Supabase Dashboard** — Table editor / SQL ca rol controlat (anon sau authenticated) pentru confirmare rânduri și policies, conform procedurii echipei. |
| **D** | **Fără service role** în browser; service role doar pe server este în afara scope-ului testerului în UI. |
| **E** | La **FAIL**: captură de ecran și note în **spațiu intern** (drive/ticket privat); în raportul repo folosiți descriere text + severitate + link intern, **fără** PII și **fără** tokenuri. |

---

## 9. Format raport live

**Fișier viitor (nu se creează în sprintul 7A.12):** `docs/internal/rls-live-minimal-test-report.md`

**Structură recomandată** (tabel principal):

| Test ID | Rol | Așteptat | Observat | PASS/FAIL/BLOCKED | Severitate | Link/screenshot intern | Acțiune |
|---------|-----|----------|----------|-------------------|------------|-------------------------|---------|
| *ex. P0-1* | *User A* | *…* | *…* | *…* | *Critical/High/Medium/Low* | *URL ticket intern* | *ex. Sprint hardening RLS listings* |

**Secțiuni suplimentare recomandate în raport:** mediu (staging/prod), dată, executori, versiune commit, rezumat Critical/High, lista BLOCKED cu motiv, semnături/approvals interne.

---

## 10. Exit criteria

### Beta controlat poate continua dacă:

- **Nu** există **FAIL Critical** pe P0 (cross-owner read/write, anon enumerate tabele sensibile).
- Orice **FAIL High** este **documentat**, are **owner**, și există **workaround** operațional aprobat (ex. dezactivare temporară funcție) până la fix.

### Beta larg poate începe doar dacă:

- **Toate P0** sunt **PASS** (sau **BLOCKED** doar cu înlocuitor echivalent aprobat de echipă — ex. confirmare SQL echivalentă în Dashboard).
- **Toate P1** critice pentru **privacy** (P1-1, P1-2, P1-7 minimum; P1-3/P1-4 pentru Storage) sunt **PASS** sau **remediate** și retestate.
- **Storage** și **oferte** (`listing_offers`, `demand_offers`) sunt validate în scenarii reale.
- **noindex** pentru zone private (dashboard/HQ/edit) rămâne **PASS** conform verificării din audit static + spot check live.

---

## 11. Ce facem dacă pică un test

1. **Oprim** execuția pe **zona** respectivă (nu continuăm scenarii dependente până la clarificare).
2. **Nu** patch-uim RLS sau codul **în aceeași sesiune** fără sprint planificat (conform regulilor din §2).
3. **Clasificăm** severitatea: **Critical** (date alt user accesibile / modificabile), **High** (anon citește tabele sensibile), **Medium/Low** (PII produs, UX, minimizare coloane).
4. Deschidem **sprint separat** de **hardening** (obiectiv: RLS + eventual guards client/server din `rls-static-audit-summary.md` §8).
5. **Retestăm** doar zona afectată + regresie scurtă pe P0 înrudite.

---

## 12. Recomandare de ordine live

1. **Public anon:** P0-8, P0-9, P0-10 (bază pentru tot restul).  
2. **User A Seller:** P0-1, P0-2, P0-4.  
3. **User B Buyer:** P0-3.  
4. **User D Demand Owner:** P0-5, P0-6.  
5. **Profiles:** P0-7.  
6. **Storage:** P1-3, P1-4.  
7. **pending_payment:** P1-1, P1-2.  
8. **P2** privacy / Network / Copilot / analytics: P2-1 → P2-5 (în paralel după P0 sau în zi separată).  
9. **P1** rămase: P1-5, P1-6, P1-7 după ce există decizie produs pentru P1-7 și date pentru P1-6.

**Opțional:** **User C** pentru încercări negative suplimentare (acces la ID-uri cunoscute fără relație) — extinde acoperirea fără a fi strict necesar pentru matricea minimală P0.

---

## 13. Verdict

Acest plan permite **testare live controlată** fără modificări inițiale la RLS, cod sau infrastructură de plată. După execuție și completarea viitorului `rls-live-minimal-test-report.md`, echipa decide: **sprint hardening** (dacă apar Critical/High) sau **continuare** către **performance** și închiderea punctelor din **decision log** (imagini ofertă, `checkout-demand`, Copilot).

---

*Sprint **7A.12** — document-only; execuția testelor nu face parte din acest sprint.*
