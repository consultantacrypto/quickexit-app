# Notificare promovare după plată

Canalul folosește doar ce există deja: Resend (același `RESEND_API_KEY` și `RESEND_FROM` ca emailurile tranzacționale) plus un rând în `public.promo_queue`.

## Variabilă nouă

`PROMO_NOTIFY_EMAIL`

O singură adresă. Valoarea propusă, nesetată în Vercel și nesetată în repo, este `consultantacrypto-ro-zvkmya+qe-paid@mail.grokbot.com`. Validarea acceptă `+` în partea locală. Fără variabilă, webhook-ul scrie coada (dacă tabelul există) și sare peste email cu log `missing_recipient`.

Emailul pleacă doar dacă există și `RESEND_API_KEY` și `RESEND_FROM`.

## Coadă

Migrarea `supabase/migrations/20261127072700_payments_ledger_and_promo_queue.sql` este aplicată pe producție (quickexit-db) cu versiunea `20261127072700`, la 27.11.2026 09:27 ora României. Fișierul a fost redenumit ca să coincidă cu istoricul; SQL-ul nu s-a schimbat.

`promo_queue.status` este `pending`, `done` sau `late`. `late` înseamnă `now` după `due_at`.

`due_at` este ora Europe/Bucharest, cu ora de vară. Regula 08:00–22:00 este cea aprobată de Dani pe GO-QE90-NOAPTE (27.11.2026, 09:00):

- plată între 08:00:00 și 22:00:00 inclusiv → `paid_at + 1 oră` (22:00 are termen 23:00);
- plată înainte de 08:00, inclusiv 07:30 și 07:59:59 → 09:00 în aceeași dimineață;
- plată după 22:00, inclusiv 22:00:01, 22:30 și 23:00 → 09:00 în dimineața următoare.

O plată la 22:30 nu are termen 23:30. Backfill-ul, emailul și `late` folosesc aceeași funcție. Nu există cron care să treacă singur `pending` în `late`.

Copy-ul public urmează regula aprobată 08:00–22:00. Varianta non-stop, de o oră fără fereastră, rămâne doar ca istoric în descrierea PR-ului.

Idempotența este pe `stripe_checkout_session_id`. Retrimiterea webhook-ului nu mai trimite al doilea email.

Eșecul emailului sau al cozii nu schimbă statusul HTTP al webhook-ului. Eșecul insertului în `payments` răspunde 500, ca Stripe să reîncerce.
