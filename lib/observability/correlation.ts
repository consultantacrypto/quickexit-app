import { randomUUID } from "crypto";

/** Stripe metadata key — additive; existing fulfillment readers ignore unknown keys. */
export const QE_CORRELATION_METADATA_KEY = "qe_correlation_id";

const HEADER_CANDIDATES = [
  "x-correlation-id",
  "x-request-id",
  "x-vercel-id",
] as const;

export function createCorrelationId(): string {
  return randomUUID();
}

export function resolveCorrelationIdFromHeaders(
  headers: Headers,
): string | null {
  for (const name of HEADER_CANDIDATES) {
    const value = headers.get(name)?.trim();
    if (value && value.length <= 128) return value;
  }
  return null;
}

/**
 * Prefer inbound request correlation; otherwise mint a new id.
 */
export function ensureCorrelationId(headers?: Headers | null): string {
  if (headers) {
    const existing = resolveCorrelationIdFromHeaders(headers);
    if (existing) return existing;
  }
  return createCorrelationId();
}

export function correlationFromStripeMetadata(
  metadata: Record<string, string> | null | undefined,
): string | null {
  if (!metadata) return null;
  const value = metadata[QE_CORRELATION_METADATA_KEY]?.trim();
  return value && value.length <= 128 ? value : null;
}

export function withCorrelationMetadata(
  metadata: Record<string, string>,
  correlationId: string,
): Record<string, string> {
  return {
    ...metadata,
    [QE_CORRELATION_METADATA_KEY]: correlationId,
  };
}
