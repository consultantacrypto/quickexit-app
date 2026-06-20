import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import StripeSdk from "stripe";
import {
  getExpiryIsoForPackage,
  getPackageByPriceId,
  getPriceIdForPackageId,
  type ListingPackageId,
} from "@/lib/stripePackages";
import { getListingExpiryIso, getListingPackageById, validateListingPackage } from "@/lib/pricing";
import {
  activateRow,
  extractCheckoutIds,
  resolveActivationPlan,
  type CheckoutObjectType,
} from "@/lib/stripeWebhookActivation";

export type ForceActivateMode = "stripe_sync" | "manual";
export type ForceActivateEntityType = "listing" | "demand";

export type ForceActivateInput = {
  listingId?: string;
  demandId?: string;
  mode: ForceActivateMode;
  stripeSessionId?: string;
  packageId?: string;
  reason?: string;
  adminEmail: string;
};

export type ForceActivateSuccess = {
  ok: true;
  entityType: ForceActivateEntityType;
  entityId: string;
  listingId: string | null;
  demandId: string | null;
  status: "active";
  packageId: string;
  expiresAt: string | null;
  syncedFromStripe: boolean;
  stripeSessionId: string | null;
  wasAlreadyActive: boolean;
};

export type ForceActivateFailure = {
  ok: false;
  error: string;
  code:
    | "entity_not_found"
    | "invalid_payload"
    | "invalid_status"
    | "invalid_package"
    | "stripe_not_paid"
    | "stripe_entity_mismatch"
    | "stripe_session_invalid"
    | "missing_reason"
    | "activation_failed";
};

export type ForceActivateResult = ForceActivateSuccess | ForceActivateFailure;

type ListingRow = {
  id: string;
  status: string;
  sale_strategy: string | null;
  details: unknown;
  user_id: string | null;
  title: string | null;
  created_at: string | null;
};

type DemandRow = {
  id: string;
  status: string;
  buyer_id: string | null;
  target_asset: string | null;
  category: string | null;
  budget: number | null;
  created_at: string | null;
};

const DEMAND_PACKAGE_ID: ListingPackageId = "demand";
const LOG_PREFIX = "[force-activate]";

export function resolveForceActivateTarget(input: ForceActivateInput): {
  entityType: ForceActivateEntityType;
  entityId: string;
} | null {
  const listingId = String(input.listingId ?? "").trim();
  const demandId = String(input.demandId ?? "").trim();

  if (listingId && demandId) return null;
  if (!listingId && !demandId) return null;

  if (listingId) return { entityType: "listing", entityId: listingId };
  return { entityType: "demand", entityId: demandId };
}

export function inferPackageIdFromListing(listing: Pick<ListingRow, "sale_strategy" | "details">): string | null {
  const fromStrategy = String(listing.sale_strategy ?? "").trim();
  if (validateListingPackage(fromStrategy)) return fromStrategy;

  const details =
    listing.details && typeof listing.details === "object" && !Array.isArray(listing.details)
      ? (listing.details as Record<string, unknown>)
      : null;
  const fromDetails = String(details?.package ?? "").trim();
  if (validateListingPackage(fromDetails)) return fromDetails;

  return null;
}

export function inferPackageIdFromDemand(_demand?: DemandRow): string {
  return DEMAND_PACKAGE_ID;
}

export function resolveExpiryForPackageId(packageId: string): string | null {
  const priceId = getPriceIdForPackageId(packageId as ListingPackageId);
  if (priceId) {
    const stripePkg = getPackageByPriceId(priceId);
    if (stripePkg) return getExpiryIsoForPackage(stripePkg);
  }
  const legacy = getListingPackageById(packageId);
  if (legacy) return getListingExpiryIso(legacy.id);
  return null;
}

function validateManualPackageId(entityType: ForceActivateEntityType, packageId: string): boolean {
  if (entityType === "demand") {
    return packageId === DEMAND_PACKAGE_ID && Boolean(getPackageByPriceId(getPriceIdForPackageId(DEMAND_PACKAGE_ID) ?? ""));
  }
  return validateListingPackage(packageId);
}

