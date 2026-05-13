# Quick Exit — RLS / Privacy Manual Checklist

## 1. Scop

Acest document listează verificările manuale necesare în **Supabase** (Dashboard: Authentication, Table Editor, SQL policies, Storage) pentru a confirma că **RLS** (Row Level Security) și expunerea de date sunt corecte **înainte de beta mai larg** și **înainte de sprint-ul dedicat performanței**.

Codul aplicației folosește în multe locuri `select('*')` pe client cu cheia **anon** (`lib/supabase.ts`). Dacă RLS este strict, riscul este controlat; dacă RLS este prea permisiv, pot fi expuse coloane sensibile chiar dacă UI-ul nu le afișează.

**Acest checklist nu înlocuiește** auditul de securitate sau pen-test-ul; este o listă operațională pentru echipa produs.

---

## 2. Principii

- **Publicul** vede doar datele menite să fie publice (anunțuri/cereri active, câmpuri agregate sau minime).
- **Utilizatorul autentificat** vede propriile înregistrări și relațiile permise de produs.
- **Vânzătorul** vede ofertele primite pe anunțurile sale (`listing_offers` legate de `listings.user_id`).
- **Cumpărătorul** vede ofertele trimise de el și, după regulile produsului, ofertele relevante pe cereri.
- **Adminul** vede date operaționale în **HQ**; accesul la date sensibile prin client trebuie totuși limitat de RLS la rolul permis (sau evitat — preferabil operațiuni critice doar server-side cu service role controlat).
- **Service role** se folosește **doar server-side** (API routes, webhook), niciodată în bundle-ul browser.
- **PII** (email, telefon, mesaje, date identificabile) **nu** apare în răspunsuri publice sau în liste nefiltrate.
- **Date KYC / Stripe** (status brut, sesiuni, payload webhook) **nu** sunt expuse clientului neautorizat; actualizarea `kyc_status` vine din fluxuri server-side verificate.

---

## 3. Tabele de verificat

| Tabel | Cine ar trebui să poată **citi** | Cine ar trebui să poată **scrie** | Coloane / zone sensibile | Ce de verificat în Supabase |
|-------|-----------------------------------|-------------------------------------|----------------------------|-----------------------------|
| **listings** | Public: doar rânduri „publice” (ex. `active`); owner: toate ale sale | Owner: insert/update propriu; sistem: update status (webhook) | `user_id`, telefon, note interne, metadata plată, status | Politici `SELECT`/`INSERT`/`UPDATE` pe `status`; fără leak `pending_payment` în public |
| **demands** | Public: cereri active (dacă produsul o cere); owner: ale sale | Owner cerere; sistem webhook | buget, descriere, contact, `user_id` | Cereri inactive / draft / pending nu în listă publică |
| **listing_offers** | Buyer: ale sale; Seller: pe listingurile sale | Buyer: insert propriu; update accept/respingere conform regulilor | mesaj, preț, date contact, `buyer_id` | **Fără** `SELECT` public anon pe tot tabelul |
| **demand_offers** | Seller: trimise de el; Buyer: pe cererile sale | Seller: insert; buyer update status | imagini URL, telefon, email | Idem — izolare strictă între părți |
| **profiles** | User: propriul rând; public: eventual câmpuri minime (trust) — explicit | User: câmpuri permise; **nu** `kyc_status` manual | email, telefon, `kyc_status`, rol admin | Fără `SELECT *` anon pe toți userii |
| **valuation_reports** | Owner raport; admin opțional | Server / user doar insert permis de flux | conținut evaluare, anchor-uri | Rapoarte altui user inaccesibile |
| **admin_risk_resolutions** | Doar admin / service | Doar admin / service | titlu, severitate, note | Zero acces pentru rol `authenticated` normal |
| **market_search_cache** (dacă există) | Doar server / job | Service / evaluate | snippet-uri piață, URL-uri | Nu expune chei sau PII în coloane text |
| **Storage: bucket `listings`** | Public read doar dacă politica o cere; altfel signed URLs | Upload doar user autentificat în folderul său | path `user_id/...`, imagini oferte | Policies pe `storage.objects`; nu confunda path cu securitate |

**Plăți / checkout:** rutele `app/api/checkout/*` și `app/api/checkout-demand/*` nu interoghează Supabase direct în codul curent; starea plăților ajunge în DB prin **`app/api/webhook/route.ts`** (service role). Verifică totuși că **nu** există tabele auxiliare „sessions” expuse accidental.

---

## 4. listings — policy checklist

