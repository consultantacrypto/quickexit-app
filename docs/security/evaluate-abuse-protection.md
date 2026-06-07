# Evaluate API — abuse protection (EVAL-2D.1)

## Scop

Protejează `POST /api/evaluate` împotriva apelurilor directe (curl, bot) înainte de costuri externe **SerpApi** și **Gemini**.

## Env vars

| Variabilă | Unde | Rol |
|-----------|------|-----|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Vercel + local | Site key Cloudflare Turnstile (public, client) |
| `TURNSTILE_SECRET_KEY` | Vercel + local | Secret server-side pentru siteverify |
| `EVALUATE_TURNSTILE_ENABLED` | Vercel + local | `"true"` = verificare obligatorie când secret există |

**Reguli:**

- Nu commita secrete în git.
- Nu loga `turnstileToken` sau `TURNSTILE_SECRET_KEY`.
- În development, dacă `EVALUATE_TURNSTILE_ENABLED` nu e `true`, verificarea este **skip** (comportament vechi).

## Flow

1. **UI** (`/evaluare`, pas 2 `/pune-anunt`): widget Cloudflare Turnstile → token one-time.
2. **Client** trimite `turnstileToken` în body JSON (câmp separat, nu PII).
3. **Server** (`lib/turnstileVerify.ts`):
   - skip dacă `EVALUATE_TURNSTILE_ENABLED !== "true"`
   - fail dacă enabled + token lipsă
   - fail dacă enabled + `TURNSTILE_SECRET_KEY` lipsă **în production**
   - POST `https://challenges.cloudflare.com/turnstile/v0/siteverify`
4. Dacă verificarea eșuează → **403** înainte de SerpApi/Gemini/cache write.

## Test direct API (după deploy)

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST "https://www.quickexit.ro/api/evaluate" \
  -H "Content-Type: application/json" \
  -d '{"category":"auto","make":"BMW","model":"X5","year":"2021"}'
```

**Așteptat cu Turnstile enabled:** `403`

Body așteptat:

```json
{
  "success": false,
  "message": "Verificarea de securitate nu a reușit. Te rugăm să reîncerci."
}
```

## Test din UI

1. Deschide `/evaluare` sau `/pune-anunt` pas 2.
2. Completează formularul + widget Turnstile (bifă automată Cloudflare).
3. Submit evaluare → **200** + rezultat (dacă restul validărilor trec).

## Fișiere

| Fișier | Rol |
|--------|-----|
| `lib/turnstileVerify.ts` | Verificare server-side |
| `lib/turnstilePublic.ts` | Flag client (site key prezent) |
| `components/EvaluateTurnstile.tsx` | Widget reutilizabil |
| `app/api/evaluate/route.ts` | Gate 403 înainte de cost |
| `app/[locale]/evaluare/EvaluareClient.tsx` | Token la evaluare |
| `app/[locale]/pune-anunt/PuneAnuntClient.tsx` | Token la `generateAiPricing` |

## Protecții rămase (post EVAL-2D.1)

| Lipsă | Notă |
|-------|------|
| Rate limit global (Upstash / Vercel KV) | In-memory 12/min/IP rămâne per instanță serverless |
| Daily cap IP / cost guard SerpApi | Recomandat înainte de ads scale |
| Cloudflare WAF rate rules | Layer edge suplimentar pe `/api/evaluate` |
| Turnstile pe apel curl | By design — direct API rămâne blocat fără token valid |

## Limitări

- Token Turnstile este **single-use**; fiecare apel `/api/evaluate` necesită token nou din UI.
- Flow listare pas 2 → 3 are widget propriu (nu reutilizează tokenul din `/evaluare`).
- Fără `NEXT_PUBLIC_TURNSTILE_SITE_KEY` pe client, UI nu afișează widget; serverul poate totuși bloca dacă `EVALUATE_TURNSTILE_ENABLED=true`.
