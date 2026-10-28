import Stripe from "stripe";
import { getSiteUrl } from "@/lib/siteUrl";

/**
 * Dealer package confirmed by Dani on 2026-10-27: 600 RON for about 10 cars.
 * No billing interval was confirmed, and every other QuickExit catalog price is
 * a one-time Checkout charge. This package follows that pattern: one payment of
 * 600 RON. It does not start a monthly or yearly subscription.
 */
export const DEALER_PACKAGE_ID = "dealer_10";
export const DEALER_CHECKOUT_TYPE = "dealer_subscription";
export const DEALER_AMOUNT_RON = 600;
export const DEALER_AMOUNT_MINOR = 60000;
export const DEALER_CURRENCY = "ron";
export const DEALER_CAPACITY_CARS = 10;
export const DEALER_PRODUCT_ID = "quickexit_dealer_10";
export const DEALER_PRICE_LOOKUP_KEY = "dealer_10_cars_600_ron";
export const DEALER_PRICE_ENV = "STRIPE_PRICE_DEALER_600_RON";
export const DEALER_PRODUCT_NAME = "Abonament parc auto — 10 mașini";
export const DEALER_PRODUCT_DESCRIPTION =
  "Abonament Quick Exit pentru parcuri auto mici și medii. Capacitate de listare pentru aproximativ 10 mașini. 600 RON.";

const STRIPE_API_VERSION = "2023-10-16";
const PRODUCT_IDEMPOTENCY_KEY = "quickexit_dealer_10_product_v1";
const PRICE_IDEMPOTENCY_KEY = "quickexit_dealer_10_price_600_ron_v1";

const ALLOWED_RETURN_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "quickexit.ro",
  "www.quickexit.ro",
  "staging.quickexit.ro",
  "quickexit-staging.vercel.app",
]);

export class DealerPriceConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DealerPriceConfigError";
  }
}

export type DealerPaymentView =
  | { state: "offer" }
  | { state: "cancel" }
  | { state: "success"; email: string | null }
  | { state: "pending" }
  | { state: "mismatch" };

export type DealerWebhookDecision =
  | { action: "paid" }
  | { action: "pending" }
  | {
      action: "rejected";
      code:
        | "dealer_amount_mismatch"
        | "dealer_currency_mismatch"
        | "dealer_identity_mismatch"
        | "dealer_mode_mismatch";
    };

type CatalogPrice = {
  id?: string | null;
  active?: boolean | null;
  currency?: string | null;
  unit_amount?: number | null;
  type?: string | null;
  recurring?: unknown;
};

type DealerSessionShape = {
  mode?: string | null;
  payment_status?: string | null;
  status?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  metadata?: Record<string, string> | null;
  customer_details?: { email?: string | null } | null;
  customer_email?: string | null;
};

export function createQuickExitStripe(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    // Same pin as the existing listing Checkout route.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pinned legacy Stripe API version
    apiVersion: STRIPE_API_VERSION as any,
  });
}

export function assertDealerCatalogPrice(price: CatalogPrice): string {
  if (!price.id) {
    throw new DealerPriceConfigError("dealer_price_missing");
  }
  if (price.active === false) {
    throw new DealerPriceConfigError("dealer_price_inactive");
  }
  if (price.currency !== DEALER_CURRENCY) {
    throw new DealerPriceConfigError("dealer_price_currency");
  }
  if (price.unit_amount !== DEALER_AMOUNT_MINOR) {
    throw new DealerPriceConfigError("dealer_price_amount");
  }
  if (price.type && price.type !== "one_time") {
    throw new DealerPriceConfigError("dealer_price_not_one_time");
  }
  if (price.recurring) {
    throw new DealerPriceConfigError("dealer_price_recurring");
  }
  return price.id;
}

function stripeErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function isMissingResource(error: unknown): boolean {
  return stripeErrorCode(error) === "resource_missing";
}

function isAlreadyExists(error: unknown): boolean {
  return stripeErrorCode(error) === "resource_already_exists";
}

async function findDealerPrice(stripe: Stripe): Promise<string | null> {
  const listed = await stripe.prices.list({
    lookup_keys: [DEALER_PRICE_LOOKUP_KEY],
    active: true,
    limit: 1,
  });
  const price = listed.data[0];
  if (!price) return null;
  return assertDealerCatalogPrice(price);
}

