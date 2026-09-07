export const RESERVED_ANALYTICS_PARAM_KEYS = [
  "source",
  "medium",
  "campaign",
  "campaign_id",
  "term",
  "content",
  "gclid",
  "dclid",
] as const;

const RESERVED = new Set<string>(RESERVED_ANALYTICS_PARAM_KEYS);

export type VendorEventParams = Record<
  string,
  string | number | boolean | null | undefined
>;

/**
 * Fail-closed strip of GA4 reserved traffic keys.
 * `utm_source` / `utm_medium` / `utm_campaign` / `utm_content` / `utm_term` are kept.
 * `funnel_source` and `interaction_source` are kept.
 */
export function stripReservedAnalyticsParams(
  params?: VendorEventParams | null,
): VendorEventParams {
  const out: VendorEventParams = {};
  if (!params || typeof params !== "object") return out;
  for (const [key, value] of Object.entries(params)) {
    if (RESERVED.has(key)) continue;
    out[key] = value;
  }
  return out;
}
