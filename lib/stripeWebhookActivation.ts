import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getPackageByPriceId,
  getExpiryIsoForPackage,
  getPriceIdForPackageId,
} from "@/lib/stripePackages";
import { getListingPackageById, getListingExpiryIso } from "@/lib/pricing";

export type CheckoutObjectType = "listing" | "demand";

export type ExtractedCheckoutIds = {
  type: CheckoutObjectType;
  listingId: string;
  demandId: string;
  userId: string;
  objectId: string;
  metadata: Stripe.Metadata;
};

export type ResolvedActivation = {
  priceId: string | null;
  packageId: string | null;
  expiresAt: string | null;
  source: "stripe_packages" | "legacy_pricing" | "demand_default" | "none";
};

export function extractCheckoutIds(session: Stripe.Checkout.Session): ExtractedCheckoutIds {
  const metadata = session.metadata ?? {};
  const type: CheckoutObjectType = metadata.type === "demand" ? "demand" : "listing";

  const listingId = String(
    metadata.listingId ?? metadata.listing_id ?? metadata.listing ?? ""
  ).trim();

  const demandId = String(metadata.demandId ?? metadata.demand_id ?? metadata.demand ?? "").trim();

  const userId = String(metadata.userId ?? metadata.user_id ?? "").trim();
  const objectId = type === "demand" ? demandId : listingId;

  return { type, listingId, demandId, userId, objectId, metadata };
}

export function resolveActivationFromMetadata(
  metadata: Stripe.Metadata,
  type: CheckoutObjectType
): ResolvedActivation {
  let priceId = String(metadata.priceId ?? metadata.price_id ?? "").trim();
  const packageId = String(metadata.packageId ?? metadata.package_id ?? "").trim();

  if (!priceId && packageId) {
    priceId = getPriceIdForPackageId(packageId) ?? "";
  }

  const stripePkg = priceId ? getPackageByPriceId(priceId) : null;
  if (stripePkg) {
    return {
      priceId: stripePkg.priceId,
      packageId: stripePkg.packageId,
      expiresAt: getExpiryIsoForPackage(stripePkg),
      source: "stripe_packages",
    };
  }

  if (type === "listing" && packageId) {
    const legacyPkg = getListingPackageById(packageId);
    if (legacyPkg) {
      return {
        priceId: priceId || null,
        packageId,
        expiresAt: getListingExpiryIso(legacyPkg.id),
        source: "legacy_pricing",
      };
    }
  }

  if (type === "demand") {
    const demandPriceId = priceId || getPriceIdForPackageId("demand") || "";
    const demandPkg = demandPriceId ? getPackageByPriceId(demandPriceId) : null;
    if (demandPkg) {
      return {
        priceId: demandPkg.priceId,
        packageId: demandPkg.packageId,
        expiresAt: getExpiryIsoForPackage(demandPkg),
        source: "demand_default",
      };
    }
  }

  return {
    priceId: priceId || null,
    packageId: packageId || null,
    expiresAt: null,
    source: "none",
  };
}

export async function resolvePriceIdFromLineItems(
  stripe: Stripe,
  session: Stripe.Checkout.Session
): Promise<string> {
  try {
    const hydrated =
      session.line_items?.data?.length && session.line_items.data[0]?.price
        ? session
        : await stripe.checkout.sessions.retrieve(session.id, {
            expand: ["line_items.data.price"],
          });

    const firstItem = hydrated.line_items?.data?.[0];
    const price = firstItem?.price;
    if (typeof price === "string") return price;
    if (price && typeof price === "object" && "id" in price) {
      return String(price.id);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[stripe/webhook] Nu am putut extrage priceId din line_items:", {
      sessionId: session.id,
      message,
    });
  }
  return "";
}

export async function resolveActivationPlan(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  type: CheckoutObjectType
): Promise<ResolvedActivation> {
  let activation = resolveActivationFromMetadata(session.metadata ?? {}, type);
  if (activation.source !== "none") return activation;

  const lineItemPriceId = await resolvePriceIdFromLineItems(stripe, session);
  if (!lineItemPriceId) return activation;

  const metadataWithPrice: Stripe.Metadata = {
    ...(session.metadata ?? {}),
    priceId: lineItemPriceId,
  };
  return resolveActivationFromMetadata(metadataWithPrice, type);
}

function formatSupabaseError(error: {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
} | null) {
  if (!error) return null;
  return {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  };
}

export async function activateRow(
  supabase: SupabaseClient,
  table: string,
  id: string,
  expiresAt: string | null,
  logPrefix = "[stripe/webhook]"
): Promise<{ message: string; supabase?: ReturnType<typeof formatSupabaseError> } | null> {
  const payload: Record<string, unknown> = { status: "active", paid: true };
  if (expiresAt) payload.expires_at = expiresAt;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await supabase
      .from(table)
      .update(payload)
      .eq("id", id)
      .neq("status", "active");

    if (!error) return null;

    console.error(`${logPrefix} activateRow — update eșuat (încercare ${attempt + 1}/3):`, {
      table,
      id,
      payloadKeys: Object.keys(payload),
      supabase: formatSupabaseError(error),
    });

    let removed = false;
    for (const col of ["paid", "expires_at"]) {
      if (col in payload && isMissingColumnError(error, col)) {
        delete payload[col];
        removed = true;
        console.error(`${logPrefix} activateRow — coloană lipsă, retry fără "${col}":`, {
          table,
          id,
        });
        break;
      }
    }
    if (!removed) {
      return { message: error.message ?? "Update Supabase eșuat.", supabase: formatSupabaseError(error) };
    }
  }

  return { message: "Update eșuat după mai multe încercări de fallback." };
}

function isMissingColumnError(
  error: { code?: string; message?: string } | null,
  column: string
): boolean {
  if (!error) return false;
  if (error.code === "PGRST204") return true;
  const msg = (error.message ?? "").toLowerCase();
  return msg.includes(column.toLowerCase()) && msg.includes("column");
}