- [ ] Public (anon) poate citi **doar** listări **active** (și eventual alte statusuri explicit permise de produs — **nu** `pending_payment`, **nu** draft-uri interne).
- [ ] `pending_payment` **nu** apare în interogările publice (homepage, categorii, sitemap, SEO server components).
- [ ] `expired` / `suspended` / `admin_removed` conform politicii — de obicei **nu** în liste publice.
- [ ] `sold` — clarificat cu produsul: ascuns din listări „active” dar poate rămâne vizibil pe URL direct doar dacă este intenționat.
- [ ] Owner poate citi **toate** listările unde `user_id = auth.uid()`.
- [ ] Owner poate **edita** doar propriile listări.
- [ ] User B **nu** poate `UPDATE` listarea userului A.
- [ ] Schimbarea `status` către `active` din client **fără** plată confirmată este **interzisă** (doar webhook sau flux controlat).
- [ ] Coloane sensibile (`user_id`, telefon, note, stripe/session ids dacă există) **nu** sunt returnate în `SELECT` public.

**Coloane sensibile posibile:** `user_id`, telefon, note interne, metadata plată, flag-uri review/risc.

---

## 5. demands — policy checklist

- [ ] Public poate citi **doar** demands **active** (sau subsetul agreat).
- [ ] `pending_payment`, `resolved`, `inactive` **nu** în fluxul public „capital disponibil”.
- [ ] Buyer (`user_id` / echivalent) poate citi **toate** cererile sale.
- [ ] Buyer poate edita **doar** cererile sale.
- [ ] User normal **nu** poate edita cererea altuia.
- [ ] Bugetul este public **doar** dacă este decizie de produs documentată.
- [ ] Date de contact **nu** sunt expuse anonim pe listări publice de cereri.

---

## 6. listing_offers — policy checklist

- [ ] Buyer autentificat poate **insera** ofertă pe listare **activă** (dacă produsul permite).
- [ ] Buyer poate vedea **doar** ofertele unde este cumpărătorul (`buyer_id` / echivalent).
- [ ] Seller poate vedea ofertele pentru listările unde este proprietarul anunțului.
- [ ] User random **nu** poate lista sau citi ofertele altora.
- [ ] Buyer **nu** poate `UPDATE` oferta altui buyer.
- [ ] Seller poate accepta/respinge **doar** oferte pe propriile listări (dacă logica e în DB sau RPC — verificat).
- [ ] Mesajele ofertelor **nu** sunt citibile public.
- [ ] Date de contact ale ofertei **nu** sunt publice.

---

## 7. demand_offers — policy checklist

- [ ] Seller poate crea ofertă către cerere **activă**.
- [ ] Seller vede ofertele **trimise de el**.
- [ ] Buyer vede ofertele **primite** pe cererile sale.
- [ ] User random **nu** vede ofertele altora.
- [ ] Seller A **nu** modifică oferta sellerului B.
- [ ] Buyer poate accepta/respinge **doar** pe cererile proprii.
- [ ] Imagini, mesaje, telefon, email din ofertă **nu** sunt expuse în query-uri publice.

---

## 8. profiles — policy checklist

- [ ] Public **nu** poate lista toate profilele (`SELECT` fără filtru).
- [ ] Dacă există „seller trust” pe pagina publică anunț: doar câmpuri **minime** (ex. prenume / inițial, `kyc_status` dacă e intenționat) — confirmat explicit.
- [ ] User poate citi **propriul** profil complet (conform GDPR/minimization).
- [ ] User poate actualiza **doar** coloanele permise (ex. `full_name` — nu rol admin).
- [ ] User **nu** poate seta `kyc_status` la `verified` prin `UPDATE` direct.
- [ ] `kyc_status` se actualizează **doar** prin `app/api/webhooks/kyc/route.ts` (service role) sau flux echivalent securizat.
- [ ] Email / telefon **nu** apar în răspunsuri folosite pe pagini indexabile publice fără nevoie.

---

## 9. valuation_reports — policy checklist

- [ ] Utilizatorul vede **doar** rapoartele legate de contul său / evaluările sale.
- [ ] Publicul **nu** citește rapoarte private.
- [ ] Admin vede rapoarte doar prin **HQ** cu acces controlat (client + RLS sau doar server).
- [ ] Rapoartele nu propagă PII în payload-uri cache sau în UI public.

---

## 10. admin_risk_resolutions / HQ data

- [ ] **Doar** admin (sau service role pe server) poate citi.
- [ ] **Doar** admin poate scrie / insera rezoluții.
- [ ] User normal **zero** rânduri returnate la `SELECT`.
- [ ] Nu apar în pagini publice indexabile (complementar: **noindex** pe `/hq-admin` — verificat în cod Sprint 7A.2).
- [ ] Nu se trimit accidental în **analytics** (evenimente custom).

