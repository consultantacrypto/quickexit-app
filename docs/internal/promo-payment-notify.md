# Notificare promovare după plată

Canalul folosește doar ce există deja: Resend (același `RESEND_API_KEY` și `RESEND_FROM` ca emailurile tranzacționale) plus un rând în `public.promo_queue`.

## Variabilă nouă

`PROMO_NOTIFY_EMAIL`

O singură adresă. Valoarea propusă, nesetată în Vercel și nesetată în repo, este `consultantacrypto-ro-zvkmya+qe-paid@mail.grokbot.com`. Validarea acceptă `+` în partea locală. Fără variabilă, webhook-ul scrie coada (dacă tabelul există) și sare peste email cu log `missing_recipient`.

Emailul pleacă doar dacă există și `RESEND_API_KEY` și `RESEND_FROM`.

## Coadă

Migrarea `supabase/migrations/20261126194000_payments_ledger_and_promo_queue.sql` nu este aplicată de acest PR.

`promo_queue.status` este `pending`, `done` sau `late`. `late` înseamnă `now` după `due_at`.

`due_at` este ora Europe/Bucharest, cu ora de vară:

- plată între 08:00:00 și 21:00:00 inclusiv → `paid_at + 1 oră`;
- plată înainte de 08:00 → 09:00 în aceeași dimineață;
- plată după 21:00, inclusiv 21:30 și 23:00 → 09:00 în dimineața următoare.

O plată la 21:30 nu are termen 22:30. Backfill-ul folosește aceeași funcție. Nu există cron care să treacă singur `pending` în `late`.

Copy-ul public urmează regula de zi. Varianta non-stop aprobată inițial de Dani rămâne doar în descrierea PR-ului, până la GO-QE90-NOAPTE.

Idempotența este pe `stripe_checkout_session_id`. Retrimiterea webhook-ului nu mai trimite al doilea email.

Eșecul emailului sau al cozii nu schimbă statusul HTTP al webhook-ului. Eșecul insertului în `payments` răspunde 500, ca Stripe să reîncerce.
