import { isPubliclyAvailableStatus } from "@/lib/listingInventory";
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

export function buildListingWhatsAppHref(input: {
  title: string;
  listingUrl: string;
  whatsappUrl?: string;
}): string | null {
  const phone = configuredWhatsAppPhone(
    input.whatsappUrl ?? premiumSellerConfig.whatsappUrl,
  );
  if (!phone) return null;

  const title = input.title.replace(/\s+/g, " ").trim();
  const listingUrl = input.listingUrl.trim();
  if (!title || !listingUrl) return null;

  const text = `${title}\n${listingUrl}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
