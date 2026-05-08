# Quick Exit GA4 Events

## Scop

Evenimentele GA4 din Quick Exit sunt folosite pentru:
- analiză de funnel (seller, buyer, ofertare, distribuție),
- analiză de produs (ce acțiuni folosesc utilizatorii în flow-uri),
- analiză de distribuție (share/copy behavior),
- integrare ulterioară în HQ Copilot pentru insight-uri operaționale și prioritizare.

## Reguli Privacy

În tracking-ul GA4 respectăm reguli stricte de minimizare date:
- nu trimitem `email`
- nu trimitem `telefon`
- nu trimitem `full_name`
- nu trimitem `access token`
- nu trimitem date KYC
- nu trimitem texte libere introduse de user
- `listing_id` și `demand_id` sunt permise ca identificatori operaționali

## Lista Evenimentelor

| event_name | pagină | moment declanșare | parametri | scop business |
|---|---|---|---|---|
| `click_evaluate` | `app/page.tsx` | click CTA către `/evaluare` | `source` | măsoară intrarea în funnel-ul de evaluare |
| `click_post_listing` | `app/page.tsx` | click CTA către `/pune-anunt` | `source` | măsoară intenția directă de publicare anunț |
| `click_capital_available` | `app/page.tsx` | click CTA către `/capital-disponibil` | `source` | măsoară interesul pentru cereri active |
| `start_evaluation` | `app/evaluare/page.tsx` | la pornirea evaluării | `category` | măsoară începutul evaluării pe categorii |
| `evaluation_success` | `app/evaluare/page.tsx` | la evaluare reușită | `category`, `data_quality_label`, `confidence_score` | măsoară calitatea și finalizarea evaluării |
| `start_post_listing` | `app/pune-anunt/page.tsx` | la intrarea efectivă în flow-ul de publicare | `category` | măsoară începutul funnel-ului seller |
| `checkout_listing_started` | `app/pune-anunt/page.tsx` | înainte de pornirea checkout listing | `category`, `package_id`, `sale_strategy`, `price` | măsoară intenția de plată seller |
| `start_post_demand` | `app/posteaza-cerere/page.tsx` | la intrarea în flow-ul de cerere | `category` | măsoară începutul funnel-ului buyer |
| `checkout_demand_started` | `app/posteaza-cerere/page.tsx` | înainte de pornirea checkout demand | `category`, `price` | măsoară intenția de plată buyer |
| `view_capital_disponibil` | `app/capital-disponibil/page.tsx` | la încărcare pagină (client-side) | `page_path` | măsoară trafic pe zona de cereri active |
| `click_send_demand_offer` | `app/capital-disponibil/page.tsx` | click pe „Trimite ofertă” | `demand_id`, `category` | măsoară trecerea spre funnel ofertare |
| `view_listing` | `app/anunt/[id]/page.tsx` | la încărcare anunț activ | `listing_id`, `category`, `status` | măsoară view-uri pe anunțuri active |
| `click_listing_offer` | `app/anunt/[id]/page.tsx` | click CTA ofertă pe pagina anunțului | `listing_id`, `category` | măsoară intenția de ofertare pe listing |
| `copy_social_share` | `app/anunt/[id]/page.tsx` | la copy în Social Distribution Kit | `listing_id`, `channel` | măsoară distribuția organică per canal |
| `submit_demand_offer` | `app/trimite-oferta/[id]/page.tsx` | după submit ofertă cu succes | `demand_id`, `category` | măsoară conversia în funnel-ul de ofertare |
| `click_pricing_package` | `app/tarife/page.tsx` | click pe CTA pachet | `package_id`, `price` | măsoară interesul pe pachete și prețuri |
| `hq_copilot_run` | `app/hq-admin/page.tsx` | la rulare HQ Copilot | `mode` | măsoară utilizarea funcției admin/copilot |

## Acquisition CTA events

