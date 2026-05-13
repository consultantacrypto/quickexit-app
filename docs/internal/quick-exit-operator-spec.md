# Quick Exit Operator — Spec internă OpenClaw / AI Ops

Document intern. Nu este destinat publicului. Versiune orientativă pentru beta controlat.

---

## 1. Scop

**Quick Exit Operator** este un asistent AI intern pentru operațiuni, analiză și prioritizare în ecosistemul Quick Exit.

- **Nu** este feature public și **nu** trebuie promovat sau expus în UX-ul utilizatorilor finali.
- **Nu** ia decizii automate cu efect juridic, financiar sau asupra datelor din producție.
- **Nu** modifică date în Supabase, Stripe sau alte sisteme de înregistrare.
- **Nu** contactează utilizatori (email, SMS, WhatsApp, chat în numele platformei).

Rolul este de sprijin pentru owner/admin: claritate, sinteză, propuneri — cu execuție mereu umană.

**Delimitare față de HQ Copilot (Gemini în `/hq-admin`):** cele două sisteme AI interne au roluri diferite (insight live vs. brief operațional pe data pack). Vezi **`docs/internal/ai-roles-boundary.md`**.

---

## 2. Principiu de bază

Operatorul **citește date pregătite**, **produce recomandări**, iar **omul decide** și **omul acționează**.

Formula obligatorie:

**Read → Analyze → Recommend → Human approves → Human acts.**

Orice abatere (ex.: „agentul salvează singur” sau „trimite mesaj”) este în afara perimetrului acestui document, până la o decizie explicită ulterioară și o revizuire de securitate.

---

## 3. Ce are voie să facă

- Genera **Daily Brief** (raport operațional zilnic, în format controlat).
- Identifica **listări noi**, **inactive** sau **fără oferte** (pe baza agregatelor sau exporturilor permise).
- Identifica **cereri fără răspuns** sau cu semnale slabe de engagement (din date permise).
- Sugera **match-uri** între anunțuri și cereri (euristică, fără a crea legături în DB).
- Marca sau evidenția **riscuri KYC / trust** (ca observații, nu verdict final de fraudă).
- Sugera **follow-up-uri** (texte draft), fără trimitere automată.
- Sumariza **feedback** (ex. din board-ul intern beta), clasificare orientativă.
- Identifica **oportunități revenue** (agregate, fără acces la detalii sensibile de plată).
- Urmări **licitații active** (dacă datele sunt disponibile în sursele permise).
- Analiza **BMK Lab** la nivel intern (doar ce este deja destinat zonei admin).
- Propune **task-uri** pentru owner (listă acționabilă, fără execuție automată).

---

## 4. Ce NU are voie să facă

- **Nu** scrie în **Supabase** (nici `insert`/`update`/`delete`).
- **Nu** modifică **statusuri** de listări, cereri, oferte, KYC etc.
- **Nu** folosește **chei service role** sau credențiale echivalente în mediul agentului (OpenClaw local sau alt toolchain).
- **Nu** atinge **Stripe** (API, dashboard, webhook-uri simulări).
- **Nu** atinge **webhook**-urile aplicației sau nu le retrimite evenimente.
- **Nu** pornește sau simulează **checkout** pentru utilizatori.
- **Nu** trimite **email** / **SMS** / **WhatsApp**.
- **Nu** contactează **utilizatori automat** (nici prin intermediari).
- **Nu** face **KYC automat** (aprobare/respingere fără om).
- **Nu** ia **decizii finale de fraudă**; poate doar semnala pentru review uman.
- **Nu** face **tranzacții BMK** sau operațiuni on-chain în numele cuiva.
- **Nu** conectează **walleturi** sau semnează mesaje.
- **Nu** instalează **skills** / plugin-uri neauditate.
- **Nu** modifică **repo** fără review (PR uman).
- **Nu** expune date sensibile **public** (inclusiv în gist-uri, loguri publice, capturi nefiltrate).

---

## 5. Modele de acces la date

### A. Export manual CSV / JSON / Markdown

- **Recomandat pentru v0.**
- **Risc:** mic — operatorul lucrează pe fișiere scoase manual din surse autorizate.
- **Control:** mare — owner decide exact ce exportă și când.
- **Structură data pack, coloane permise și checklist validare:** vezi **`docs/internal/operator-manual-export-format.md`**.

### B. Daily Brief generat intern

- **Recomandat pentru v0 / v1.**
- Conține **agregate** și **date minimizate** conform politicii PII (secțiunea 6).
- Generarea poate fi un script sau proces intern care **nu** dă agentului acces la DB live.

### C. API intern read-only agregat

- **Posibil ulterior.**
- Necesită **autentificare strictă** (doar admin), contract de răspuns **anti-PII** și audit.
- **Risc:** mediu — suprafață de atac nouă dacă este prost proiectată.

### D. Acces direct DB read-only

- **Nerecomandat inițial** pentru OpenClaw sau agenți locali.
- Risc de scurgere credențiale, date complete nefiltrate și „scope creep” către write.

