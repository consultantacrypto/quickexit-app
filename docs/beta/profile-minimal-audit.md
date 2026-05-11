# Profil utilizator minimal — Audit si propunere

## 1. De ce avem nevoie de profil
- Creste increderea intre parti.
- Clarifica identitatea in dashboard si ofertare.
- Ofera baza pentru reputatie in etape viitoare.
- Reduce confuzia in interactiunile seller-buyer.

## 2. Ce exista acum
- Exista tabel `profiles` folosit in cod.
- Campuri observate in utilizare: `id`, `full_name`, `kyc_status`, `user_type`, `created_at`.
- Dashboard citeste `profiles` pentru status KYC.
- `PosteazaCerereClient` face `upsert` limitat in `profiles`.
- Nu exista pagina dedicata de profil (`/profil` inexistenta).
- Nu exista upload avatar in fluxul de profil.
- Nu exista storage avatar in uz (storage este folosit pentru listari).
- Nu exista versiune de politici RLS pentru `profiles` in repo.

## 3. MVP profil recomandat
Doar daca infrastructura permite fara schimbari de schema:
- Nume afisat (`full_name`) editabil.
- Email readonly din auth.
- Tip utilizator (`user_type`) editabil in limite controlate.
- Status KYC readonly (daca exista).
- Data creare cont readonly (`created_at`).
- Fara avatar in MVP daca nu exista storage si politici clare.

## 4. Ce NU facem in MVP
- Upload avatar.
- Bio publica.
- Telefon public.
- Verificari reputatie avansate.
- Documente KYC in profil.
- Ratinguri.

## 5. Intrebari inainte de implementare
- Ce fields exista exact in `profiles` in mediul Supabase curent?
- RLS pentru `profiles` permite update doar pentru owner?
- Ruta finala: `/profil` sau `/contul-meu`?
- Profilul este privat (doar user) sau partial public?

## 6. Recomandare
Sprint separat pentru **Profil minimal privat**, fara avatar, fara schimbari de schema DB daca fields-ul exista deja si politicile permit update owner-safe.