---

## 11. Storage buckets

**Bucket folosit în cod:** `listings` (upload imagini anunț `pune-anunt`, imagini ofertă cerere `trimite-oferta` — path-uri sub `user_id/...`).

- [ ] Imaginile listărilor **active** pot fi publice **numai** dacă politica de produs și **Storage RLS** o permit în mod explicit.
- [ ] Fișiere pentru `pending_payment` sau oferte private **nu** trebuie accesibile public dacă URL-ul este ghicit (nu te baza doar pe obscuritatea path-ului).
- [ ] Userul **nu** poate `upload`/`update`/`delete` în prefixul altui `user_id`.
- [ ] Path-ul include `user_id` — **nu** este protecție suficientă singur; verifică policy pe `(bucket_id, name)`.
- [ ] Linkurile private / path-uri complete **nu** intră în snapshot-uri Operator sau în repo fără review.

---

## 12. Service role usage

**Endpointuri / zone care folosesc `SUPABASE_SERVICE_ROLE_KEY` (din audit static cod):**

| Zonă | Fișier / notă |
|------|----------------|
| Webhook Stripe | `app/api/webhook/route.ts` — actualizare `listings` / `demands` |
| Webhook KYC | `app/api/webhooks/kyc/route.ts` — update `profiles` |
| HQ Copilot | `app/api/hq/copilot/route.ts` — snapshot agregat |
| Admin ingest | `app/api/admin/ingest-market/route.ts` — insert `listings` |
| Evaluate | `app/api/evaluate/route.ts` — rapoarte / cache (parțial) |
| Scripturi | `scripts/import-market-index.ts` — local/CI, nu în producție browser |

**Checklist:**

- [ ] Cheia service role există **doar** în variabile de mediu server (Vercel/hosting), **niciodată** `NEXT_PUBLIC_*`.
- [ ] **Niciodată** în client, bundle, sau config OpenClaw local partajat.
- [ ] Logging: fără logare completă a body-ului webhook Stripe sau a token-ilor.
- [ ] Răspunsuri eroare către client: fără dump SQL sau payload sensibil.

**Notă:** `app/api/checkout/route.ts`, `app/api/checkout-demand/route.ts`, `app/api/create-verification-session/route.ts` — **fără** client Supabase în fișierele actuale; totuși verifică că variabilele de mediu nu expun chei în client.

---

## 13. HQ Copilot / Gemini privacy

**Ce face codul (rezumat):** `app/api/hq/copilot/route.ts` construiește un snapshot cu **service role**: `listings`, `demands`, `listing_offers`, `demand_offers` cu `select('*')` (limite 300–500), `profiles` cu coloane limitate, `valuation_reports` parțial, `admin_risk_resolutions` parțial; apoi date agregate sunt trimise către **Gemini**.

**Verificări:**

- [ ] Ce câmpuri concrete ies din `*` pentru offers (telefon, email, mesaje) — **inventar coloane** în Table Editor și compară cu prompt.
- [ ] Dacă mesajele ofertelor sunt trimise **integral** către Gemini.
- [ ] Dacă `profiles` în snapshot exclude email/telefon (în cod: listă parțială — confirmă că DB nu are trigger care adaugă).
- [ ] Dacă output-ul modelului este constrâns să **nu** divulge PII (instrucțiuni prompt — review manual).
- [ ] Dacă pentru beta se acceptă snapshot-ul actual sau trebuie **reducere / pseudonimizare** într-un sprint ulterior.

**Recomandare:** pentru beta mai larg, **HQ Copilot** ar trebui să trimită **minimul necesar** către Gemini (coloane explicite în loc de `*`, eșantionare, truncare mesaje).

---

## 14. Analytics privacy

**Cod:** `lib/analytics.ts` — `trackEvent` trimite parametri către `gtag`; se combină cu atribuire (UTM, referrer, path) din `appendAttributionParams`.

**Verificări:**

- [ ] `trackEvent` **nu** primește email sau telefon în apeluri (grep periodic pe `trackEvent(`).
- [ ] **Nu** se trimit mesaje complete de ofertă sau body-uri formular.
- [ ] `listing_id` / `demand_id` — acceptabile dacă nu permit corelare abuzivă fără alt context; documentează decizia DPO/produs.
- [ ] Atribuirea este limitată (lungimi max dacă există în cod).
- [ ] Nu se trimit payload-uri brute Supabase către GA.

**Exemplu din cod:** `trimite-oferta` trimite `submit_demand_offer` cu `demand_id` — confirmă că nu se adaugă PII în același eveniment.

---

## 15. Teste manuale recomandate în Supabase

