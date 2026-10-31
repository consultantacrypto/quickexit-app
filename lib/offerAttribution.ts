import {
  ATTRIBUTION_UTM_KEYS,
  readUrlAttribution,
  getAttribution,
  type AttributionData,
} from "@/lib/analytics";

export const OFFER_UTM_KEYS = ATTRIBUTION_UTM_KEYS;

export type OfferUtm = Partial<Record<(typeof OFFER_UTM_KEYS)[number], string>>;

/** URL values win. Stored first-touch fills only the keys missing from the URL. */
export function mergeOfferUtm(
  urlUtm: AttributionData | null | undefined,
  storedUtm: AttributionData | null | undefined,
): OfferUtm {
  const out: OfferUtm = {};
  for (const key of OFFER_UTM_KEYS) {
    const value = urlUtm?.[key] || storedUtm?.[key];
    if (typeof value === "string" && value.length > 0) out[key] = value;
  }
  return out;
}

/**
 * Attribution to persist on a listing offer.
 * The live URL is offer metadata for this visit. Stored attribution stays
 * consent-gated inside getAttribution() and is only a fallback.
 */
export function resolveOfferAttribution(): OfferUtm {
  return mergeOfferUtm(readUrlAttribution(), getAttribution());
}

export function offerUtmForInsert(utm: OfferUtm | null | undefined): OfferUtm | null {
  const merged = mergeOfferUtm(utm, {});
  return Object.keys(merged).length > 0 ? merged : null;
}
