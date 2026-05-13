# Quick Exit — RLS Test Set 6: Storage

## 1. Context

Raport **read-only** pentru **Test Set 6 — Storage** din `docs/internal/rls-privacy-execution-plan.md` (secțiunea **„## 11. Test Set 6 — Storage”**), aliniat cu checklist-ul **Storage: bucket `listings`**.

Legat de **7A.7 (User A Seller):** path-ul de upload folosește `user.id`; **politicile Storage** și scenariile cross-user **nu** au fost validate live — acest raport documentează doar **codul** și verificări **neinvazive** (fără upload/delete, fără modificări policies).

---

## 2. Metodă

- **Audit static:** `grep` pentru `storage.`, `getPublicUrl`, `upload`, `remove`, `createSignedUrl`, `signed` în `*.ts` / `*.tsx`.
- **HTTP public:** pagină `/anunt/[id]` pe hostul public implicit din proiect (`getSiteUrl`); scanare HTML pentru `token=`, `signed`, `supabase.co/storage`; **HEAD** anonim la primul URL detectat de tip `…/storage/v1/object/public/…` (fără a reproduce URL-ul complet în acest document).
- **Scan `docs/internal`:** pattern-uri `supabase.co/storage`, `signed`, `service_role`, `JWT`, `eyJ` în fișiere relevante Operator / RLS.
- **Fără** service role, **fără** upload/delete, **fără** modificări Storage/DB/RLS/cod.

---

## 3. Rezumat rezultate

| Test ID | Scenariu | Așteptat | Observat | Status | Severitate | Note |
|---------|-----------|----------|----------|--------|------------|------|
| ST1 | Imagine listare activă publică (dacă politica o cere) | URL public accesibil fără token în query | HTML public conține `supabase.co/storage`; **HEAD** anon → **200 OK** pe URL `…/object/public/…` | **PARTIAL** | Low | Confirmă bucket **public read**; fără `token=` în eșantion |
| ST2 | Fără upload în folder alt user | Path construit cu `user.id` | `pune-anunt`: `${user.id}/${fileName}`; `trimite-oferta`: `${user.id}/demand-offers/${id}/…` | **PASS** | None | **Policy** Storage = verificare manuală |
| ST3 | Fără delete imagine alt user | `remove` controlat sau absent | **Niciun** `storage.remove` / `delete` în codul TS/TSX scanat | **PASS** | None | Ștergere poate exista în UI altundeva — nu găsit în pattern-uri de mai sus |
| ST4 | Fără suprascriere cross-user | Path unic + prefix user | Nume fișier random + prefix `user.id`; același bucket | **PARTIAL** | Medium | **Nu** există în client verificare explicită „folder B”; depinde de **policy** + unicitate |
| ST5 | Imagini `demand_offers` nu publice neintenționat | Privacy dacă produsul cere | `trimite-oferta` folosește **`getPublicUrl`** pe același bucket **`listings`** | **PARTIAL** | Medium | **Decizie produs / risc:** URL-urile sunt construite ca **publice**; oricine cu linkul poate încărca în browser dacă bucket-ul e public |
| ST6 | Fără signed URL / token în HTML public | Fără `token=`, `signed` în sursă | Scan HTML pagină anunț: `token=` absent, `signed` absent | **PASS** | None | Eșantion o pagină; nu înlocuiește audit complet |
| ST7 | Docs Operator fără linkuri private | Fără URL storage + secrete | În `docs/internal`: apariții „storage” în proceduri ca **interdicție**; fără `supabase.co/storage` în pachete fictive; singur `supabase.co` în `rls-privacy-checklist` → link **documentație** publică Supabase | **PASS** | None | Verificat prin `grep` orientat |
| ST8 | Bucket `listings` consecvent | Folosire clară | Toate apelurile `storage.from` → **`"listings"`**; listări + imagini ofertă cerere în același bucket | **PASS** | None | **ST8** notează și **risc de separare** viitoare (bucket dedicat oferte) |
| ST9 | Path fără email/telefon | Doar UUID + segmente | Path: `uuid/…` sau `uuid/demand-offers/uuid/…` — fără email literal în concatenare | **PASS** | None | `user_id` în path nu este anonimat — vezi checklist |
| ST10 | Policies validate manual | Listă teste live | Documentat în §7 | **BLOCKED** | None | Fără upload controlat în acest sprint |

---

## 4. Detalii pe test

### ST1 — Listare activă, imagine publică

- **Pași:** GET HTML `/anunt/[id]`; extragere URL storage public; `curl -sI` (HEAD).
- **Observații:** răspuns **200** pentru resursa imagine din path **public** Supabase.
- **Rezultat:** **PARTIAL** (comportament confirmat pe eșantion; nu acoperă toate listările).
- **Manual:** eșantionare mai multe anunțuri; verificare **RLS** vs imagini `pending_payment`.

### ST2 — Upload în folder alt user

- **Pași:** `PuneAnuntClient`, `trimite-oferta`.
- **Observații:** ambele prefixează cu `user.id`.
- **Rezultat:** **PASS** (cod).
- **Manual:** în staging, încercare `upload` cu path `other_user_uuid/x.png` (trebuie **eșuat**).

### ST3 — Delete cross-user

- **Pași:** căutare `remove`, `delete` pe storage în repo.
- **Observații:** zero apeluri găsite.
- **Rezultat:** **PASS** (suprafață mică în cod).
- **Manual:** dacă se adaugă delete în viitor — policy obligatorie.

### ST4 — Suprascriere

- **Pași:** audit generare nume + path.
- **Observații:** random în nume; nu există flag explicit `upsert: false` în apelul `upload` (implicit Supabase poate depinde de versiune — verificare doc/SDK).
- **Rezultat:** **PARTIAL**.
- **Manual:** test `upload` același path de două ori ca același user.

### ST5 — `demand_offers.images` și publicitate

- **Pași:** `trimite-oferta` — `getPublicUrl` după upload.
- **Observații:** imaginile ofertei sunt stocate ca **URL-uri publice** în coloana `images` (array).
- **Rezultat:** **PARTIAL** — aliniere cu „produs vrea confidențialitate?” — **de confirmat** cu produs/DPO.
- **Manual:** acces anonim la URL salvat (fără login) — dacă bucket public → **vizibil**.

### ST6 — UI public fără token

- **Pași:** scan substring pe HTML anunț.
- **Rezultat:** **PASS** pe eșantion.
- **Manual:** homepage, categorii, capital.

### ST7 — Docs Operator

- **Pași:** grep în `docs/internal` pentru storage sensibil + `operator-briefs`, `operator-data-packs`.
- **Observații:** CSV-uri fictive fără coloane URL; proceduri interzic linkuri private.
- **Rezultat:** **PASS** (în limitele scanului).

### ST8 — Bucket unic

- **Pași:** grep `storage.from(`.
- **Observații:** un singur nume de bucket în codul aplicației pentru upload-uri analizate.
- **Rezultat:** **PASS**; recomandare separare bucket oferte dacă se cere confidențialitate.

### ST9 — Path fără PII directă

- **Pași:** revizuire concatenări string.
- **Rezultat:** **PASS** (UUID-uri și segmente fixe).

### ST10 — Policies manuale

- **Pași:** enumerare teste necesare în Supabase Dashboard.
- **Rezultat:** **BLOCKED** în acest sprint.
- **Manual:** (1) `INSERT` storage ca user A pe prefix propriu vs străin; (2) `SELECT` public object fără auth; (3) mărime/max objects; (4) CORS dacă e relevant.

---

## 5. Suprafețe de risc Storage

| Element | Observație |
|---------|------------|
| **Bucket `listings`** | Singurul bucket folosit pentru upload în fluxurile identificate. |
| **Path `user_id/...`** | Reduce greșelile accidentale; **nu** înlocuiește policy. |
| **`getPublicUrl`** | Folosit după fiecare upload reușit (listări + oferte cerere). |
| **Upload fără test policy** | Risc operațional rămâne până la teste ST2/ST4 live. |
| **`demand_offers.images`** | Aceleași URL-uri publice ca listările dacă bucket-ul e public. |
| **Fără bucket separat** | Ofertele partajează bucket cu anunțuri — posibil **mix** de sensibilitate. |
| **Pagini publice anunț** | `adData.images` din `listings` — URL-uri absolute în UI (comportament așteptat pentru active publice). |
| **Signed URLs** | **Nu** apar în codul scanat (`createSignedUrl` absent). |

---

## 6. Red flags

1. **`demand_offers` + `getPublicUrl`:** dacă politica bucket este **public read**, imaginile ofertelor pot fi **descoperibile** de oricine posedă URL-ul (sau prin enumerare dacă există — improbabil fără listare).
2. **Lipsă `storage.remove` în repo:** risc redus de ștergere accidentală din client, dar **nu** garantează absența în alte branch-uri sau scripturi neincluse în grep.
3. **Fără token în HTML eșantion:** OK; nu exclude token-uri în **alt** flux (ex. fișiere private viitoare).

**Nu** s-a găsit: `service_role` în client, URL-uri cu `token=` în pagina anunț testată, `createSignedUrl` în cod.

---

## 7. Blocked / necesită test manual

- Conturi **User A** / **User B** și încercări **upload** / **overwrite** / **delete** în staging.
- **Supabase Dashboard** → Storage → Policies pentru `listings`.
- **Acces anonim** la URL-uri `demand_offers.images` salvate în DB (copiat din dashboard buyer).
- **Network** autentificat pentru răspunsuri `upload` (erori policy).

---

## 8. Concluzie

**Verdict general: PARTIAL**

**Motiv:** codul construiește path-uri **sănătoase** (prefix `user_id`), folosește un singur bucket, **nu** expune `remove`/`signed` în sursele scanate, iar eșantionul HTML public **nu** conține token-uri de semnătură. În schimb **politicile Storage** și confidențialitatea reală a imaginilor **`demand_offers`** (URL publice) **nu** sunt confirmate live — conform regulii din prompt („PASS doar dacă toate testele sunt confirmate live”) verdictul rămâne **PARTIAL**.

**FAIL:** nu (nu s-au găsit secrete publice sau service role în client în probele de mai sus).

---

## 9. Următorul pas

1. **Test live Storage** în staging (prioritar dacă riscul ST5 este inacceptabil pentru produs).  
2. Alternativ continuare plan: **Test Set 3 — User B Buyer** (flux ofertă listare + ofertă cerere).

---

*Sprint **7A.8** — read-only.*
