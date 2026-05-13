# Quick Exit — RLS / Privacy Execution Plan

## 1. Scop

Acest plan definește **cum** se verifică manual politicile **RLS** (Row Level Security) și expunerea de date în **Supabase** și în aplicație, **fără modificări inițiale** la politici, fără migrații și fără alterări de schema.

Complementează documentul `docs/internal/rls-privacy-checklist.md` (ce trebuie verificat) cu **pași operaționali** (cine, cu ce date, în ce ordine, cum se notează rezultatul).

---

## 2. Reguli de execuție

- **Nu** modificăm RLS sau politici Storage **în timpul** sesiunii de test (doar observăm și notăm).
- **Nu** rulăm migrații SQL care schimbă policies în același sprint cu testul inițial.
- **Nu** ștergem date de producție; folosim **proiect staging** sau **date test** create explicit.
- Folosim **conturi test** dedicate (aliasuri: `user_a_seller`, etc. — fără emailuri reale în acest document).
- **Notăm** fiecare rezultat în tabelul din §14 (sau într-o foaie echivalentă).
- Dacă un test **pică**, documentăm severitatea și **oprim** execuția pe ramura critică până la decizie; **nu** patch-uim RLS „din mers” în aceeași sesiune fără sprint planificat.
- **Nu** folosim date reale sensibile (CNP, conturi bancare complete, conversații private) în scenarii de test.
- **Nu** publicăm tokenuri (JWT, service role, anon key) în chat, repo sau capturi de ecran nestocate.
- **Nu** comitem în repo exporturi CSV/SQL live din producție.

---

## 3. Conturi test necesare

Pregătește în **Authentication** (sau prin fluxul app) utilizatori separați. În tabelele de mai jos folosește **ID-urile UUID** reale din proiectul tău de test, dar nu le lipi în acest document — păstrează-le într-un fișier local privat (ex. spreadsheet intern, acces restricționat).

### User A — Seller (`user_a_seller`)

**Scop:**

- creează cel puțin un listing **activ** și unul **pending_payment** (dacă fluxul permite în staging);
- primește oferte de la User B (și opțional de la alt buyer);
- confirmă că vede **doar** ofertele primite pe **listările sale**.

### User B — Buyer (`user_b_buyer`)

**Scop:**

- trimite **listing_offer** către un listing activ al lui User A;
- confirmă că vede **doar** oferta proprie;
- confirmă că **nu** vede ofertele altor buyers pe același listing.

### User C — Random user (`user_c_random`)

**Scop:**

- utilizator autentificat **fără** relație cu listing-urile/demands-urile țintă;
- confirmă că **nu** citește oferte care nu îi aparțin;
- confirmă că **nu** poate lista în masă `profiles` sau date administrative.

### User D — Demand owner (`user_d_demand_owner`)

**Scop:**

- creează cerere (**demand**) activă și, dacă e posibil, una **pending_payment**;
- primește **demand_offer** (ex. de la User A ca seller pe cerere);
- confirmă că vede **doar** ofertele pe **cererea sa**.

### Admin / Owner produs (`user_admin_hq`)

**Scop:**

- verifică acces **HQ** separat (conform allowlist din aplicație);
- **nu** se folosește cont anon sau User C pentru a pretinde acces la date admin;
- validare că datele HQ nu sunt accesibile conturilor normale.

**Important:** nu include adrese de email reale în acest document; maparea alias → cont se ține în **registrul intern** al echipei.

---

## 4. Date test necesare

Înainte de execuție, asigură-te că există (sau creezi în staging):

| Artefact | Descriere |
|----------|-----------|
| Listing activ | User A, `status = active`, vizibil public conform produsului |
| Listing pending_payment | User A, pentru test leak public |
| Listing sold / expired | Opțional, dacă există în DB — pentru politică URL direct vs listă |
| Demand activ | User D, vizibil în fluxul public (ex. capital disponibil) dacă produsul cere |
| Demand pending_payment | User D, pentru test leak public |
| listing_offer (B → A) | Ofertă de la User B pe listing activ User A |
| listing_offer (alt buyer) | A doua ofertă pe același listing (alt user sau același B — după regulile produsului) |
| demand_offer (A → D) | Ofertă de la un seller (ex. User A) pe cererea lui D |
| Profiluri A, B, C, D | Rânduri în `profiles` asociate conturilor |
| Imagine listing | Fișier în bucket `listings` sub path-ul lui A |
| Imagine demand_offer | Dacă fluxul permite — pentru test acces public la URL |