| event_name | pagină | destination | scop business |
|---|---|---|---|
| `click_investor_below_market_guide` | `app/pentru-investitori/page.tsx` | `/ghid/active-sub-pretul-pietei` | măsoară interesul buyer pentru ghidul de analiză oportunități |
| `click_investor_view_assets` | `app/pentru-investitori/page.tsx` | `/capital-disponibil` | măsoară trecerea investitorilor în zona activelor/cererilor active |
| `click_investor_post_demand` | `app/pentru-investitori/page.tsx` | `/posteaza-cerere` | măsoară intenția de publicare cerere cumpărare din pagina investitori |
| `click_seller_exit_price_guide` | `app/pentru-vanzatori/page.tsx` | `/ghid/exit-price` | măsoară interesul seller pentru ghidul de pricing |
| `click_seller_evaluate_asset` | `app/pentru-vanzatori/page.tsx` | `/evaluare` | măsoară intrarea seller în funnel-ul de evaluare din pagina dedicată |
| `click_seller_post_listing` | `app/pentru-vanzatori/page.tsx` | `/pune-anunt` | măsoară intenția directă de publicare anunț din pagina seller |
| `click_seller_view_pricing` | `app/pentru-vanzatori/page.tsx` | `/tarife` | măsoară interesul seller pentru pachete/tarife |
| `click_guide_exit_price_evaluate` | `app/ghid/exit-price/page.tsx` | `/evaluare` | măsoară progresul din ghid în funnel-ul de evaluare |
| `click_guide_exit_price_post_listing` | `app/ghid/exit-price/page.tsx` | `/pune-anunt` | măsoară progresul din ghid în funnel-ul de publicare |
| `click_guide_exit_price_view_assets` | `app/ghid/exit-price/page.tsx` | `/` | măsoară revenirea din ghid către zona de active |
| `click_guide_below_market_investors` | `app/ghid/active-sub-pretul-pietei/page.tsx` | `/pentru-investitori` | măsoară progresul din ghid către pagina de investitori |
| `click_guide_below_market_view_assets` | `app/ghid/active-sub-pretul-pietei/page.tsx` | `/` | măsoară revenirea din ghid către marketplace |
| `click_guide_below_market_post_demand` | `app/ghid/active-sub-pretul-pietei/page.tsx` | `/posteaza-cerere` | măsoară intenția buyer de a publica cerere din ghid |

## Checkout outcome events

| event_name | când se trimite | params | flow | notes |
|---|---|---|---|---|
| `checkout_listing_success` | la redirect în `dashboard` după checkout listing cu `payment=success` | `source`, `checkout_type`, `status`, `listing_id`, `session_id`, `payment` | listing | tracking client-side pe redirect; webhook rămâne sursa finală pentru activare |
| `checkout_listing_cancel` | la redirect în `dashboard` după anulare checkout listing cu `payment=cancel` | `source`, `checkout_type`, `status`, `listing_id`, `session_id`, `payment` | listing | tracking client-side pe redirect; webhook nu activează listing-ul la cancel |
| `checkout_demand_success` | la redirect în `dashboard` după checkout demand cu `payment=success` | `source`, `checkout_type`, `status`, `demand_id`, `session_id`, `payment` | demand | tracking client-side pe redirect; webhook rămâne sursa finală pentru activare |
| `checkout_demand_cancel` | la redirect în `dashboard` după anulare checkout demand cu `payment=cancel` | `source`, `checkout_type`, `status`, `demand_id`, `session_id`, `payment` | demand | tracking client-side pe redirect; webhook nu activează demand-ul la cancel |

## Offer intent events