async function ensureDealerProduct(stripe: Stripe): Promise<void> {
  try {
    await stripe.products.retrieve(DEALER_PRODUCT_ID);
    return;
  } catch (error: unknown) {
    if (!isMissingResource(error)) throw error;
  }

  try {
    await stripe.products.create(
      {
        id: DEALER_PRODUCT_ID,
        name: DEALER_PRODUCT_NAME,
        description: DEALER_PRODUCT_DESCRIPTION,
        tax_code: "txcd_10102001",
        metadata: {
          quickexit_package: DEALER_PACKAGE_ID,
          capacity_cars: String(DEALER_CAPACITY_CARS),
          amount_ron: String(DEALER_AMOUNT_RON),
          confirmed_on: "2026-10-27",
        },
      },
      { idempotencyKey: PRODUCT_IDEMPOTENCY_KEY },
    );
  } catch (error: unknown) {
    if (isAlreadyExists(error)) return;
    throw error;
  }
}

/**
 * Uses STRIPE_PRICE_DEALER_600_RON when set. Otherwise finds or creates the
 * 600 RON one-time price on the Stripe account already used by QuickExit.
 */
export async function ensureDealerPrice(stripe: Stripe): Promise<string> {
  const fromEnv = process.env[DEALER_PRICE_ENV]?.trim();
  if (fromEnv) {
    const price = await stripe.prices.retrieve(fromEnv);
    return assertDealerCatalogPrice(price);
  }

  const existing = await findDealerPrice(stripe);
  if (existing) return existing;

  await ensureDealerProduct(stripe);

  try {
    const created = await stripe.prices.create(
      {
        product: DEALER_PRODUCT_ID,
        currency: DEALER_CURRENCY,
        unit_amount: DEALER_AMOUNT_MINOR,
        tax_behavior: "exclusive",
        lookup_key: DEALER_PRICE_LOOKUP_KEY,
        metadata: {
          quickexit_package: DEALER_PACKAGE_ID,
          capacity_cars: String(DEALER_CAPACITY_CARS),
          amount_ron: String(DEALER_AMOUNT_RON),
        },
      },
      { idempotencyKey: PRICE_IDEMPOTENCY_KEY },
    );
    return assertDealerCatalogPrice(created);
  } catch (error: unknown) {
    const again = await findDealerPrice(stripe);
    if (again) return again;
    throw error;
  }
}

export function isStripeCheckoutUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      (parsed.hostname === "checkout.stripe.com" || parsed.hostname === "pay.stripe.com")
    );
  } catch {
    return false;
  }
}

export function isDealerCheckoutSessionId(value: string): boolean {
  return /^cs_(test|live)_[A-Za-z0-9]+$/.test(value) && value.length <= 255;
}

function isAllowedReturnHost(hostname: string): boolean {
  if (ALLOWED_RETURN_HOSTS.has(hostname)) return true;
  return hostname.endsWith(".vercel.app") && hostname.includes("quickexit");
}

/** Success and cancel URLs stay on the host that opened Checkout. */
export function resolveDealerReturnOrigin(headers: Headers): string {
  const fallback = getSiteUrl();
  const hostHeader = headers.get("x-forwarded-host") || headers.get("host");
  if (!hostHeader) return fallback;
  const host = hostHeader.split(",")[0]?.trim() ?? "";
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  if (!host || !isAllowedReturnHost(hostname)) return fallback;

  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const proto = isLocal ? "http" : forwardedProto === "http" ? "http" : "https";
  return `${proto}://${host}`;
}

function sessionIdentityOk(session: DealerSessionShape): boolean {
  return (
    session.metadata?.type === DEALER_CHECKOUT_TYPE &&
    session.metadata?.packageId === DEALER_PACKAGE_ID &&
    session.mode === "payment" &&
    session.currency === DEALER_CURRENCY &&
    session.amount_total === DEALER_AMOUNT_MINOR
  );
}

export function classifyDealerCheckoutSession(session: DealerSessionShape): DealerPaymentView {
  if (!sessionIdentityOk(session)) return { state: "mismatch" };
  const email = session.customer_details?.email?.trim() || session.customer_email?.trim() || null;
  if (session.status === "complete" && session.payment_status === "paid") {
    return { state: "success", email };
  }
  return { state: "pending" };
}

export function classifyDealerWebhookSession(session: DealerSessionShape): DealerWebhookDecision {
  const metadata = session.metadata ?? {};
  if (metadata.type !== DEALER_CHECKOUT_TYPE || metadata.packageId !== DEALER_PACKAGE_ID) {
    return { action: "rejected", code: "dealer_identity_mismatch" };
  }
  if (session.mode !== "payment") {
    return { action: "rejected", code: "dealer_mode_mismatch" };
  }
  if (session.currency !== DEALER_CURRENCY) {
    return { action: "rejected", code: "dealer_currency_mismatch" };
  }
  if (session.amount_total !== DEALER_AMOUNT_MINOR) {
    return { action: "rejected", code: "dealer_amount_mismatch" };
  }
  if (session.status === "complete" && session.payment_status === "paid") {
    return { action: "paid" };
  }
  return { action: "pending" };
}
