# Notificare promovare după plată

Canalul folosește doar ce există deja: Resend (același `RESEND_API_KEY` și `RESEND_FROM` ca emailurile tranzacționale) plus un rând în `public.promo_queue`.

## Variabilă nouă

`PROMO_NOTIFY_EMAIL`

O singură adresă, de exemplu adresa echipei care publică clipul și postarea. Nu este setată în repo și nu este setată de acest schimb. Fără ea, webhook-ul scrie coada (dacă tabelul există) și sare peste email cu log `missing_recipient`. Valoarea nu se pune aici.

Emailul pleacă doar dacă există și `RESEND_API_KEY` și `RESEND_FROM`.

## Coadă

Migrarea `supabase/migrations/20261126194000_payments_ledger_and_promo_queue.sql` nu este aplicată de acest PR.

`promo_queue.status` este `pending`, `done` sau `late`. La plată nouă rândul intră `pending`, cu `due_at = paid_at + 1 oră`. Backfill-ul marchează `late` rândurile istorice al căror termen a trecut. Nu există cron care să treacă singur `pending` în `late`.

Idempotența este pe `stripe_checkout_session_id`. Retrimiterea webhook-ului nu mai trimite al doilea email.

Eșecul emailului sau al cozii nu schimbă statusul HTTP al webhook-ului. Eșecul insertului în `payments` răspunde 500, ca Stripe să reîncerce.