**Notă:** ID-urile concrete (UUID listing, demand, offer) se notează doar în **raportul de execuție** privat, nu în repo.

---

## 5. Metode de testare

### A. Supabase Dashboard / SQL Editor (roluri simulate)

| | |
|--|--|
| **Avantaj** | Reproducibil; poți formula `SELECT` exact ca în politici; vizualizezi erori RLS. |
| **Limită** | Unele proiecte nu permit „run as user” simplu; trebuie JWT sau `set request.jwt.claims` conform doc Supabase. |
| **Când** | Verificări fine pe un rând cunoscut (`WHERE id = …`), audit policies din UI. |

### B. Client Supabase cu cheie anon + JWT utilizator test

| | |
|--|--|
| **Avantaj** | Reproduci exact comportamentul aplicației (aceeași cheie ca în browser). |
| **Limită** | Necesită script local sau REPL; risc de a lăsa token în istoric — curăță după test. |
| **Când** | După ce conturile test sunt stabile; pentru teste repetabile automate (viitor). |

### C. Test manual în aplicație + Network (DevTools)

| | | |
|--|--|--|
| **Avantaj** | Reflectă UX real; vezi răspunsurile JSON returnate de PostgREST. |
| **Limită** | Mai greu de sistematizat; trebuie să copiezi răspunsuri cu grijă (fără PII în tickete publice). |
| **Când** | **Recomandat pentru început** împreună cu Dashboard (§2 din checklist). |

**Recomandare pentru echipă:** începe cu **C + Dashboard**; fără scripturi noi în repo în acest sprint.

---

## 6. Test Set 1 — Public anon

| # | Test | Pași | Rezultat așteptat | Rezultat observat | PASS/FAIL | Note |
|---|------|------|-------------------|-------------------|-----------|------|
| 1.1 | Homepage anon | Deschide `/` în fereastră privată, fără login. | Pagina se încarcă; apar doar listări/cereri permise de produs (ex. active). | | | |
| 1.2 | Listing activ | Deschide URL `/anunt/[id]` pentru ID-ul listingului activ al lui A. | Detalii publice; fără date interne seller neintenționate. | | | |
| 1.3 | Listing pending_payment | Încearcă același URL cu ID listing `pending_payment` (din registrul privat). | 404 sau mesaj „indisponibil”; **fără** JSON cu detalii complete în Network. | | | |
| 1.4 | Demand pending_payment | Navigare publică către cerere pending (dacă există URL public). | Inaccesibil sau fără date sensibile. | | | |
| 1.5 | Lista profiles | Din SQL Editor ca **anon** (sau client anon): `SELECT id FROM profiles LIMIT 5`. | 0 rânduri sau eroare policy. | | | |
| 1.6 | listing_offers | Client/SQL anon: `SELECT * FROM listing_offers LIMIT 1`. | 0 rânduri / refuz RLS. | | | |
| 1.7 | demand_offers | Idem pe `demand_offers`. | 0 rânduri / refuz RLS. | | | |
| 1.8 | Dashboard | Acces `/dashboard` fără login. | Redirect login sau shell fără date utilizator. | | | |
| 1.9 | Date contact | Inspectează răspunsurile REST pentru pagini publice. | Fără telefon/email seller în payload public (decât dacă produsul cere explicit). | | | |
| 1.10 | admin_risk_resolutions | Anon: `SELECT * FROM admin_risk_resolutions LIMIT 1`. | 0 rânduri / refuz. | | | |

---

## 7. Test Set 2 — User A Seller

