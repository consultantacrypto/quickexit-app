/**
 * Server-side GA4 purchase via the Measurement Protocol.
 *
 * Env:
 * - GA4_MEASUREMENT_PROTOCOL_API_SECRET — required. If unset, this is a no-op.
 * - GA_MEASUREMENT_ID — optional override. Falls back to
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID, then G-8LLK172SCX.
 *
 * Create the secret in GA4: Admin → Data streams → the web stream →
 * Measurement Protocol API secrets. Do not commit the secret.
 *
 * This fires only after a Stripe payment is recorded. It is separate from the
 * consent-gated browser tag. Turning the secret on is the operator's choice
 * about server-side measurement.
 */

export type Ga4PurchaseInput = {
  clientId?: string | null;
  userId?: string | null;
  transactionId: string;
  currency: string;
  value: number;
  items: Array<{
    item_id: string;
    item_name: string;
    price: number;
    quantity: number;
  }>;
};

export type Ga4PurchaseResult =
  | { sent: true }
  | { sent: false; reason: "missing_secret" | "invalid_event" | "request_failed" };

const DEFAULT_MEASUREMENT_ID = "G-8LLK172SCX";

export function ga4MeasurementId(): string {
  return (
    process.env.GA_MEASUREMENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ||
    DEFAULT_MEASUREMENT_ID
  );
}

export function ga4MeasurementProtocolSecret(): string {
  return process.env.GA4_MEASUREMENT_PROTOCOL_API_SECRET?.trim() || "";
}

function fallbackClientId(userId: string | null | undefined, transactionId: string): string {
  const compact = String(userId || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 32);
  if (compact) return `qe.${compact}`;
  const txn = transactionId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 32);
  return `qe.${txn || "purchase"}`;
}

export async function sendGa4PurchaseEvent(input: Ga4PurchaseInput): Promise<Ga4PurchaseResult> {
  const secret = ga4MeasurementProtocolSecret();
  if (!secret) return { sent: false, reason: "missing_secret" };
  if (!input.transactionId || !Number.isFinite(input.value) || input.value < 0) {
    return { sent: false, reason: "invalid_event" };
  }

  const measurementId = ga4MeasurementId();
  const clientId =
    input.clientId && /^\d+\.\d+$/.test(input.clientId)
      ? input.clientId
      : fallbackClientId(input.userId, input.transactionId);

  const body: Record<string, unknown> = {
    client_id: clientId,
    events: [
      {
        name: "purchase",
        params: {
          transaction_id: input.transactionId.slice(0, 120),
          currency: input.currency.toUpperCase().slice(0, 8) || "RON",
          value: Number(input.value.toFixed(2)),
          engagement_time_msec: 1,
          items: input.items.slice(0, 10),
        },
      },
    ],
  };
  if (input.userId) body.user_id = input.userId.slice(0, 80);

  const endpoint = new URL("https://www.google-analytics.com/mp/collect");
  endpoint.searchParams.set("measurement_id", measurementId);
  endpoint.searchParams.set("api_secret", secret);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return { sent: false, reason: "request_failed" };
    return { sent: true };
  } catch {
    return { sent: false, reason: "request_failed" };
  }
}