async function verifyStripeSessionForEntity(
  stripe: Stripe,
  stripeSessionId: string,
  entityType: ForceActivateEntityType,
  entityId: string
): Promise<
  | { ok: true; session: Stripe.Checkout.Session; expiresAt: string | null; packageId: string | null }
  | { ok: false; error: string; code: ForceActivateFailure["code"] }
> {
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(stripeSessionId, {
      expand: ["line_items.data.price"],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `Sesiune Stripe invalidă: ${message}`, code: "stripe_session_invalid" };
  }

  if (String(session.payment_status ?? "").toLowerCase() !== "paid") {
    return {
      ok: false,
      error: `Plata nu este finalizată (payment_status=${session.payment_status ?? "unknown"}).`,
      code: "stripe_not_paid",
    };
  }

  const extracted = extractCheckoutIds(session);
  const expectedType: CheckoutObjectType = entityType;

  if (extracted.type !== expectedType) {
    return {
      ok: false,
      error: `Sesiunea Stripe este pentru „${extracted.type}”, nu pentru „${entityType}”.`,
      code: "stripe_session_invalid",
    };
  }

  if (entityType === "listing") {
    if (extracted.listingId && extracted.listingId !== entityId) {
      return {
        ok: false,
        error: `listingId din Stripe (${extracted.listingId}) nu corespunde cu ${entityId}.`,
        code: "stripe_entity_mismatch",
      };
    }
  } else if (extracted.demandId && extracted.demandId !== entityId) {
    return {
      ok: false,
      error: `demandId din Stripe (${extracted.demandId}) nu corespunde cu ${entityId}.`,
      code: "stripe_entity_mismatch",
    };
  }

  const activation = await resolveActivationPlan(stripe, session, entityType);
  return {
    ok: true,
    session,
    expiresAt: activation.expiresAt,
    packageId: activation.packageId,
  };
}

function buildSuccessResult(
  entityType: ForceActivateEntityType,
  entityId: string,
  packageId: string,
  expiresAt: string | null,
  input: ForceActivateInput,
  wasAlreadyActive: boolean
): ForceActivateSuccess {
  return {
    ok: true,
    entityType,
    entityId,
    listingId: entityType === "listing" ? entityId : null,
    demandId: entityType === "demand" ? entityId : null,
    status: "active",
    packageId,
    expiresAt,
    syncedFromStripe: input.mode === "stripe_sync",
    stripeSessionId: input.stripeSessionId?.trim() || null,
    wasAlreadyActive,
  };
}

export async function forceActivate(
  supabase: SupabaseClient,
  input: ForceActivateInput
): Promise<ForceActivateResult> {
  const target = resolveForceActivateTarget(input);
  if (!target) {
    return {
      ok: false,
      error: "Trimite exact unul dintre listingId sau demandId (nu ambele).",
      code: "invalid_payload",
    };
  }

  const { entityType, entityId } = target;

  if (entityType === "listing") {
    return forceActivateListingRow(supabase, input, entityId);
  }
  return forceActivateDemandRow(supabase, input, entityId);
}

async function forceActivateListingRow(
  supabase: SupabaseClient,
  input: ForceActivateInput,
  listingId: string
): Promise<ForceActivateResult> {
  const { data: listing, error: fetchError } = await supabase
    .from("listings")
    .select("id, status, sale_strategy, details, user_id, title, created_at")
    .eq("id", listingId)
    .maybeSingle();

  if (fetchError || !listing) {
    console.error(`${LOG_PREFIX} listing inexistent:`, { listingId, error: fetchError?.message });
    return {
      ok: false,
      error: fetchError?.message ?? "Listarea nu există.",
      code: "entity_not_found",
    };
  }

  const row = listing as ListingRow;
  return executeForceActivate({
    supabase,
    input,
    entityType: "listing",
    entityId: listingId,
    table: "listings",
    currentStatus: row.status,
    inferPackage: () => inferPackageIdFromListing(row),
    auditContext: {
      title: row.title,
      ownerId: row.user_id,
    },
  });
}