| # | Test | Pași | Rezultat așteptat | Rezultat observat | PASS/FAIL | Note |
|---|------|------|-------------------|-------------------|-----------|------|
| 2.1 | Propriile listings | Login ca A; Dashboard sau query cu JWT A: `listings` where `user_id = A`. | Toate listările lui A returnate. | | | |
| 2.2 | pending_payment propriu | Deschide în app editare sau dashboard pentru listing pending al lui A. | A vede propriul rând; anon nu (retest 1.3). | | | |
| 2.3 | Editare listing B | Login ca A; încearcă `UPDATE` / UI pe listing cu `user_id = B`. | Refuz RLS / eroare UI. | | | |
| 2.4 | Oferte primite | Dashboard tab oferte sau query: oferte pentru `listing_id` ∈ listările lui A. | Doar ofertele asociate acelor listări. | | | |
| 2.5 | Oferte pe listing alt seller | Încearcă să citești oferte pentru `listing_id` al lui B (fără să fii owner). | 0 rânduri / refuz. | | | |
| 2.6 | Modificare ofertă alt user | Ca A, încearcă update pe `listing_offer` unde buyer ≠ A și listing nu e al lui A. | Refuz. | | | |
| 2.7 | kyc_status | Ca A, în Table Editor sau API: `UPDATE profiles SET kyc_status = 'verified' WHERE id = A`. | Refuz sau ignorat conform policy. | | | |
| 2.8 | Câmpuri admin | Ca A, încearcă setare rol admin / flag intern dacă există coloană. | Refuz. | | | |
| 2.9 | Upload în path propriu | `pune-anunt`: încarcă imagine; verifică path `A_uuid/...`. | Succes în prefixul lui A. | | | |
| 2.10 | Suprascriere path B | Ca A, încearcă upload/citire cu path `B_uuid/fisier.jpg` (manual sau API). | Refuz Storage policy. | | | |

---

## 8. Test Set 3 — User B Buyer

| # | Test | Pași | Rezultat așteptat | Rezultat observat | PASS/FAIL | Note |
|---|------|------|-------------------|-------------------|-----------|------|
| 3.1 | Trimite ofertă | Login B; `/trimite-oferta/[id]` pe listing activ A; trimite ofertă validă. | Insert reușit; apare în dashboard B. | | | |
| 3.2 | Vede oferta proprie | Dashboard B sau `SELECT` cu JWT B. | Vede doar rândurile cu `buyer_id = B`. | | | |
| 3.3 | Oferte alți buyers | Ca B, query oferte pentru același `listing_id` unde buyer ≠ B. | 0 rânduri (sau doar propriul rând, conform policy). | | | |
| 3.4 | Acțiune seller | Ca B, încearcă accept/respinge ofertă ca și cum ar fi seller (dacă UI există). | Refuz sau absent. | | | |
| 3.5 | Date seller | Răspuns JSON ofertă / listing: verifică leak telefon seller neintenționat. | Doar câmpuri permise. | | | |
| 3.6 | Modificare listing A | Ca B, update pe `listings` unde owner = A. | Refuz RLS. | | | |
| 3.7 | demand_offers străine | Ca B, `SELECT` pe `demand_offers` fără legătură cu B. | 0 rânduri. | | | |

---

## 9. Test Set 4 — Demand owner (User D)

| # | Test | Pași | Rezultat așteptat | Rezultat observat | PASS/FAIL | Note |
|---|------|------|-------------------|-------------------|-----------|------|
| 4.1 | Propria cerere | Login D; dashboard / capital — cererea activă. | Vede cererea cu `user_id = D`. | | | |
| 4.2 | pending_payment proprie | Listing cerere pending D în app. | D o vede; anon nu (retest paralel). | | | |
| 4.3 | Oferte primite | Oferte pe `demand_id` al lui D. | Doar aceste rânduri. | | | |
| 4.4 | Oferte pe cerere alt user | `demand_id` aparținând altui user. | 0 rânduri pentru D. | | | |
| 4.5 | Accept/refuz | Dacă există flow: D acceptă/respinge ofertă pe cererea sa. | Permis doar pe cereri proprii. | | | |
| 4.6 | Modificare demand altuia | Ca D, update pe demand cu owner ≠ D. | Refuz. | | | |

---

## 10. Test Set 5 — Profiles

