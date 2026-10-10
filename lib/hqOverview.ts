/**
 * Main HQ overview data contract — explicit columns only (no select *).
 * Used by GET /api/hq/overview and client type alignment.
 */

export const HQ_OVERVIEW_LIMITS = {
  listings: 200,
  demands: 200,
  listingOffers: 200,
  demandOffers: 200,
  profiles: 300,
  valuationReports: 300,
  riskResolutions: 50,
} as const;

export const HQ_LISTING_COLUMNS = [
  "id",
  "title",
  "category",
  "status",
  "is_seed",
  "market_price",
  "exit_price",
  "created_at",
  "user_id",
  "details",
  "images",
  "sale_strategy",
  "location",
  "discount",
  "discount_percentage",
  "deal_score",
].join(", ");

export const HQ_DEMAND_COLUMNS = [
  "id",
  "target_asset",
  "category",
  "budget",
  "budget_min",
  "status",
  "buyer_id",
  "created_at",
].join(", ");

export const HQ_LISTING_OFFER_COLUMNS = [
  "id",
  "listing_id",
  "offer_price",
  "message",
  "status",
  "buyer_phone",
  "buyer_email",
  "created_at",
].join(", ");

export const HQ_DEMAND_OFFER_COLUMNS = [
  "id",
  "demand_id",
  "offer_price",
  "status",
  "created_at",
].join(", ");

export const HQ_PROFILE_COLUMNS = [
  "id",
  "full_name",
  "kyc_status",
  "user_type",
  "created_at",
].join(", ");

export const HQ_VALUATION_COLUMNS = [
  "id",
  "confidence_score",
  "created_at",
].join(", ");

export const HQ_RISK_RESOLUTION_COLUMNS = [
  "id",
  "risk_key",
  "risk_type",
  "entity_table",
  "entity_id",
  "severity",
  "title",
  "note",
  "resolved_by",
  "resolved_at",
  "created_at",
].join(", ");

export type HqRiskResolutionInsert = {
  risk_key: string;
  risk_type: string;
  entity_table: string | null;
  entity_id: string | null;
  severity: string;
  title: string;
  note: string | null;
};

const ALLOWED_RISK_SEVERITIES = new Set(["critical", "high", "medium", "low"]);

function asTrimmedString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (!t) return null;
  return t.slice(0, max);
}

/**
 * Parse + whitelist risk resolution body. Admin identity is NOT accepted from client.
 */
export function parseHqRiskResolutionBody(
  body: unknown,
): { ok: true; data: HqRiskResolutionInsert } | { ok: false; status: number; error: string; error_code: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, error: "invalid_request", error_code: "invalid_request" };
  }
  const raw = body as Record<string, unknown>;

  // Reject client-supplied admin identity / arbitrary columns.
  if ("resolved_by" in raw || "id" in raw || "resolved_at" in raw || "created_at" in raw) {
    return { ok: false, status: 400, error: "invalid_request", error_code: "invalid_request" };
  }

  const risk_key = asTrimmedString(raw.risk_key, 200);
  const risk_type = asTrimmedString(raw.risk_type, 120);
  const title = asTrimmedString(raw.title, 300);
  const severityRaw = asTrimmedString(raw.severity, 32)?.toLowerCase() ?? "";

  if (!risk_key || !risk_type || !title) {
    return { ok: false, status: 400, error: "invalid_request", error_code: "invalid_request" };
  }
  if (!ALLOWED_RISK_SEVERITIES.has(severityRaw)) {
    return { ok: false, status: 400, error: "invalid_request", error_code: "invalid_request" };
  }

  let entity_table: string | null = null;
  if (raw.entity_table != null) {
    entity_table = asTrimmedString(raw.entity_table, 64);
    if (!entity_table) {
      return { ok: false, status: 400, error: "invalid_request", error_code: "invalid_request" };
    }
  }

  let entity_id: string | null = null;
  if (raw.entity_id != null) {
    entity_id = asTrimmedString(raw.entity_id, 64);
    if (!entity_id) {
      return { ok: false, status: 400, error: "invalid_request", error_code: "invalid_request" };
    }
  }

  let note: string | null = null;
  if (raw.note != null && raw.note !== "") {
    note = asTrimmedString(String(raw.note), 1000);
  }

  return {
    ok: true,
    data: {
      risk_key,
      risk_type,
      entity_table,
      entity_id,
      severity: severityRaw,
      title,
      note,
    },
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isHqUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}
