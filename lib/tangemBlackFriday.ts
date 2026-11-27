/**
 * Time-limited Tangem Black Friday promo on the wallet catalog.
 * The sentence says the public offer runs through 29.11.
 * The banner stays available through the next UTC day, then hides with no redeploy.
 * Cutoff lives only in TANGEM_BLACK_FRIDAY_ENDS_AT.
 */

export const TANGEM_BLACK_FRIDAY_ENDS_AT = "2026-11-30T23:59:59Z";

export const TANGEM_BLACK_FRIDAY_HREF = "https://www.mihaidaniel.ro/r/tangem?s=qe";

export const TANGEM_BLACK_FRIDAY_REL = "sponsored noopener noreferrer";

export const TANGEM_BLACK_FRIDAY_CODE = "BF2026";

export const TANGEM_BLACK_FRIDAY_COPY =
  "Black Friday Tangem: până la 45% reducere cu codul BF2026, până pe 29.11";

/** Visible through the cutoff instant. Hidden immediately after it. */
export function isTangemBlackFridayVisible(now: Date): boolean {
  const time = now.getTime();
  if (!Number.isFinite(time)) return false;
  const endsAt = Date.parse(TANGEM_BLACK_FRIDAY_ENDS_AT);
  if (!Number.isFinite(endsAt)) return false;
  return time <= endsAt;
}

/**
 * A server that already omitted the banner must stay omitted.
 * That keeps a cached or skewed client clock from inserting it after hydration.
 * A server that included it can still hide it once the client clock passes the cutoff.
 */
export function tangemBlackFridayBannerVisible(serverVisible: boolean, now: Date): boolean {
  return serverVisible && isTangemBlackFridayVisible(now);
}