| # | Test | Pași | Rezultat așteptat | Rezultat observat | PASS/FAIL | Note |
|---|------|------|-------------------|-------------------|-----------|------|
| 5.1 | Anon listă | Repetă 1.5. | Fără enumerare. | | | |
| 5.2 | Propriul profil | Login A; încarcă profil în app sau `SELECT` cu JWT pe `id = auth.uid()`. | Un rând, date permise. | | | |
| 5.3 | Profil alt user | Ca A, `SELECT * FROM profiles WHERE id = B`. | 0 rânduri sau coloane redacted. | | | |
| 5.4 | Trust public | Pagina anunț public: inspectează payload profil seller. | Doar minimul agreat (documentat produs). | | | |
| 5.5 | Update kyc_status | Ca A, update direct `kyc_status`. | Refuz. | | | |
| 5.6 | Update rol admin | Ca A, setare câmp admin dacă există. | Refuz. | | | |
| 5.7 | Sursă KYC | Confirmă în doc operațional: singura cale `verified` = webhook KYC server-side. | Aliniat cu codul `webhooks/kyc`. | | | |

---

## 11. Test Set 6 — Storage

| # | Test | Pași | Rezultat așteptat | Rezultat observat | PASS/FAIL | Note |
|---|------|------|-------------------|-------------------|-----------|------|
| 6.1 | Imagine listing activ | Deschide URL public imagine pentru listing activ. | Încarcă dacă politica e public read; altfel signed URL. | | | |
| 6.2 | Upload în folder alt user | Ca A, upload forțat cu path `B_uuid/...` (SDK sau REST). | Eroare policy. | | | |
| 6.3 | Delete imagine altuia | Ca A, delete pe obiect în `B_uuid/...`. | Refuz. | | | |
| 6.4 | Imagini demand_offer | URL imagine ofertă cerere: deschide în fereastră privată fără cookies. | Inaccesibil sau anonimizat dacă asta e politica. | | | |
| 6.5 | UI public | Pagini indexabile: sursa `<img>` nu expune token secret în query. | Doar URL-uri publice permise. | | | |
| 6.6 | Operator / docs | Confirmă că nu există path-uri live lipite în `docs/internal` pentru Operator. | Doar demo / placeholder. | | | |

---

## 12. Test Set 7 — Admin / HQ / Service role

| # | Test | Pași | Rezultat așteptat | Rezultat observat | PASS/FAIL | Note |
|---|------|------|-------------------|-------------------|-----------|------|
| 7.1 | Date HQ ca User C | Login C; deschide `/hq-admin` dacă URL e cunoscut. | Acces UI refuzat sau date goale; **plus** verifică Network pentru query-uri care nu returnează rânduri sensibile. | | | |
| 7.2 | admin_risk_resolutions | JWT User C: `SELECT` pe tabel. | 0 rânduri. | | | |
| 7.3 | Endpointuri service | Caută în cod (read-only) lista route-urilor cu service role; confirmă env doar server. | Chei doar pe server. | | | |
| 7.4 | Bundle client | Caută string `SERVICE_ROLE` în artefact build / surse publice. | Absent. | | | |
| 7.5 | HQ Copilot admin | Doar cont admin: POST `/api/hq/copilot` cu prompt de test. | 403 pentru non-admin. | | | |
| 7.6 | Snapshot PII | Inspectează (staging) body-ul trimis la Gemini sau log redactat. | Fără email/telefon integral în payload. | | | |
| 7.7 | Operator Brief | Deschide `/hq-admin/operator-brief`: confirmă sursa Markdown statică. | Nu citește tabele sensibile din DB pentru demo. | | | |

---

## 13. Test Set 8 — Analytics / AI privacy

