# Quick Exit — AI Roles Boundary

Document intern. Definește **delimitarea rolurilor** între **HQ Copilot** (Gemini, în aplicație) și **Quick Exit Operator** (OpenClaw / flux pe data pack & Daily Brief), ca să evităm suprapunerea, confuzia în echipă și riscuri operaționale.

Documente conexe: `docs/internal/quick-exit-operator-spec.md`, `docs/internal/operator-brief-procedure.md`, `docs/internal/operator-manual-export-format.md`.

---

## 1. Scop

Acest document stabilește **ce face fiecare** modul AI intern, **ce date poate atinge conceptual**, **ce formă are outputul** și **cum coexistă** fără a canibaliza același „asistent general”.

Scopul nu este să interzică unul dintre ele, ci să păstrăm **o singură sursă de adevăr** per tip de nevoie: **insight rapid** vs **plan operațional persistent**.

---

## 2. Principiul central

**Formulă de lucru:**

- **HQ Copilot** = **analiză live / insight** (snapshot de moment, în browser, pe buton).
- **Quick Exit Operator** = **brief operațional / task workflow** (artefacte Markdown, data pack curat, listă de taskuri).

**Sau, pe scurt:**

- **Copilot answers** (întrebari implicite: „ce se întâmplă azi?”, „unde e riscul?”, „ce creștere?”.
- **Operator organizes work** (ce urmează să facă omul, cu ID-uri pseudonimizate și statusuri).

Ambele sunt **read-only** în sensul că **nu execută** acțiuni în producție; diferența este **contextul datelor** și **forma livrabila**.

---

## 3. HQ Copilot — rol

**Unde rulează:** tab-ul **HQ Copilot** din **`/hq-admin`**, prin apel **`POST /api/hq/copilot`**.

**Motor:** **Gemini** (modele configurabile server-side), cu snapshot operațional construit server-side.

**Ce face:**

- Analizează un **snapshot intern** (listări, cereri, oferte, profiluri, rapoarte evaluare, riscuri generate, rezolvări recente) și, opțional, **Google Analytics** dacă este configurat.
- Oferă insight **rapid** pe **moduri**: `daily`, `risk`, `priorities`, `growth`, plus `selftest` (diagostic Gemini + GA).
- Este potrivit pentru **explorare**, **înțelegere rapidă** și **sesiuni ad-hoc** în timpul lucrului în HQ Admin.

**Are voie (în sens produs / UX):**

- Să analizeze datele incluse în snapshot-ul agreat de rută.
- Să sumarizeze riscuri, oportunități, priorități.
- Să formuleze **recomandări** și **acțiuni recomandate** în JSON pentru UI (rezumat, riscuri critice, oportunități, acțiuni cu impact/efort/urgență, notă fondator).

**Nu are voie (conform intenției produs și a constrângerilor tehnice actuale):**

- Să **modifice DB** din fluxul Copilot (ruta nu scrie date operaționale).
- Să **trimită mesaje** utilizatorilor.
- Să **aprobe KYC**.
- Să **modifice Stripe** sau să inițieze plăți/refunduri.
- Să **execute acțiuni automate** în numele platformei.

*(Acțiunile de moderare din alte părți ale paginii HQ Admin — ex. activare manuală listare — sunt **separate** de Copilot și rămân umane.)*

---

## 4. Quick Exit Operator — rol

**Unde „trăiește”:** flux documentat — **data pack** manual validat → **Daily Brief** Markdown → **review owner** (OpenClaw sau alt instrument citește **fișiere**, nu DB live).

**Ce face:**

- Transformă **date curățate / pseudonimizate** într-un **brief operațional**.
- Propune **taskuri** cu statusuri (**Propus** / **Aprobat** etc.).
- Generează **drafturi** pentru follow-up, **numai** pentru aprobare manuală.
- Clasifică feedback și pregătește **urgență operațională** fără a fi „chat general”.

**Are voie:**

- Să transforme datele permise din **`operator-manual-export-format.md`** în brief.
- Să propună taskuri și să le **tie** de **referințe pseudonimizate** (`listing_*`, `demand_*`, …).
- Să genereze drafturi text pentru **owner**, nu mesaje trimise automat.

**Nu are voie:**

- Să aibă **acces live la DB**, **service role**, sau pipeline echivalent în mediul agentului.
- Să **atingă Stripe**, webhook, checkout.
- Să **trimită mesaje**, să **modifice statusuri**, să **ruleze acțiuni automate**.

---

## 5. Diferență practică

| Dimensiune | HQ Copilot | Quick Exit Operator |
|------------|------------|---------------------|
| **Scop** | Insight strategic și operațional **în momentul rulării** | **Plan de lucru** și **artefact persistent** (brief + taskuri) |
| **Date** | Snapshot **server-side** (include agregate recente, GA dacă e cazul); **nu** este același lucru cu „export manual curat” pentru OpenClaw | **Data pack** validat, **minimizat**, conform **`operator-manual-export-format.md`** |
| **Output** | JSON structurat în UI: rezumat, riscuri, oportunități, acțiuni recomandate, notă fondator | **Markdown** Daily Brief + tabel taskuri + drafturi (în fișier / folder intern) |
| **Timp** | Minute (sesiune live) | Zile / sprint (brief datat, poate fi arhivat) |
| **Utilizator** | Doar **admin** autentificat în HQ | **Owner/admin** care controlează **repo** / fișiere interne; fără UX public |
| **Stil** | Exploratoriu, **rapid**, „ce zice modelul pe snapshot acum?” | **Task-oriented**, repetabil, **workflow** |
| **Risc** | Prompt mare cu snapshot; protecții în prompt (ex. fără PII în răspuns); acces API protejat | Risc redus **dacă** data pack-ul respectă checklist-ul; **fără** conectare live |
| **Persistență** | Rezultatul în sesiunea UI (nu este în sine „sistem de ticketing”) | **Brief** poate fi **versionat** (`operator-briefs/YYYY-MM-DD.md`) |
| **Human approval** | Owner citește și decide; **nu** există flux formal de task în Copilot | **Obigatoriu** pentru orice execuție (**operator-brief-procedure.md**) |
| **Integrare viitoare** | Poate alimenta **idei** pentru Operator | Poate **afișa** brief-uri sau primi **insight exportat** din Copilot (vezi secțiunea 9) |

**Exemplu Copilot (tip):** „Există risc ridicat de încredere pe listări de valoare mare cu profil KYC nefinalizat (din snapshot).”

**Exemplu Operator (tip):** „**Task propus:** verifică manual `listing_a1b2c3d4`, prioritate mare, owner — după aprobare în dashboard.”

---

## 6. Zone de suprapunere

| Zonă | Comportament recomandat |
|------|-------------------------|
| **Risk scan** | **Copilot** generează **insight** și liste de riscuri în sesiune. **Operator** poate transforma același tip de observație în **taskuri numerotate** și **prioritate**, pe baza **data pack**-ului, nu neapărat copiat verbatim din Copilot. |
| **Priorities** | Copilot: **„top mâine”** narativ. Operator: **task list** cu status și owner. |
| **Growth** | Copilot: idei și oportunități. Operator: **oportunități revenue** + **follow-up draft** (manual). |
| **Daily summary** | Copilot: **„Analizează ziua”** pe snapshot live. Operator: **Daily Brief** pe export **curățat** — pot diferi dacă exportul e mai strict decât snapshot-ul. |
| **Follow-up suggestions** | Copilot poate sugera în text **acțiuni recomandate**. Operator produce **drafturi** în brief — **regula:** sursa operațională de „ce trimitem după aprobare” este **brief-ul**, nu re-rularea Copilot. |

**Regulă unitară:** Copilot poate genera **insight**. Operator transformă (când e cazul) insight-ul în **taskuri** și **artefacte** cu **granulație operațională**.

---

## 7. Reguli anti-canibalizare

1. **Nu construim două chat-uri AI generale** în HQ pentru aceeași întrebare („ce fac azi?”).
2. **Operatorul** nu răspunde **liber** pe **DB live** — lucrează pe **fișiere**.
3. **Copilot** nu devine **task manager** persistent; nu înlocuiește brief-ul și lista de taskuri din Operator.
4. **Operatorul** nu înlocuiește **Copilotul** pentru **snapshot + GA** în timp real.
5. **Brief-ul Operator** trebuie să fie **persistent** și **orientat pe task**.
6. **Copilot** poate rămâne **exploratoriu** și **rapid**.
7. **Orice acțiune** în producție rămâne **human-approved** și **manuală**.

---

## 8. Workflow recomandat

1. **HQ Copilot** rulează în sesiune (mod la alegere) și produce **insight** pe snapshot.  
2. **Owner** decide dacă merită **operaționalizat** (trecut în lucru structurat).  
3. Se pregătește **data pack** curat (manual), conform **`operator-manual-export-format.md`**.  
4. **Operator** (proces + eventual OpenClaw pe fișiere) generează **Daily Brief**.  
5. **Owner** **aprobă** / **respinge** taskurile.  
6. **Owner** **execută manual** în sistemele oficiale.  
7. Taskurile și brief-urile pot fi **arhivate** în `docs/internal/operator-briefs/` (fără PII).

---

## 9. Integrare viitoare fără dublare

*(Propuneri de produs — **fără implementare** în acest document.)*

- Buton în zona Copilot: **„Salvează ca insight pentru Operator”** → export text minim / notă care intră în **`notes.md`** al data pack-ului.  
- **Operator Brief Viewer** read-only în HQ Admin — citește **fișiere** sau artefact generat, **nu** DB.  
- **Task list** intern generată din secțiunea de taskuri a brief-ului (afișare statică).  
- **Fără** agent live cu **write access**.

---

## 10. Decizii de produs

- **HQ Copilot** rămâne **analiza live** (snapshot + opțional GA) în HQ Admin.  
- **Quick Exit Operator** devine **workflow operațional** pe **artefacte** și **taskuri**.  
- **OpenClaw** **nu** primește acces direct la **DB** / **Stripe**.  
- Dacă există **conflict** de interpretare între insight-ul Copilot și brief-ul Operator:  
  - **Copilot** = sursa de **insight** pe datele din momentul rulării;  
  - **Operator** = sursa de **task workflow** și **prioritate operațională** pentru următoarele acțiuni umane;  
  - reconcilierea este **decizia ownerului**.  
- **Daily Brief** este **artefactul persistent** al drumului Operator.

---

## 11. Ce NU facem

- Nu conectăm **OpenClaw** la **același** tip de acces **service role** ca rutarea Copilot doar „pentru comoditate”.  
- Nu duplicăm **tab Copilot** cu un al doilea panou AI identic.  
- Nu facem **două butoane** „Analizează tot” cu mesaje similare care concurează.  
- Nu lăsăm **ambele** să emită **recomandări operaționale concurente** fără regula din secțiunea 6.  
- Nu punem acest AI în **UX public**.  
- Nu facem **acțiuni automate** din oricare dintre ele.

---

## 12. Verdict

**Nu** există problemă structurală dacă rolurile sunt **delimitate** ca mai sus: **Copilot = insight**, **Operator = execution planning** pe date curate.

**Există risc real** dacă ambele devin **„asistent general”** pentru aceeași întrebare, sau dacă OpenClaw primește **același volum de acces** ca serverul Copilot.

Pentru Quick Exit, direcția recomandată rămâne:

- **HQ Copilot** — viteză și lățime de context în HQ.  
- **Quick Exit Operator** — **brief**, **taskuri**, **disciplină** și **siguranță** pe **fișiere**.

---

*Document sprint 6B.7 — delimitare roluri AI interne.*
