/**
 * Service-role reads and writes for the free car valuation.
 * Listings are selected, never inserted or updated. valuation_requests
 * writes are skipped by the caller when the table is not present yet.
 * Do not log email addresses.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getHqAdminEmails } from "@/lib/hqAdminAllowlist";
import {
  QE_VALUATION_CAMPAIGN_KEY,
  QE_VALUATION_CONSENT_VERSION,
  type QeListingRow,
  type QeValuation,
  type QeValuationEmailPurpose,
} from "@/lib/qeCarValuation";

export const QE_LISTING_FETCH_LIMIT = 1000;

const LISTING_COLUMNS_FULL =
  "id, category, status, exit_price, is_seed, details, vehicle_make, vehicle_model, vehicle_year, vehicle_km";
const LISTING_COLUMNS_BASE = "id, category, status, exit_price, is_seed, details";

type PostgrestError = { code?: string; message?: string };

export function createQeValuationServiceClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isMissingValuationTableError(error: PostgrestError | null | undefined): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  if (code === "42P01" || code === "PGRST205") return true;
  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("valuation_requests") &&
    (message.includes("does not exist") ||
      message.includes("schema cache") ||
      message.includes("could not find"))
  );
}

function isMissingVehicleColumn(error: PostgrestError): boolean {
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes("vehicle_make") ||
    message.includes("vehicle_model") ||
    message.includes("vehicle_year") ||
    message.includes("vehicle_km")
  );
}

export async function fetchActiveAutoListings(
  supabase: SupabaseClient,
): Promise<{ ok: true; rows: QeListingRow[] } | { ok: false }> {
  const run = (columns: string) =>
    supabase
      .from("listings")
      .select(columns)
      .eq("status", "active")
      .in("category", ["Auto & Moto", "auto", "Auto"])
      .or("is_seed.eq.false,is_seed.is.null")
      .limit(QE_LISTING_FETCH_LIMIT);

  let result = await run(LISTING_COLUMNS_FULL);
  if (result.error && isMissingVehicleColumn(result.error)) {
    result = await run(LISTING_COLUMNS_BASE);
  }
  if (result.error) {
    console.warn("[qe-valuation] listing read failed", { code: result.error.code ?? "unknown" });
    return { ok: false };
  }
  return { ok: true, rows: (result.data ?? []) as QeListingRow[] };
}

export async function probeValuationStorage(
  supabase: SupabaseClient,
): Promise<"ready" | "missing" | "error"> {
  const { error } = await supabase.from("valuation_requests").select("id").limit(1);
  if (!error) return "ready";
  if (isMissingValuationTableError(error)) return "missing";
  console.warn("[qe-valuation] storage probe failed", { code: error.code ?? "unknown" });
  return "error";
}

export async function findRecentValuationRequest(
  supabase: SupabaseClient,
  email: string,
): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("valuation_requests")
    .select("id")
    .eq("email", email)
    .gte("created_at", since)
    .limit(1);
  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}

export type QeLeadInsert = {
  email: string;
  make: string;
  model: string;
  year: number;
  km: number;
  valuation: QeValuation;
  purpose: QeValuationEmailPurpose;
};

export async function insertValuationLead(
  supabase: SupabaseClient,
  input: QeLeadInsert,
): Promise<{ ok: true; id: string } | { ok: false }> {
  const notes = JSON.stringify({
    type: "free_car_valuation",
    consent: true,
    consent_version: QE_VALUATION_CONSENT_VERSION,
    purpose: input.purpose,
    make: input.make,
    model: input.model,
    year: input.year,
    km: input.km,
    normalized_make: input.valuation.normalizedMake,
    normalized_model: input.valuation.normalizedModel,
    sufficient: input.valuation.sufficient,
    tier: input.valuation.tier,
    comparable_count: input.valuation.comparableCount,
  });

  const { data, error } = await supabase
    .from("leads")
    .insert({
      lead_type: "seller",
      source: "quickexit",
      campaign_key: QE_VALUATION_CAMPAIGN_KEY,
      category: "auto",
      language: "ro",
      email: input.email,
      status: "new",
      legal_basis: "consent",
      asset_summary: `${input.make} ${input.model} ${input.year}`.slice(0, 400),
      est_value_eur: input.valuation.p50,
      owner_email: getHqAdminEmails()[0] ?? null,
      preferred_channel: "email",
      notes: notes.slice(0, 4000),
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    console.warn("[qe-valuation] lead insert failed", { code: error?.code ?? "unknown" });
    return { ok: false };
  }

  const { error: eventError } = await supabase.from("lead_events").insert({
    lead_id: data.id,
    event_type: "free_car_valuation_requested",
    payload: {
      campaign_key: QE_VALUATION_CAMPAIGN_KEY,
      sufficient: input.valuation.sufficient,
      tier: input.valuation.tier,
      comparable_count: input.valuation.comparableCount,
      purpose: input.purpose,
    },
    actor_email: null,
  });
  if (eventError) {
    console.warn("[qe-valuation] lead event insert failed", { code: eventError.code ?? "unknown" });
  }

  return { ok: true, id: data.id as string };
}

export type QeRequestInsert = {
  make: string;
  model: string;
  year: number;
  km: number;
  equipment: string | null;
  valuation: QeValuation;
  email: string | null;
  consent: boolean;
  consentAt: string | null;
  leadId: string | null;
  purpose: QeValuationEmailPurpose | null;
};

export async function insertValuationRequest(
  supabase: SupabaseClient,
  input: QeRequestInsert,
): Promise<{ ok: true } | { ok: false; missing: boolean }> {
  const { error } = await supabase.from("valuation_requests").insert({
    make: input.make,
    model: input.model,
    year: input.year,
    km: input.km,
    equipment: input.equipment,
    normalized_make: input.valuation.normalizedMake,
    normalized_model: input.valuation.normalizedModel,
    p25: input.valuation.p25,
    p50: input.valuation.p50,
    p75: input.valuation.p75,
    comparable_count: input.valuation.comparableCount,
    tier: input.valuation.tier,
    tier_label: input.valuation.tierLabel,
    sufficient: input.valuation.sufficient,
    email: input.email,
    consent: input.consent,
    consent_version: input.consent ? QE_VALUATION_CONSENT_VERSION : null,
    consent_at: input.consentAt,
    lead_id: input.leadId,
    purpose: input.purpose,
  });

  if (error) {
    const missing = isMissingValuationTableError(error);
    if (!missing) {
      console.warn("[qe-valuation] request insert failed", { code: error.code ?? "unknown" });
    }
    return { ok: false, missing };
  }
  return { ok: true };
}