| # | Test | Pași | Rezultat așteptat | Rezultat observat | PASS/FAIL | Note |
|---|------|------|-------------------|-------------------|-----------|------|
| 8.1 | trackEvent email | Network → request-uri `collect`/`gtag`: caută email în query params. | Absent. | | | |
| 8.2 | trackEvent telefon | Idem după număr de telefon test. | Absent. | | | |
| 8.3 | Mesaj ofertă | După trimitere ofertă: evenimente GA. | Fără body mesaj în params. | | | |
| 8.4 | Gemini payload | (Staging) log sau proxy intern: conținut trimis la Gemini. | Fără mesaje private integrale; dacă există → marchează **risc** în raport. | | | |
| 8.5 | Operator docs | Listează `docs/internal` pentru PII accidental. | Curat sau redactat. | | | |
| 8.6 | Brief-uri reale | Confirmă politica git: brief-uri cu date reale **nu** se comit. | Respectat. | | | |

---

## 14. Format de raportare rezultat

Folosește acest șablon pentru fiecare constatare (copy în spreadsheet intern):

| Test ID | Scenariu | User/Rol | Așteptat | Observat | PASS/FAIL | Severitate | Acțiune recomandată |
|---------|----------|----------|----------|----------|-----------|------------|---------------------|
| ex. 1.6 | SELECT listing_offers anon | anon | 0 rânduri | | | Critical / High / Medium / Low | Sprint fix RLS + retest |

**Severitate:**

- **Critical** — expunere publică oferte/profiles sau bypass auth la date sensibile.
- **High** — leak între utilizatori autentificați sau modificare neautorizată status/KYC.
- **Medium** — expunere coloane nefolosite în UI dar prezente în JSON.
- **Low** — duritate UX / mesaje eroare prea verbose.

**Regulă:** **Critical** și **High** deschise → **oprire beta larg** până la remediere și retest.

---

## 15. Ordinea recomandată de execuție

1. **Public anon** (Test Set 1) — filtru cel mai dur pentru leak-uri.
2. **Profiles** (Test Set 5) — baza pentru trust și PII.
3. **Listings / Demands — vizibilitate publică** (subset din 1 + 2.1–1.4 cross-check).
4. **listing_offers** (Set 2 + 3 combinat pe același listing test).
5. **demand_offers** (Set 4 + legături cu A/B).
6. **Storage** (Test Set 6).
7. **Dashboard User A / B / D** (flux app complet).
8. **Admin / HQ** (Test Set 7).
9. **Analytics / Gemini** (Test Set 8).
10. **Concluzie** — completează §17 și arhivează raportul cu dată + mediu (staging/prod).

---

## 16. Ce facem dacă un test pică

1. **Nu** aplicați patch RLS în aceeași zi fără **mini-sprint** (design policy + review + migrație pe staging).
2. Notați **Test ID**, observația exactă (fără PII în ticket public).
3. Clasificați **severitatea** (§14).
4. Deschideți item în backlog „RLS fix” cu link către acest plan și către checklist.
5. După fix, **retestați doar** ramura afectată + un **smoke** pe Set 1.
6. **Beta larg** rămâne blocat până la **PASS** pe toate Critical/High planificate pentru release.

---

## 17. Exit criteria

**Beta controlat** poate continua dacă:

- nu există **Critical** deschis din acest plan (sau sunt acceptate explicit cu compensații documentate);
- nu există expunere **publică** (anon) la `listing_offers` / `demand_offers` / enumerare `profiles`;
- `pending_payment` **nu** apare în surse publice (listări/cereri);
- utilizatorul **nu** poate modifica `kyc_status` prin client;
- **service role** nu apare în bundle client și nu e în variabile `NEXT_PUBLIC_*`.

**Beta larg** poate începe doar dacă:

- toate **Critical** / **High** din execuția RLS sunt **PASS**;
- **Stripe webhook** live a fost testat (sprint separat, nu acest document);
- copy **KYC / trust** este coerent cu ce permite RLS;
- performanța de bază este acceptabilă (conform obiectivelor produsului).

---

## 18. Verdict

Acest plan permite verificarea **RLS / privacy** **pas cu pas**, fără schimbări inițiale la politici. Execuția trebuie făcută **controlat**, cu **conturi test**, **date test** și **rezultate documentate** în formatul din §14.

După prima rundă completă, actualizați `rls-privacy-checklist.md` doar dacă descoperiți gap-uri de principii (într-un sprint de documentare), nu înlocuiți acest plan — păstrați-l ca **procedură de rulare**.
