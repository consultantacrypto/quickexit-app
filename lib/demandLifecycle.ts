/**
 * Capital Disponibil v2 — demand lifecycle helpers (status + expiry).
 * Server-side truth: status + expires_at. Never trust client-only hiding.
 */

export const DEMAND_STANDARD_PACKAGE_ID = "demand_standard_30d" as const;
export const DEMAND_LEGACY_PACKAGE_ID = "demand" as const;
export const DEMAND_STANDARD_DURATION_DAYS = 30;
export const DEMAND_STANDARD_PRICE_RON = 49;

export type DemandLifecycleStatus =
  | "pending_payment"
  | "active"
  | "suspended"
  | "resolved"
  | "expired";

export type DemandExpiryFields = {
  status: string | null | undefined;
  expires_at?: string | null;
  paid?: boolean | null;
  activated_at?: string | null;
};

/** True when the demand should appear in public directories / accept offers. */
export function isDemandEffectivelyActive(
  row: DemandExpiryFields,
  now: Date = new Date(),
): boolean {
  if (String(row.status ?? "").trim() !== "active") return false;
  const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
  if (expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= now.getTime()) {
    return false;
  }
  return true;
}

export function demandExpiryIso(
  durationDays: number = DEMAND_STANDARD_DURATION_DAYS,
  now: Date = new Date(),
): string {
  const expiry = new Date(now);
  expiry.setUTCDate(expiry.getUTCDate() + durationDays);
  return expiry.toISOString();
}

export function buildDemandActivationPayload(params: {
  expiresAt: string | null;
  packageId?: string | null;
  buyerVerified?: boolean;
  now?: Date;
}): Record<string, unknown> {
  const now = params.now ?? new Date();
  const payload: Record<string, unknown> = {
    status: "active",
    paid: true,
    activated_at: now.toISOString(),
  };
  if (params.expiresAt) payload.expires_at = params.expiresAt;
  if (params.packageId) payload.package_id = params.packageId;
  if (typeof params.buyerVerified === "boolean") {
    payload.buyer_verified = params.buyerVerified;
  }
  return payload;
}

export function isBuyerKycVerified(kycStatus: string | null | undefined): boolean {
  return String(kycStatus ?? "").trim().toLowerCase() === "verified";
}
