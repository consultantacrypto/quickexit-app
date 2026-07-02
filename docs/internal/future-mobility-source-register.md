# Future Mobility — Source Register (internal)

Registru de proveniență pentru pachetele din `data/future-mobility/*.draft.json`.

## Tipuri de sursă (`source_type`)

| Tip | Semnificație |
|-----|----------------|
| `oem_official` | Date publicate de producător (site, press kit, configurator) |
| `partner_commercial` | Confirmare AutoConsul (preț, livrare, versiune import) |
| `internal_structure` | Structură pregătită în pachet, fără valoare comercială |
| `internal_guidance` | Recomandări Sprint / gap față de schema runtime |
| `n/a` | Câmp intenționat gol |

## Status verificare (`verification_status`)

| Status | Acțiune |
|--------|---------|
| `confirmed` | Poate fi afișat public după review legal |
| `pending` | Așteaptă document sau confirmare partener |
| `draft` | Structură internă, nepublicabil |
| `intentionally_omitted` | Deliberat necompletat (ex. WLTP fără sursă) |
| `schema_gap` | Util pentru produs, dar nu există în `lib/futureMobility.ts` |

## Modele — rezumat surse

### Xiaomi SU7 Ultra

| Domeniu | Status | Sursă principală |
|---------|--------|------------------|
| Performanță (1548 PS, 1.98s, 350 km/h) | confirmed | OEM oficial |
| Încărcare (11 min, 5.2C) | confirmed | OEM oficial |
| Dimensiuni | confirmed | OEM oficial |
| Baterie (Qilin 2.0, fără kWh) | partial | OEM — capacitate nepublicată în brief |
| Culori (5) | confirmed | OEM — disponibilitate RO pending |
| WLTP | intentionally_omitted | — |
| Preț / livrare RO | pending | AutoConsul |

### Xiaomi YU7 Max

| Domeniu | Status | Sursă principală |
|---------|--------|------------------|
| Putere, baterie, CLTC | confirmed | OEM oficial |
| CLTC vs WLTP | confirmed | Menționat explicit în copy |
| Dimensiuni | pending | Neincluse în brief |
| Culori | pending | Press kit de completat |
| Comercial | pending | AutoConsul |

### AVATR 12

| Domeniu | Status | Sursă principală |
|---------|--------|------------------|
| Dimensiuni, ecran, audio, culori | confirmed | Pagină oficială AVATR |
| Huawei Qiankun | confirmed | Pagină oficială |
| EV / REEV specs | pending | Versiune import AutoConsul |
| Comercial | pending | AutoConsul |

### ZEEKR 9X

| Domeniu | Status | Sursă principală |
|---------|--------|------------------|
| Super Hybrid, flagship SUV | confirmed | Poziționare OEM |
| Toate specs performanță | pending | Fișă tehnică versiune import |
| Badge-uri NEW_ENERGY / SUPER_HYBRID | schema_gap | Brief Sprint 1B |
| Comercial | pending | AutoConsul |

## Proces de actualizare

1. Partenerul confirmă câmpul în `commercial_confirmation`.
2. Se adaugă/actualizează rând în `source_registry` cu `verification_status: confirmed`.
3. Se actualizează `internal_validation` și `ready_for_seed` doar când toate blocking fields sunt rezolvate.
4. Nu se trece `commercial_status` la `confirmed` fără document intern semnat/validat ops.

## Interzis în source_registry

- Prețuri estimate sau „de piață” fără confirmare
- URL-uri imagini neverificate
- Contact partener nevalidat
- Afirmații „dealer oficial” / „importator autorizat” fără dovadă contractuală
