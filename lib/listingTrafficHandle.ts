import {
  MAX_LISTING_TRAFFIC_BODY_BYTES,
  listingTrafficWriteAllowed,
  parseListingTrafficBody,
  recordListingTrafficEvent,
  type ListingTrafficStore,
} from "@/lib/listingTraffic";

export type ListingTrafficHandleResult = {
  status: 204;
  outcome: "ignored" | "inserted" | "duplicate" | "failed";
};

/**
 * Always resolves. Callers turn every outcome into an empty 204 so a
 * tracking failure cannot change the listing page.
 */
export async function handleListingTrafficPost(input: {
  sameOrigin: boolean;
  rateAllowed: boolean;
  bodyText: string;
  vercelEnv?: string | null;
  supabaseUrl?: string | null;
  openStore: () => ListingTrafficStore | null;
}): Promise<ListingTrafficHandleResult> {
  const ignored = (): ListingTrafficHandleResult => ({ status: 204, outcome: "ignored" });
  try {
    if (!input.sameOrigin || !input.rateAllowed) return ignored();
    if (input.bodyText.length > MAX_LISTING_TRAFFIC_BODY_BYTES) return ignored();

    let raw: unknown = null;
    if (input.bodyText) {
      try {
        raw = JSON.parse(input.bodyText) as unknown;
      } catch {
        return ignored();
      }
    }

    const parsed = parseListingTrafficBody(raw);
    if (!parsed.ok) return ignored();
    if (
      !listingTrafficWriteAllowed({
        vercelEnv: input.vercelEnv,
        supabaseUrl: input.supabaseUrl,
      })
    ) {
      return ignored();
    }

    const store = input.openStore();
    if (!store) return ignored();
    const outcome = await recordListingTrafficEvent(store, parsed.event);
    if (outcome === "inserted" || outcome === "duplicate" || outcome === "failed") {
      return { status: 204, outcome };
    }
    return ignored();
  } catch {
    return ignored();
  }
}
