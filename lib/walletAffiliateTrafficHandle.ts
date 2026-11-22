import {
  MAX_WALLET_AFFILIATE_BODY_BYTES,
  parseWalletAffiliateBody,
  recordWalletAffiliateEvent,
  walletAffiliateWriteAllowed,
  type WalletAffiliateStore,
} from "./walletAffiliateTraffic";

export type WalletAffiliateHandleResult = {
  status: 204;
  outcome: "ignored" | "inserted" | "duplicate" | "failed";
};

/**
 * Always resolves. Callers answer 204 for every outcome.
 * `openStore` is not called unless a write is allowed, so a disabled flag
 * never opens a database client.
 */
export async function handleWalletAffiliatePost(input: {
  sameOrigin: boolean;
  rateAllowed: boolean;
  bodyText: string;
  enabledFlag?: string | null;
  supabaseUrl?: string | null;
  openStore: () => WalletAffiliateStore | null;
}): Promise<WalletAffiliateHandleResult> {
  const ignored = (): WalletAffiliateHandleResult => ({ status: 204, outcome: "ignored" });
  try {
    if (!input.sameOrigin || !input.rateAllowed) return ignored();
    if (input.bodyText.length > MAX_WALLET_AFFILIATE_BODY_BYTES) return ignored();

    let raw: unknown = null;
    if (input.bodyText) {
      try {
        raw = JSON.parse(input.bodyText) as unknown;
      } catch {
        return ignored();
      }
    }

    const parsed = parseWalletAffiliateBody(raw);
    if (!parsed.ok) return ignored();
    if (
      !walletAffiliateWriteAllowed({
        enabledFlag: input.enabledFlag,
        supabaseUrl: input.supabaseUrl,
      })
    ) {
      return ignored();
    }

    const store = input.openStore();
    if (!store) return ignored();
    const outcome = await recordWalletAffiliateEvent(store, parsed.event);
    if (outcome === "inserted" || outcome === "duplicate" || outcome === "failed") {
      return { status: 204, outcome };
    }
    return ignored();
  } catch {
    return ignored();
  }
}
