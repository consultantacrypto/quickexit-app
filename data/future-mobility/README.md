# Future Mobility — Content Packs (Sprint 1B)

Pachete de date draft pentru listări Future Mobility. **Nu sunt publicabile** până la confirmarea comercială AutoConsul.

## Content pack vs seed payload

| | Content pack (`.draft.json`) | Seed payload (live) |
|---|------------------------------|---------------------|
| Scop | Editare, validare internă, audit | Insert în Supabase |
| Secțiuni extra | `content`, `commercial_confirmation`, `image_manifest`, `internal_validation`, `source_registry` | Doar `listing` + `details` |
| `commercial_status` | Poate fi `pending_partner_confirmation` | Trebuie confirmat — seed refuză `pending` |
| `listing.description` | Opțional — folosiți `description_long` | Obligatoriu (script mapează automat) |
| `listing.images` | Poate fi `[]` în draft | Minim 1 URL — seed live refuză lista goală |
| Activare directă | **Nu** — un draft nu devine `active` fără transform + guard-uri | Da, după toate verificările |

## Structura unui pachet

| Secțiune | Scop |
|----------|------|
| `listing` | Câmpuri Supabase `listings` (titlu, descrieri, prețuri, imagini) |
| `details` | JSON `details` — trebuie să treacă `parseFutureMobilityDetails()` din `lib/futureMobility.ts` |
| `content` | Copy marketing suplimentar (beneficii, „pentru cine”) — integrat în `listing.description` la seed |
| `seo` | Meta title/description RO+EN — în `details.seo`, folosit manual la publicare |
| `image_manifest` | Inventar poziții imagine + drepturi — **nu** intră în seed |
| `internal_validation` | Status validare + `ready_for_seed` — **nu** intră în seed |
| `source_registry` | Proveniența datelor tehnice — **nu** intră în seed |
| `commercial_confirmation` | Checklist partener intern — **nu** intră în seed |

## Regula de publicare

**Nicio listare nu poate fi publicată cu `commercial_status: "pending_partner_confirmation"`.**

Scriptul `scripts/seed-future-mobility-listing.ts` refuză seed-ul live în acest caz.

## Mapare automată draft → seed

Când fișierul conține un content pack, scriptul:

1. **Descriere:** `listing.description` ← `listing.description_long` (sau `description_short`) dacă `description` lipsește
2. **Conținut suplimentar:** dacă există `content.benefits` / `content.for_whom`, le adaugă la finalul descrierii (secțiuni „Beneficii principale” / „Pentru cine este”)
3. **Curățare listing:** elimină `description_long` și `description_short` din payload-ul final
4. **Exclude** complet: `internal_validation`, `source_registry`, `commercial_confirmation`, `image_manifest`, `content` — nu sunt copiate în `details` sau descrierea publică

## Guard placeholder-e (listing + details)

Seed-ul este blocat dacă orice string din `listing` sau `details` conține (case-insensitive):

- `REPLACE_WITH_`
- `TODO`
- `TBD`
- `PENDING_CONFIRMATION`
- `AUTOCONSUL_CONFIRMED_VALUE`

Mesaj exemplu: `details.warranty.summary contains forbidden placeholder`

Valorile `null` nu sunt blocate. Blocul intern `commercial_confirmation` poate păstra placeholder-e — nu este scanat.

## Guard `commercial_status`

Refuză seed-ul **live** (nu dry-run) dacă:

- `commercial_status === "pending_partner_confirmation"`, sau
- `commercial_confirmation.commercial_status === "pending_partner_confirmation"`

Mesaj: `Future Mobility listing cannot be seeded while commercial confirmation is pending.`

Dry-run poate rula cu `pending` pentru a valida transformarea și placeholder-ele publice.

## Imagini obligatorii (seed live)

`listing.images` trebuie să conțină cel puțin un URL valid înainte de insert. Draft-urile pot păstra `images: []` și `ready_for_seed: false`.

## Dry-run

Validare fără Supabase și fără insert:

```bash
FUTURE_MOBILITY_SEED_DRY_RUN=1 \
FUTURE_MOBILITY_SEED_FILE=./data/future-mobility/xiaomi-su7-ultra.draft.json \
npx tsx scripts/seed-future-mobility-listing.ts
```

Dry-run:

- verifică placeholder-e și parser FM;
- transformă content pack-ul;
- afișează sumar (`model_slug`, `title`, lungime descriere, număr imagini);
- **nu** necesită `SUPABASE_*` sau `FUTURE_MOBILITY_LISTING_USER_ID`;
- **nu** scrie în baza de date.

Pentru SU7 Ultra în starea actuală (`commercial_status: pending`), dry-run poate valida transformarea și absența placeholder-elor publice; seed-ul **live** va eșua până la confirmarea comercială.

## Seed live (doar după confirmare ops)

```bash
FUTURE_MOBILITY_SEED_FILE=./path/to/confirmed.seed.json \
FUTURE_MOBILITY_LISTING_USER_ID=<seller-uuid> \
npx tsx scripts/seed-future-mobility-listing.ts
```

Cerințe: `commercial_status` confirmat, fără placeholder-e în `listing`/`details`, imagini populate, `parseFutureMobilityDetails` valid.

## Validarea manuală a unui pachet

1. JSON valid
2. Guard FM — `details.collection === "future_mobility"`
3. Parser — `parseFutureMobilityDetails(details)` non-null
4. Fără placeholder-e în câmpuri publice din `details` / FAQ / copy
5. Comercial confirmat înainte de seed live
6. Imagini cu drepturi înainte de seed live

## Fișiere din acest folder

| Fișier | Model |
|--------|--------|
| `xiaomi-su7-ultra.draft.json` | Xiaomi SU7 Ultra |
| `xiaomi-yu7-max.draft.json` | Xiaomi YU7 Max |
| `avatr-12.draft.json` | AVATR 12 |
| `zeekr-9x.draft.json` | ZEEKR 9X |

Documentație internă: `docs/internal/future-mobility-source-register.md`, `docs/internal/future-mobility-commercial-confirmation-checklist.md`.