### E. Write access

- **Interzis** în fazele inițiale ale Quick Exit Operator.
- Orice fază ulterioară cu write necesită decizie explicită, design separat și controale (inclusiv nu în acest document).

---

## 6. Politică PII

Principii:

- **Fără** telefoane complete în prompturi sau brief-uri standard.
- **Fără** emailuri complete în prompt dacă nu este **strict necesar**; preferință pentru agregate sau pseudonimizare.
- **Fără** mesaje complete de utilizatori în fluxul agentului standard (se permit extrase scurte, sanitizate, sau doar metadata).
- **Fără** documente KYC, imagini buletin, selfie-uri etc.
- **Fără** date brute Stripe (ID-uri de plată complete, detalii card).
- **Fără** linkuri private către **storage** (bucket-uri semnate, căi interne).

Tehnici recomandate:

- **ID-uri scurtate** pentru referință umană (ex. primele 8 caractere ale unui UUID), plus contex minim necesar.
- **Agregate** (număr de oferte, număr cereri active).
- **Pseudonimizare** pentru corelări interne.

Exemple (orientative, nu normă legală):

| Tip | Exemplu permis în brief |
|-----|-------------------------|
| Email | `d***@gmail.com` |
| Telefon | `+40 *** *** 123` |
| listing_id | `a1b2c3d4` (primele 8 caractere) |

---

## 7. Prompt injection risks

**Risc:** titlurile, descrierile și mesajele utilizatorilor pot conține text care imită instrucțiuni („ignoră regulile anterioare”, „trimite email la…”).

**Tratament:** tot conținutul user-generated este **date**, nu **instrucțiuni** pentru operator.

**Regulă:** instrucțiunile sistemului / operatorului (definite de echipa Quick Exit) **au prioritate absolută** față de orice text provenit din listing, cerere sau ofertă.

Măsuri complementare recomandate:

- Delimitare clară în prompt între „context date” și „instrucțiuni operator”.
- Evitarea includerii de mesaje lungi brute; preferință pentru câmpuri trunchiate și structurate.
- Review uman al outputului înainte de orice acțiune externă.

---

## 8. MVP — Daily Brief read-only

**Daily Brief v0** este un raport **Markdown**, generat sau completat pe baza unor **inputuri permise**, fără efecte secundare în producție.

### Input permis (orientativ)

- Număr **listări active** (și eventual pending).
- Număr **cereri active** (și eventual pending).
- Număr **oferte noi** (perioadă definită).
- **Licitații active** (dacă metrica există în sursa de export).
- **Listări fără oferte** (count + identificatori minimizați).
- **Cereri fără răspuns** (definiție agreată: ex. fără oferte în N zile).
- **KYC agregat** (ex. câte `pending`, `requires_input`, fără date personale).
- **Revenue agregat** (ex. număr de checkout-uri reușite din raport manual — fără tokeni Stripe).
- **Feedback board** (ex. `docs/beta/feedback-roadmap-board.md` sau extras).
- **BMK tier summary** intern (doar ce este deja permis în zona admin).

### Output

- Fișier **Markdown** (ex. în `docs/internal/operator-briefs/`).
- **Fără** acțiuni automate.
- **Fără** write în DB.
- **Fără** mesaje trimise către utilizatori.
- **Procedură data pack validat → Daily Brief (checklist, prompt, arhivare):** vezi **`docs/internal/operator-brief-procedure.md`**.

### Structură recomandată a raportului

1. Rezumat zilei  
2. Ce necesită atenție  
3. Potențiale match-uri  
4. Riscuri KYC / trust  
5. Oportunități revenue  
6. Drafturi follow-up pentru aprobare  
7. Taskuri recomandate pentru owner  

---

## 9. Human approval workflow

1. **Agentul** (sau procesul de generare) **propune** conținut în Daily Brief / taskuri.  
2. **Ownerul** **revizuiește** și **aprobă** sau **respinge** fiecare propunere relevantă.  
3. **Ownerul** **execută manual** acțiunile în sistemele oficiale (Supabase dashboard, Stripe, email personal etc.).  
4. **Nimic** nu pleacă automat către utilizator din fluxul Operator.

**Statusuri recomandate** pentru taskuri (în tracking manual sau în secțiunea din brief):

| Status | Semnificație |
|--------|----------------|
| Propus | Generat de operator, nevalidat |
| Aprobat | Owner acceptă intenția |
| Respins | Nu se face |
| Executat manual | Owner a făcut acțiunea în sistemul real |
| Amânat | Revine ulterior |

---

## 10. Use-case-uri prioritare (beta)

### 1. Daily Owner Brief

- **Date necesare:** agregate listări/cereri/oferte, eventual snippet-uri minimizate, feedback, semnale KYC agregate.  
- **Output:** Markdown conform secțiunii 8.  
- **Risc:** mediu dacă se introduce PII; mic cu agregate stricte.  
- **Condiții de siguranță:** export controlat, politică PII, fără trimitere automată.