async function forceActivateDemandRow(
  supabase: SupabaseClient,
  input: ForceActivateInput,
  demandId: string
): Promise<ForceActivateResult> {
  const { data: demand, error: fetchError } = await supabase
    .from("demands")
    .select("id, status, buyer_id, target_asset, category, budget, created_at")
    .eq("id", demandId)
    .maybeSingle();

  if (fetchError || !demand) {
    console.error(`${LOG_PREFIX} demand inexistent:`, { demandId, error: fetchError?.message });
    return {
      ok: false,
      error: fetchError?.message ?? "Cererea nu există.",
      code: "entity_not_found",
    };
  }

  const row = demand as DemandRow;
  return executeForceActivate({
    supabase,
    input,
    entityType: "demand",
    entityId: demandId,
    table: "demands",
    currentStatus: row.status,
    inferPackage: () => inferPackageIdFromDemand(row),
    auditContext: {
      title: row.target_asset,
      ownerId: row.buyer_id,
    },
  });
}

async function executeForceActivate(params: {
  supabase: SupabaseClient;
  input: ForceActivateInput;
  entityType: ForceActivateEntityType;
  entityId: string;
  table: "listings" | "demands";
  currentStatus: string;
  inferPackage: () => string | null;
  auditContext: { title: string | null; ownerId: string | null };
}): Promise<ForceActivateResult> {
  const { supabase, input, entityType, entityId, table, currentStatus, inferPackage, auditContext } = params;

  if (currentStatus === "active") {
    const packageId = inferPackage() ?? (entityType === "demand" ? DEMAND_PACKAGE_ID : "unknown");
    console.log(`${LOG_PREFIX} ${entityType} deja activ (idempotent):`, { entityId, entityType });
    return buildSuccessResult(entityType, entityId, packageId, null, input, true);
  }

  if (currentStatus !== "pending_payment") {
    console.error(`${LOG_PREFIX} status invalid pentru ${entityType}:`, {
      entityId,
      entityType,
      currentStatus,
    });
    return {
      ok: false,
      error: `Status curent „${currentStatus}” — force activate permis doar din pending_payment (sau deja active).`,
      code: "invalid_status",
    };
  }

  let expiresAt: string | null = null;
  let packageId: string | null = null;
  let syncedFromStripe = false;
  const stripeSessionId = input.stripeSessionId?.trim() || null;

  if (input.mode === "stripe_sync") {
    if (!stripeSessionId) {
      return {
        ok: false,
        error: "stripeSessionId este obligatoriu pentru modul stripe_sync.",
        code: "stripe_session_invalid",
      };
    }

    const stripeApiKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeApiKey) {
      return { ok: false, error: "STRIPE_SECRET_KEY lipsește.", code: "stripe_session_invalid" };
    }

    const stripe = new StripeSdk(stripeApiKey, { apiVersion: "2023-10-16" as any });
    const verified = await verifyStripeSessionForEntity(stripe, stripeSessionId, entityType, entityId);
    if (!verified.ok) {
      console.error(`${LOG_PREFIX} verificare Stripe eșuată pentru ${entityType}:`, {
        entityId,
        entityType,
        stripeSessionId,
        error: verified.error,
        code: verified.code,
      });
      return { ok: false, error: verified.error, code: verified.code };
    }

    expiresAt = verified.expiresAt;
    packageId = verified.packageId ?? inferPackage();
    syncedFromStripe = true;
  } else {
    const reason = String(input.reason ?? "").trim();
    if (reason.length < 8) {
      return {
        ok: false,
        error: "Mod manual: motivul (reason) trebuie să aibă cel puțin 8 caractere.",
        code: "missing_reason",
      };
    }

    packageId = String(input.packageId ?? "").trim() || inferPackage();
    if (!packageId || !validateManualPackageId(entityType, packageId)) {
      const hint =
        entityType === "demand"
          ? 'Pachet invalid. Pentru cereri folosește packageId "demand".'
          : "Pachet invalid. Trimite packageId (economy|standard|urgent|auction).";
      return { ok: false, error: hint, code: "invalid_package" };
    }
    expiresAt = resolveExpiryForPackageId(packageId);
  }

  if (!packageId) {
    return { ok: false, error: "Nu s-a putut determina pachetul.", code: "invalid_package" };
  }

  const updateError = await activateRow(supabase, table, entityId, expiresAt, LOG_PREFIX);
  if (updateError) {
    console.error(`${LOG_PREFIX} activare ${entityType} eșuată:`, {
      entityType,
      entityId,
      listingId: entityType === "listing" ? entityId : null,
      demandId: entityType === "demand" ? entityId : null,
      packageId,
      expiresAt,
      adminEmail: input.adminEmail,
      mode: input.mode,
      reason: input.mode === "manual" ? input.reason : null,
      stripeSessionId,
      supabase: updateError.supabase,
      error: updateError.message,
    });
    return { ok: false, error: updateError.message, code: "activation_failed" };
  }

  console.log(`${LOG_PREFIX} ${entityType} activat`, {
    entityType,
    entityId,
    listingId: entityType === "listing" ? entityId : null,
    demandId: entityType === "demand" ? entityId : null,
    packageId,
    expiresAt,
    mode: input.mode,
    syncedFromStripe,
    stripeSessionId,
    adminEmail: input.adminEmail,
    reason: input.mode === "manual" ? input.reason : null,
    title: auditContext.title,
    ownerId: auditContext.ownerId,
  });

  return buildSuccessResult(entityType, entityId, packageId, expiresAt, input, false);
}

