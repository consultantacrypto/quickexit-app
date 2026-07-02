/**
 * Example payload shape for Future Mobility listings.
 * Replace every `REPLACE_WITH_CONFIRMED_*` value before production insert.
 * Do NOT publish with placeholder commercial data.
 */
import { FUTURE_MOBILITY_COLLECTION } from "@/lib/futureMobility";

export const FUTURE_MOBILITY_FIXTURE_EXAMPLE = {
  listing: {
    title: "REPLACE_WITH_CONFIRMED_MODEL_NAME",
    category: "Auto & Moto",
    description: "REPLACE_WITH_CONFIRMED_MARKETING_COPY",
    market_price: null as number | null,
    exit_price: null as number | null,
    discount: null as number | null,
    deal_score: null as number | null,
    sale_strategy: "standard",
    status: "active",
    is_seed: false,
    images: [] as string[],
  },
  details: {
    collection: FUTURE_MOBILITY_COLLECTION,
    model_slug: "REPLACE_WITH_CONFIRMED_SLUG",
    availability_type: "on_order" as const,
    delivery_estimate: "REPLACE_WITH_CONFIRMED_DELIVERY_ESTIMATE",
    delivery_note: "REPLACE_WITH_CONFIRMED_DELIVERY_NOTE",
    price_display: "from" as const,
    make: "REPLACE_WITH_CONFIRMED_MAKE",
    model: "REPLACE_WITH_CONFIRMED_MODEL",
    fuel: "Electric",
    transmission: "REPLACE_WITH_CONFIRMED_TRANSMISSION",
    bodyType: "REPLACE_WITH_CONFIRMED_BODY_TYPE",
    badges: ["FUTURE_COLLECTION", "IMPORT_PREMIUM", "EV_PREMIUM", "CONFIGURABIL"],
    ev_specs: {
      power_hp: null,
      battery_kwh: null,
      range_km_wltp: null,
      acceleration_0_100: "REPLACE_WITH_CONFIRMED_SPEC",
    },
    dealer_partner: {
      name: "REPLACE_WITH_CONFIRMED_PARTNER_NAME",
      website: "REPLACE_WITH_CONFIRMED_PARTNER_URL",
      description: "REPLACE_WITH_CONFIRMED_PARTNER_DESCRIPTION",
    },
    videos: [
      {
        provider: "youtube" as const,
        url: "REPLACE_WITH_CONFIRMED_YOUTUBE_URL",
        title: "REPLACE_WITH_CONFIRMED_VIDEO_TITLE",
      },
    ],
    faq: [
      {
        q: "REPLACE_WITH_CONFIRMED_FAQ_QUESTION",
        a: "REPLACE_WITH_CONFIRMED_FAQ_ANSWER",
      },
    ],
  },
};
