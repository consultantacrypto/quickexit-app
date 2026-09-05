import type { SellerProfileRow } from "@/lib/listingSeo";

const EMAIL_RE = /@/;
const PHONE_RE = /\+?\d[\d\s().-]{7,}\d/;
const UUID_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
const JWT_RE = /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/;

export function publicSellerNameLooksUnsafe(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return (
    EMAIL_RE.test(trimmed) ||
    PHONE_RE.test(trimmed) ||
    UUID_RE.test(trimmed) ||
    JWT_RE.test(trimmed)
  );
}

export function resolvePublicSellerDisplayName(
  profile: Pick<SellerProfileRow, "full_name"> | null | undefined,
  fallback: string,
): string {
  const safeFallback = fallback.trim() || "Quick Exit";
  const raw = typeof profile?.full_name === "string" ? profile.full_name.trim() : "";
  if (!raw || publicSellerNameLooksUnsafe(raw)) return safeFallback;
  return raw;
}

export function publicSellerInitials(displayName: string): string {
  const parts = displayName
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  if (parts.length === 0) return "QE";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function sellerHasPublicVerificationBadge(
  profile: Pick<SellerProfileRow, "kyc_status"> | null | undefined,
): boolean {
  return profile?.kyc_status === "verified";
}

export function resolveSellerActiveListingCount(input: {
  counted: number | null;
  otherPublicCount: number;
}): number {
  if (typeof input.counted === "number" && Number.isFinite(input.counted) && input.counted >= 0) {
    return Math.floor(input.counted);
  }
  const others = Number.isFinite(input.otherPublicCount) ? Math.max(0, Math.floor(input.otherPublicCount)) : 0;
  return others + 1;
}
