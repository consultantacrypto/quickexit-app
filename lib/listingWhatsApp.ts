import { formatEurAmount } from "@/lib/i18n/format";
import { isPubliclyAvailableStatus } from "@/lib/listingInventory";
import { isValidPrice } from "@/lib/listingPrice";
import { premiumSellerConfig } from "@/lib/premiumSeller";

/**
 * Public detail pages already omit sold and inactive listings.
 * Hide the bar if a non-active or sold/archived row still reaches the client.
 * A missing availability field follows the page: the server already filtered it.
 */
export function isListingMobileCtaEligible(listing: {
  status?: unknown;
  availability_status?: unknown;
}): boolean {
  if (listing.status !== "active") return false;
  if (listing.availability_status == null || listing.availability_status === "") {
    return true;
  }
  return isPubliclyAvailableStatus(listing.availability_status);
}

/**
 * Operator WhatsApp already used by the premium-seller card.
 * Digits come only from that configured wa.me link. No number is invented.
 */
const CONFIGURED_WA_ME = /^https:\/\/wa\.me\/(\d{8,15})\/?(?:\?|#|$)/;

export function configuredWhatsAppPhone(
  whatsappUrl: string = premiumSellerConfig.whatsappUrl,
): string | null {
  const match = whatsappUrl.trim().match(CONFIGURED_WA_ME);
  return match?.[1] ?? null;
}

export const LISTING_STICKY_WHATSAPP_UTM = {
  utm_source: "whatsapp",
  utm_medium: "mobile_sticky_bar",
  utm_campaign: "listing_cta",
} as const;

/** Same euro string as the listing page and card (`€82.820` in Romanian). */
export function formatStickyWhatsAppPrice(
  exitPrice: unknown,
  locale: string,
): string | null {
  if (!isValidPrice(exitPrice)) return null;
  return formatEurAmount(Number(exitPrice), locale);
}

export function withListingStickyWhatsAppUtm(listingUrl: string): string {
  const url = new URL(listingUrl);
  url.searchParams.set("utm_source", LISTING_STICKY_WHATSAPP_UTM.utm_source);
  url.searchParams.set("utm_medium", LISTING_STICKY_WHATSAPP_UTM.utm_medium);
  url.searchParams.set("utm_campaign", LISTING_STICKY_WHATSAPP_UTM.utm_campaign);
  return url.toString();
}

export function buildListingWhatsAppHref(input: {
  title: string;
  listingUrl: string;
  listingId: string;
  exitPrice?: unknown;
  locale?: string;
  whatsappUrl?: string;
}): string | null {
  const phone = configuredWhatsAppPhone(
    input.whatsappUrl ?? premiumSellerConfig.whatsappUrl,
  );
  if (!phone) return null;

  const title = input.title.replace(/\s+/g, " ").trim();
  const listingUrl = input.listingUrl.trim();
  const listingId = input.listingId.trim();
  if (!title || !listingUrl || !listingId) return null;

  const price = formatStickyWhatsAppPrice(input.exitPrice, input.locale ?? "ro");
  const trackedUrl = withListingStickyWhatsAppUtm(listingUrl);
  const lines = [title];
  if (price) lines.push(price);
  lines.push(`ID: ${listingId}`);
  lines.push(trackedUrl);
  return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`;
}
