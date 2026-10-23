import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type AttributionSnapshot,
  attributionMetadata,
  gaClientIdFromCookieHeader,
  mergeSnapshots,
  readAttributionFromCookieHeader,
  sanitizeSnapshot,
} from "@/lib/attribution";

async function loadStoredSnapshot(
  admin: SupabaseClient,
  table: "profiles" | "listings" | "demands",
  id: string,
): Promise<AttributionSnapshot | null> {
  if (!id) return null;
  const { data, error } = await admin
    .from(table)
    .select("attribution_first, attribution_last, heard_from, heard_from_detail")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return sanitizeSnapshot({
    v: 1,
    first: data.attribution_first,
    last: data.attribution_last,
    heard_from: data.heard_from,
    heard_from_detail: data.heard_from_detail,
  });
}

/**
 * Checkout attribution prefers the row saved at signup / publish, then the
 * first-party cookie. Missing columns (migration not applied yet) are ignored
 * so checkout keeps working.
 */
export async function resolveCheckoutAttribution(input: {
  admin: SupabaseClient;
  userId: string;
  listingId?: string;
  demandId?: string;
  cookieHeader: string | null;
  bodyAttribution?: unknown;
}): Promise<{ metadata: Record<string, string>; gaClientId?: string }> {
  const fromCookie = readAttributionFromCookieHeader(input.cookieHeader);
  const fromBody = sanitizeSnapshot(input.bodyAttribution);
  const [fromProfile, fromEntity] = await Promise.all([
    loadStoredSnapshot(input.admin, "profiles", input.userId),
    input.listingId
      ? loadStoredSnapshot(input.admin, "listings", input.listingId)
      : input.demandId
        ? loadStoredSnapshot(input.admin, "demands", input.demandId)
        : Promise.resolve(null),
  ]);

  const snapshot = mergeSnapshots(fromProfile, fromEntity, fromCookie, fromBody);
  if (fromEntity?.heard_from) {
    snapshot.heard_from = fromEntity.heard_from;
    snapshot.heard_from_detail = fromEntity.heard_from_detail ?? null;
  }

  const metadata = attributionMetadata(snapshot);
  const gaClientId = gaClientIdFromCookieHeader(input.cookieHeader);
  if (gaClientId) metadata.ga_client_id = gaClientId;
  return { metadata, gaClientId };
}
