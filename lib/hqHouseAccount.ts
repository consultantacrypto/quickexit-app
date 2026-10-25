import { premiumSellerConfig } from "@/lib/premiumSeller";

/**
 * Dani's founder / house inventory account (premium seller profile).
 * HQ_HOUSE_ACCOUNT_IDS may add more UUIDs (comma-separated). The default
 * founder id stays in the set.
 */
export const DEFAULT_HOUSE_ACCOUNT_ID = premiumSellerConfig.ownerUserId;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function houseAccountIds(): string[] {
  const ids = new Set<string>([DEFAULT_HOUSE_ACCOUNT_ID.toLowerCase()]);
  const extra = process.env.HQ_HOUSE_ACCOUNT_IDS ?? "";
  for (const part of extra.split(",")) {
    const trimmed = part.trim().toLowerCase();
    if (UUID_RE.test(trimmed)) ids.add(trimmed);
  }
  return [...ids];
}

export function isHouseAccount(userId: string | null | undefined, houseIds: readonly string[]): boolean {
  if (!userId) return false;
  return houseIds.includes(userId.trim().toLowerCase());
}
