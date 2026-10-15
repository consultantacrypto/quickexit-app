import { getAddress, isAddress } from "viem";

/**
 * Normalize to EIP-55 checksummed address.
 * Uniqueness in DB is on lower(address) to prevent case collisions.
 */
export function normalizeEvmAddress(raw: string | null | undefined): string | null {
  const value = String(raw || "").trim();
  if (!value || !isAddress(value, { strict: false })) return null;
  try {
    return getAddress(value);
  } catch {
    return null;
  }
}

/** Dashboard display — never show full address publicly by default. */
export function abbreviateEvmAddress(address: string): string {
  const normalized = normalizeEvmAddress(address) ?? String(address || "").trim();
  if (normalized.length < 10) return normalized;
  return `${normalized.slice(0, 6)}…${normalized.slice(-4)}`;
}

export function isSameEvmAddress(a: string, b: string): boolean {
  const na = normalizeEvmAddress(a);
  const nb = normalizeEvmAddress(b);
  if (!na || !nb) return false;
  return na.toLowerCase() === nb.toLowerCase();
}