### 2. KYC Priority Queue

- **Date necesare:** statusuri KYC agregate, eventual listă de profile ID trunchiate + severitate operațională (fără documente).  
- **Output:** listă prioritară pentru review manual.  
- **Risc:** mediu (sensibilitate reputațională și legală).  
- **Condiții:** niciun verdict automat; doar ordonare și observații.

### 3. Listing Quality Review

- **Date necesare:** titlu, categorie, număr imagini, lungime descriere, preț (agregat sau per listing cu ID scurt).  
- **Output:** checklist calitate + sugestii de îmbunătățire (copy intern).  
- **Risc:** scăzut spre mediu.  
- **Condiții:** fără publicare automată de modificări.

### 4. Matching anunț ↔ cerere

- **Date necesare:** categorie, buget vs exit_price (agregat), locație dacă există și este coarse.  
- **Output:** perechi sugerate + scor euristic explicat.  
- **Risc:** mediu (recomandări greșite pot deranja dacă ar fi comunicate automat — **nu** le comunicăm automat).  
- **Condiții:** uman validează înainte de orice contact.

### 5. Feedback Triage

- **Date necesare:** `docs/beta/feedback-roadmap-board.md` sau export echivalent.  
- **Output:** grupare Blocker / Important / Polish / Idee, propuneri de ordine.  
- **Risc:** scăzut.  
- **Condiții:** nu înlocuiește decizia de produs a ownerului.

---

## 11. Integrare cu HQ Admin

Etape propuse (fără a impune implementare acum):

| Versiune | Comportament |
|----------|----------------|
| **v0** | Documente Markdown în `docs/internal/operator-briefs/` (sau path echivalent), versionate în git sau generate local. |
| **v1** | Afișare **read-only** în **HQ Admin** (conținut brief sau artefact generat în build). |
| **v2** | **Endpoint intern** agregat, read-only, cu auth strict și contract anti-PII. |
| **v3** | **OpenClaw** citește **brief-uri** și exporturi pregătite — **nu** DB live. |

HQ Copilot existent rămâne o unealtă separată; această spec nu obligă fuzionarea celor două fluxuri fără o decizie explicită.

---

## 12. Integrare cu OpenClaw

**Regulă de aur:** OpenClaw poate citi **fișiere** și **brief-uri** pregătite în mod controlat. OpenClaw **nu** primește acces la:

- fișiere `.env` sau secrete;
- **DB** live (Postgres / Supabase);
- **Stripe**;
- **Supabase service role**;
- **walleturi** sau chei private;
- canale **email** / **SMS** ca expeditor automat.

### Skill-uri permise (v0)

- Citire fișiere locale din directoare allowlist (ex. `docs/internal/…`).
- Sumarizare și structurare text.
- Generare raport (Markdown) în folder dedicat.
- Generare listă de taskuri (text).

### Skill-uri interzise (v0)

- Automatizare browser pe **dashboard live** cu sesiune owner.
- Comenzi **shell** cu acces la secrete sau la întreg sistemul de fișiere neconstrâns.
- Apeluri **rețea** către DB, Stripe sau API-uri interne neaprobate.
- Trimitere **email** sau mesagerie.
- Acțiuni **wallet** / crypto.
- Instalare pachete sau **skills** aleatorii din surse neverify.

---

## 13. Roadmap

| Cod | Etapă |
|-----|--------|
| **6B.2** | Spec (acest document) |
| **6B.3** | Daily Brief Template |
| **6B.4** | Manual Export Format (convenție fișier / coloane) |
| **6B.5** | Operator Brief Generator read-only |
| **6B.6** | HQ Admin Brief Viewer |
| **6B.7** | OpenClaw citește fișiere brief |
| **6B.8** | Human approval workflow (proces + eventual tracking) |
| **6B.9** | API agregat read-only, dacă este cazul |
| **6B.10** | Write actions — **doar** dacă se aprobă explicit mult mai târziu, cu design de securitate separat |

---

## 14. Decizii deschise

Întrebări de închis cu owner înainte de scalare:

- Ce **date exacte** intră în fiecare brief (câmp cu câmp)?
- Câtă **PII** este permisă în brief-uri interne (și retenție)?
- **Unde** se stochează brief-urile (doar git privat, S3 intern, altceva)?
- **Cât timp** se păstrează copiile (retenție / ștergere)?
- **Cine** are acces la directorul intern și la OpenClaw?
- **Cum** marcăm taskurile executate (în brief, Notion, Linear, alt tool)?
- **Cum** testăm periodic rezistența la **prompt injection** (procedură)?

---

## 15. Verdict

**Quick Exit Operator** poate fi pornit în **siguranță** doar ca **Daily Brief read-only**, pe **exporturi** și **agregate**, cu **aprobare umană** pentru orice acțiune externă.

**Nu** se recomandă conectarea OpenClaw (sau a unui agent echivalent) **direct** la baza de date live sau la Stripe în faza curentă.

---

*Ultima actualizare: sprint 6B.2 — documentație internă.*