/** @deprecated Prefer `forceActivate` — kept for backward compatibility. */
export async function forceActivateListing(
  supabase: SupabaseClient,
  input: Omit<ForceActivateInput, "demandId"> & { listingId: string }
): Promise<ForceActivateResult> {
  return forceActivate(supabase, input);
}

export type PendingPaymentListingSummary = {
  id: string;
  title: string | null;
  category: string | null;
  status: string;
  sale_strategy: string | null;
  packageId: string | null;
  user_id: string | null;
  created_at: string | null;
  exit_price: number | null;
};

export type PendingPaymentDemandSummary = {
  id: string;
  target_asset: string | null;
  category: string | null;
  status: string;
  packageId: string;
  buyer_id: string | null;
  budget: number | null;
  created_at: string | null;
};

export async function listPendingPaymentListings(
  supabase: SupabaseClient,
  limit = 100
): Promise<PendingPaymentListingSummary[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("id, title, category, status, sale_strategy, details, user_id, created_at, exit_price, is_seed")
    .eq("status", "pending_payment")
    .eq("is_seed", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`${LOG_PREFIX} list pending_payment listings eșuat:`, error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const listing = row as ListingRow & { category: string | null; exit_price: number | null };
    return {
      id: listing.id,
      title: listing.title,
      category: listing.category ?? null,
      status: listing.status,
      sale_strategy: listing.sale_strategy,
      packageId: inferPackageIdFromListing(listing),
      user_id: listing.user_id,
      created_at: listing.created_at,
      exit_price: listing.exit_price ?? null,
    };
  });
}

export async function listPendingPaymentDemands(
  supabase: SupabaseClient,
  limit = 100
): Promise<PendingPaymentDemandSummary[]> {
  const { data, error } = await supabase
    .from("demands")
    .select("id, target_asset, category, status, buyer_id, budget, created_at")
    .eq("status", "pending_payment")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`${LOG_PREFIX} list pending_payment demands eșuat:`, error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const demand = row as DemandRow;
    return {
      id: demand.id,
      target_asset: demand.target_asset,
      category: demand.category ?? null,
      status: demand.status,
      packageId: DEMAND_PACKAGE_ID,
      buyer_id: demand.buyer_id,
      budget: demand.budget ?? null,
      created_at: demand.created_at,
    };
  });
}

export async function listPendingPaymentItems(
  supabase: SupabaseClient,
  type: ForceActivateEntityType,
  limit = 100
): Promise<PendingPaymentListingSummary[] | PendingPaymentDemandSummary[]> {
  return type === "demand"
    ? listPendingPaymentDemands(supabase, limit)
    : listPendingPaymentListings(supabase, limit);
}
