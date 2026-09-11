/**
 * Intended RLS matrix for listing_inquiries + seller_contacts.
 * Encodes policy behavior for assertions. Live identity tests must run
 * against local or dedicated staging Supabase, never Production.
 */

export const INQUIRY_RLS_ACTORS = [
  "anon",
  "buyerA",
  "buyerB",
  "listingSeller",
  "unrelatedSeller",
  "serviceRole",
] as const;

export type InquiryRlsActor = (typeof INQUIRY_RLS_ACTORS)[number];

export type SampleInquiry = {
  buyerId: "buyerA";
  sellerId: "listingSeller";
  listingOwnerId: "listingSeller";
};

export const SAMPLE_INQUIRY: SampleInquiry = {
  buyerId: "buyerA",
  sellerId: "listingSeller",
  listingOwnerId: "listingSeller",
};

const AUTHENTICATED: InquiryRlsActor[] = [
  "buyerA",
  "buyerB",
  "listingSeller",
  "unrelatedSeller",
];

export function canInsertInquiry(
  actor: InquiryRlsActor,
  input: { spoofBuyerId?: string; spoofSellerId?: string } = {},
): boolean {
  if (actor === "anon") return false;
  if (actor === "serviceRole") return false;
  if (!AUTHENTICATED.includes(actor)) return false;
  // Trigger overwrites buyer_id to auth.uid() and seller_id from listings.user_id.
  // WITH CHECK then requires buyer_id = auth.uid(). Spoofed ids cannot stick.
  void input.spoofBuyerId;
  void input.spoofSellerId;
  if (actor === "listingSeller") return false; // CHECK buyer_id <> seller_id on own listing
  return actor === "buyerA" || actor === "buyerB";
}

export function canSelectInquiry(actor: InquiryRlsActor, row: SampleInquiry): boolean {
  if (actor === "anon") return false;
  if (actor === "serviceRole") return true;
  if (actor === "buyerA") return row.buyerId === "buyerA";
  if (actor === "buyerB") return false;
  if (actor === "listingSeller") {
    return row.sellerId === actor && row.listingOwnerId === actor;
  }
  if (actor === "unrelatedSeller") return false;
  return false;
}

export function canUpdateInquiryNotificationOrStatus(actor: InquiryRlsActor): boolean {
  return actor === "serviceRole";
}

export function canSellerSetInquiryStatus(
  actor: InquiryRlsActor,
  row: SampleInquiry,
  nextStatus: "seen" | "closed",
): boolean {
  if (actor !== "listingSeller") return false;
  if (row.sellerId !== actor || row.listingOwnerId !== actor) return false;
  return nextStatus === "seen" || nextStatus === "closed";
}

export function canSelectSellerContact(
  actor: InquiryRlsActor,
  owner: "listingSeller" | "buyerA" | "unrelatedSeller",
): boolean {
  if (actor === "anon") return false;
  if (actor === "serviceRole") return true;
  if (actor === "listingSeller") return owner === "listingSeller";
  if (actor === "buyerA") return owner === "buyerA";
  if (actor === "buyerB") return false;
  if (actor === "unrelatedSeller") return owner === "unrelatedSeller";
  return false;
}

export const INQUIRY_RLS_MATRIX = INQUIRY_RLS_ACTORS.map((actor) => ({
  actor,
  insertOwnListingInquiry: canInsertInquiry(actor),
  insertWithSpoofedIds: canInsertInquiry(actor, {
    spoofBuyerId: "buyerB",
    spoofSellerId: "unrelatedSeller",
  }),
  selectBuyerAInquiry: canSelectInquiry(actor, SAMPLE_INQUIRY),
  updateNotificationOrStatus: canUpdateInquiryNotificationOrStatus(actor),
  selectListingSellerContact: canSelectSellerContact(actor, "listingSeller"),
}));