Rulează din **SQL Editor** sau **Table Editor** cu **„Run as user”** / JWT de test (anon key vs user JWT), conform [documentația Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security).

### Public anon

- [ ] Poate rula query-uri permise de aplicația publică (echivalent homepage): doar listări/cereri active.
- [ ] **Nu** poate citi rânduri `listings` cu `status = 'pending_payment'` (test explicit `WHERE id = ...`).
- [ ] **Nu** poate `SELECT` pe `listing_offers` / `demand_offers` fără restricție.
- [ ] **Nu** poate lista `profiles` (fără `id` specific permis de politică).

### User A (seller)

- [ ] Vede propriile `listings` în toate statusurile relevante.
- [ ] Poate `UPDATE` doar pe propriile listări.
- [ ] **Nu** poate `UPDATE` listarea userului B.
- [ ] Vede `listing_offers` doar pentru `listing_id` unde este owner.

### User B (buyer pe listare)

- [ ] Poate `INSERT` în `listing_offers` conform regulilor.
- [ ] Vede doar ofertele cu `buyer_id = B`.
- [ ] **Nu** vede ofertele altor buyers pe același listing.

### Buyer cerere (owner demand)

- [ ] Vede propria cerere în toate statusurile permise.
- [ ] Vede `demand_offers` primite pe cererea sa.
- [ ] **Nu** vede oferte pe cererea altui user.

### User normal vs HQ

- [ ] **Nu** citește `admin_risk_resolutions`.
- [ ] **Nu** modifică `kyc_status` pe profilul propriu sau al altuia.

### Admin

- [ ] Acces HQ în UI este **gated** (email allowlist în cod — **nu** înlocuiește RLS); confirmă că RLS permite sau refuză corect citirea tabelelor sensibile pentru acel `auth.uid()`.
- [ ] Operațiuni cu **service role** rămân pe server și sunt autentificate (ex. secret webhook, chei admin route).

---

## 16. Red flags

- `SELECT` public pe `profiles` fără limitare sau cu `*`.
- `listing_offers` sau `demand_offers` **citibile** de rol `anon` sau de orice user autentificat fără join la ownership.
- User poate `UPDATE profiles SET kyc_status = 'verified'`.
- User poate seta `listings.status = 'active'` fără plată / fără webhook.
- Listări `pending_payment` vizibile pe homepage / categorii / sitemap.
- Cereri `pending_payment` vizibile public.
- **Service role** sau cheie secretă în variabile `NEXT_PUBLIC_*` sau în repo.
- Date Stripe brute (customer id complet, card) în coloane citite de client.
- Mesaje oferte sau telefon în evenimente analytics.
- Brief-uri Operator reale cu PII în `docs/internal` fără control de acces.

---

## 17. Prioritate verificări

| Verificare | Prioritate | Impact | Efort | Owner | Status |
|------------|------------|--------|-------|-------|--------|
| 1. Public cannot read `listing_offers` | P0 | Critic | Mic | | De verificat manual |
| 2. Public cannot read `demand_offers` | P0 | Critic | Mic | | De verificat manual |
| 3. Public cannot list `profiles` | P0 | Critic | Mic | | De verificat manual |
| 4. User cannot update `kyc_status` | P0 | Critic | Mic | | De verificat manual |
| 5. `pending_payment` listings not public | P0 | Mare | Mediu | | De verificat manual |
| 6. `pending_payment` demands not public | P0 | Mare | Mediu | | De verificat manual |
| 7. Seller can read only own listing offers | P0 | Mare | Mediu | | De verificat manual |
| 8. Buyer can read only own demand-offer context | P0 | Mare | Mediu | | De verificat manual |
| 9. Service role only server-side | P0 | Critic | Mic | | De verificat manual |
| 10. HQ Copilot snapshot reviewed for PII | P1 | Mare | Mare | | De verificat manual |
| Storage policies pe bucket `listings` | P1 | Mare | Mediu | | De verificat manual |
| `admin_risk_resolutions` locked down | P1 | Mare | Mic | | De verificat manual |
| Sitemap / SEO server queries respect status | P2 | Mediu | Mic | | De verificat manual |

---

## 18. Verdict

**RLS și privacy trebuie validate manual în Supabase** înainte de beta mai larg. Din cod se identifică **suprafețe mari de risc** (în special `select('*')` pe client pentru `listings`, `demands`, `listing_offers` în dashboard și homepage, plus snapshot HQ cu `*` pe server), dar **nu se poate confirma** protecția reală fără testarea politicilor RLS, a storage policies și a scenariilor JWT de mai sus.

După bifarea checklist-ului, păstrați o **dată** și **versiune** a migrărilor RLS verificate în changelog intern.
