/**
 * Canonical QuickExit live Stripe webhook destination:
 * https://www.quickexit.ro/api/stripe/webhook
 *
 * Apex https://quickexit.ro/api/stripe/webhook currently 307s to www. Stripe
 * deliveries must not follow that redirect; configure the existing endpoint
 * URL to the www origin without creating a new endpoint or rotating the secret.
 */
import { PRODUCTION_SITE_URL } from "@/lib/siteUrl";
import { getPackageByPriceId } from "@/lib/stripePackages";
import { validatePersistedSaleIntent } from "@/lib/listingSaleStrategy";

export const CANONICAL_STRIPE_WEBHOOK_PATH = "/api/stripe/webhook";
export const CANONICAL_STRIPE_WEBHOOK_URL = `${PRODUCTION_SITE_URL}${CANONICAL_STRIPE_WEBHOOK_PATH}`;

export type StripeFulfillmentRecord = {
  event_id: string;
  checkout_session_id: string;
  payment_intent_id: string | null;
  amount: number;
  currency: string;
  price_id: string | null;
  fulfilled_at: string;
  result: "activated" | "idempotent";
};

export type ListingFulfillmentFailureCode =
  | "missing_listing_id"
  | "unknown_price_id"
  | "amount_mismatch"
  | "currency_mismatch"
  | "object_not_found"
  | "zero_row_update"
  | "ambiguous_update"
  | "activation_failed"
  | "conflicting_session"
  | "test_mode"
  | "incompatible_sale_intent"
  | "not_paid"
  | "invalid_amount"
  | "session_not_complete"
  | "package_mismatch";

export function listingFulfillmentHttpStatus(code: ListingFulfillmentFailureCode): number {
  switch (code) {
    case "missing_listing_id":
    case "amount_mismatch":
    case "currency_mismatch":
    case "incompatible_sale_intent":
    case "invalid_amount":
    case "session_not_complete":
    case "package_mismatch":
      return 422;
    case "conflicting_session":
      return 409;
    case "test_mode":
      return 400;
    case "not_paid":
      return 200;
    default:
      return 500;
  }
}

export function classifyWebhookProbeStatus(status: number): "direct" | "redirect" | "other" {
  if (status >= 300 && status < 400) return "redirect";
  if (status > 0) return "direct";
  return "other";
}

function detailsRecord(details: unknown): Record<string, unknown> | null {
  if (details === null || typeof details !== "object" || Array.isArray(details)) return null;
  return details as Record<string, unknown>;
}

export function storedCheckoutSessionId(details: unknown): string | null {
  const rec = detailsRecord(details);
  const fulfillment = rec?.stripe_fulfillment;
  if (!fulfillment || typeof fulfillment !== "object" || Array.isArray(fulfillment)) return null;
  const id = (fulfillment as { checkout_session_id?: unknown }).checkout_session_id;
  return typeof id === "string" && id.startsWith("cs_") ? id : null;
}

export function classifyAlreadyActiveFulfillment(
  storedSessionId: string | null,
  incomingSessionId: string,
): "idempotent" | "conflicting_session" {
  const incoming = incomingSessionId.trim();
  if (!incoming) return "conflicting_session";
  if (!storedSessionId) return "idempotent";
  return storedSessionId === incoming ? "idempotent" : "conflicting_session";
}

export function parseCheckoutObjectType(value: unknown): "listing" | "demand" | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (raw === "listing" || raw === "demand") return raw;
  return null;
}

export function classifyCheckoutSessionContract(session: {
  status?: string | null;
  payment_status?: string | null;
}): "ok" | "session_not_complete" | "not_paid" {
  if (String(session.status ?? "").toLowerCase() !== "complete") return "session_not_complete";
  if (String(session.payment_status ?? "").toLowerCase() !== "paid") return "not_paid";
  return "ok";
}

export function classifyLostActivationRace(params: {
  currentStatus?: string | null;
  storedSessionId: string | null;
  incomingSessionId: string;
}): "idempotent" | "conflicting_session" | "retry" {
  if (params.currentStatus === "active") {
    return classifyAlreadyActiveFulfillment(params.storedSessionId, params.incomingSessionId);
  }
  return "retry";
}

export function listingPriceMatchesPaidPrice(params: {
  listingPriceId: string | null;
  paidPriceId: string | null;
}): boolean {
  return Boolean(params.listingPriceId && params.paidPriceId && params.listingPriceId === params.paidPriceId);
}

export function mergeStripeFulfillmentIntoDetails(
  details: unknown,
  fulfillment: StripeFulfillmentRecord,
): Record<string, unknown> {
  const base = detailsRecord(details) ? { ...detailsRecord(details)! } : {};
  base.stripe_fulfillment = fulfillment;
  return base;
}

export function classifyPaidSessionAmount(params: {
  amountTotal: number;
  currency: string;
  expectedAmount: number;
}): "ok" | "amount_mismatch" | "currency_mismatch" | "invalid_amount" {
  const currency = String(params.currency ?? "").toLowerCase();
  if (!Number.isFinite(params.amountTotal) || params.amountTotal <= 0) return "invalid_amount";
  if (currency !== "ron") return "currency_mismatch";
  if (params.amountTotal !== params.expectedAmount) return "amount_mismatch";
  return "ok";
}

export function expectedMinorAmountForPriceId(priceId: string): number | null {
  const pkg = getPackageByPriceId(priceId);
  if (!pkg) return null;
  return Math.round(pkg.amountRon * 100);
}

export function assertListingSaleIntentForFulfillment(listing: {
  sale_strategy?: string | null;
  details?: unknown;
}): { ok: true } | { ok: false; code: "incompatible_sale_intent" } {
  const intent = validatePersistedSaleIntent(listing);
  if (!intent.ok) return { ok: false, code: "incompatible_sale_intent" };
  return { ok: true };
}