| event_name | când se trimite | params | PII note | scop business |
|---|---|---|---|---|
| `submit_listing_offer` | după insert reușit în `listing_offers` din `app/anunt/[id]/AnuntClient.tsx` (ofertă custom) | `source`, `listing_id`, `category`, `offer_type`, `amount`, `status` | nu trimite `buyer_phone`, `buyer_email`, `message` | măsoară conversia de ofertare pe listing activ |
| `submit_accept_exit_price` | după insert reușit în `listing_offers` din `app/anunt/[id]/AnuntClient.tsx` (accept preț exit) | `source`, `listing_id`, `category`, `offer_type`, `amount`, `status` | nu trimite `acceptPhone`, `acceptEmail`, text liber | măsoară intenția fermă de cumpărare la prețul afișat |
| `dashboard_offer_accept` | după update reușit al statusului ofertei în `app/dashboard/page.tsx` | `source`, `offer_id`, `listing_id`, `demand_id`, `offer_context`, `status` | nu trimite date de contact din ofertă | măsoară deciziile de acceptare în camera de negociere |
| `dashboard_offer_reject` | după update reușit al statusului ofertei în `app/dashboard/page.tsx` | `source`, `offer_id`, `listing_id`, `demand_id`, `offer_context`, `status` | nu trimite date de contact din ofertă | măsoară deciziile de respingere în camera de negociere |

## Attribution fields

- Capturăm first-touch în browser pentru: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `referrer`, `landing_path`, `first_seen_at`.
- Persistența este în `localStorage` pe cheia `quickexit_attribution`.
- Strategia din acest sprint este strict **first-touch only** (nu suprascriem datele existente și nu implementăm last-touch).
- `referrer` este sanitizat la format `origin + pathname` (fără query params), iar câmpurile sunt limitate defensiv la lungime maximă.
- Câmpurile se atașează automat în `trackEvent` cu prefix:
  - `attribution_utm_source`
  - `attribution_utm_medium`
  - `attribution_utm_campaign`
  - `attribution_utm_content`
  - `attribution_utm_term`
  - `attribution_referrer`
  - `attribution_landing_path`
  - `attribution_first_seen_at`
- Nu colectăm PII (fără email, telefon, nume, mesaje, user id).
- În acest sprint nu persistăm attribution în DB și nu facem passthrough către Stripe metadata.

### Stripe checkout metadata attribution

- Attribution first-touch este trimis din client către checkout API pentru flow-urile:
  - listing checkout (`/api/checkout`)
  - demand checkout (`/api/checkout-demand`)
- Câmpurile acceptate sunt whitelist-only: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `referrer`, `landing_path`, `first_seen_at`.
- Server-side se aplică sanitizare defensivă: doar stringuri, `trim()`, max 120 caractere, ignorare completă pentru câmpuri nepermise.
- În Stripe Session metadata câmpurile sunt mapate cu prefix `attr_*`:
  - `attr_utm_source`, `attr_utm_medium`, `attr_utm_campaign`, `attr_utm_content`, `attr_utm_term`
  - `attr_referrer`, `attr_landing_path`, `attr_first_seen_at`
- Nu se trimit PII în metadata Stripe.
- Dacă attribution lipsește sau e invalid, checkout continuă normal.
- Logica de activare webhook rămâne neschimbată și nu depinde de `attr_*`.
- Persistența în DB pentru attribution încă nu există.

## Funnel-uri Urmărite

- **Funnel vânzător:** `home` → `evaluare` → `pune-anunt` → `checkout listing`
- **Funnel cumpărător:** `home/capital` → `posteaza-cerere` → `checkout demand`
- **Funnel ofertare:** `capital-disponibil` → `trimite-oferta` → `submit_demand_offer`
- **Funnel distribuție:** `view_listing` → `copy_social_share` → trafic UTM ulterior
- **Funnel admin:** `hq_copilot_run`

## Recomandări Viitoare (Sprint 3B+)

- standardizare parametru `source` pe toate evenimentele de click/importante
- integrare Google Analytics Data API în HQ Copilot pentru insight-uri automate
- evaluare `page_view` custom doar dacă apare nevoie reală (evităm dublări inutile)
- tracking conversii reale din webhook, separat, server-side, într-un sprint viitor

