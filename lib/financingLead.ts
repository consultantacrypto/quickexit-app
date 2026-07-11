import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getClientIp } from "@/lib/evaluateSafety";
import { calculateFinancing, type FinancingCalculationResult } from "@/lib/financingCalculator";
import { financingConfig } from "@/lib/financingConfig";
import { getHqAdminEmails } from "@/lib/hqAdminAuth";
import { isFinancingCalculatorEnabled } from "@/lib/listingFinancing";
import { getSiteUrl } from "@/lib/siteUrl";

export const FINANCING_REQUEST_CAMPAIGN_KEY = "financing_request";
export const FINANCING_CONSENT_VERSION = "2026-07";
export const FINANCING_PARTNER_ID = financingConfig.partnerId;
export const MAX_FINANCING_REQUEST_BODY_BYTES = 4_096;

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_NOTES_LENGTH = 4000;

type RateBucket = { count: number; resetAt: number };
const rateLimitStore = new Map<string, RateBucket>();

export type FinancingRequestLocale = "ro" | "en";

export type FinancingRequestBody = {
  listingId: string;
  fullName: string;
  phone: string;
  email?: string;
  consent: boolean;
  locale: FinancingRequestLocale;
  depositPct: number;
  interestPct: number;
  termMonths: number;
  website?: string;
};

export type FinancingLeadNotes = {
  type: "financing_request";
  listing_id: string;
  seller_user_id: string;
  partner: string;
  consent: true;
  consent_version: string;
  calc_snapshot: {
    vehicle_price: number;
    deposit_pct: number;
    deposit_amount: number;
    interest_pct: number;
    term_months: number;
    monthly_payment_estimate: number;
    financed_amount: number;
    total_interest: number;
    total_cost_including_deposit: number;
  };
  workflow: {
    status: "new";
    sent_to_partner_at: null;
  };
  monetization: {
    quickexit_share_pct: 50;
    partner_fee_reported: null;
    quickexit_fee_due: null;
    quickexit_fee_paid: false;
  };
};

export type FinancingListingRow = {
  id: string;
  user_id: string | null;
  title: string | null;
  category: string | null;
  status: string | null;
  exit_price: unknown;
  sale_strategy: string | null;
  details: unknown;
};

export type ValidateFinancingRequestResult =
  | { ok: true; data: FinancingRequestBody; honeypotTriggered: false }
  | { ok: true; honeypotTriggered: true }
  | { ok: false; status: number; error_code: string; message: string };

export function createFinancingServiceClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getFinancingLeadOwnerEmail(): string {
  const fromEnv = process.env.FINANCING_LEAD_OWNER_EMAIL?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return getHqAdminEmails()[0] ?? "consultantacrypto.ro@gmail.com";
}

export function checkFinancingRateLimit(ip: string): { allowed: true } | { allowed: false } {
  const now = Date.now();
  const bucket = rateLimitStore.get(ip);

  if (!bucket || now >= bucket.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false };
  }

  bucket.count += 1;
  return { allowed: true };
}

export { getClientIp };

export function normalizePhone(raw: unknown): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  let value = String(raw).trim();
  if (!value) {
    return null;
  }

  value = value.replace(/[\s\-().]/g, "");

  if (value.startsWith("0040")) {
    value = `+40${value.slice(4)}`;
  } else if (value.startsWith("00") && value.length > 2) {
    value = `+${value.slice(2)}`;
  } else if (/^40\d{9}$/.test(value)) {
    value = `+${value}`;
  } else if (/^07\d{8}$/.test(value)) {
    value = `+4${value}`;
  } else if (/^7\d{8}$/.test(value)) {
    value = `+40${value}`;
  } else if (/^\d{10,15}$/.test(value) && !value.startsWith("+")) {
    value = `+${value}`;
  }

  if (!value.startsWith("+")) {
    return null;
  }

  const digits = value.slice(1).replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }

  return `+${digits}`;
}

function trimText(value: unknown, maxLen: number): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const raw = String(value).replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (!raw) {
    return null;
  }
  return raw.slice(0, maxLen);
}

function isValidEmail(email: string): boolean {
  if (email.length > 200) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n)) {
    return null;
  }
  return n;
}

export function validateFinancingCalcParams(
  depositPct: number,
  interestPct: number,
  termMonths: number,
): boolean {
  if (!financingConfig.interestOptions.includes(interestPct)) {
    return false;
  }
  if (!financingConfig.termsMonths.includes(termMonths)) {
    return false;
  }
  if (
    !Number.isFinite(depositPct) ||
    depositPct < financingConfig.depositMin ||
    depositPct > financingConfig.depositMax
  ) {
    return false;
  }
  if (depositPct % financingConfig.depositStep !== 0) {
    return false;
  }
  return true;
}

export function validateFinancingRequestBody(raw: unknown): ValidateFinancingRequestResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ok: false,
      status: 400,
      error_code: "validation_error",
      message: "Payload invalid.",
    };
  }

  const body = raw as Record<string, unknown>;
  const website = trimText(body.website, 200);
  if (website) {
    return { ok: true, honeypotTriggered: true };
  }

  const listingId = trimText(body.listingId, 80);
  if (!listingId) {
    return {
      ok: false,
      status: 400,
      error_code: "validation_error",
      message: "listingId invalid.",
    };
  }

  const fullName = trimText(body.fullName, 200);
  if (!fullName || fullName.length < 2) {
    return {
      ok: false,
      status: 400,
      error_code: "validation_error",
      message: "Numele este obligatoriu.",
    };
  }

  const phone = normalizePhone(body.phone);
  if (!phone) {
    return {
      ok: false,
      status: 400,
      error_code: "validation_error",
      message: "Telefon invalid.",
    };
  }

  const emailRaw = trimText(body.email, 200);
  let email: string | undefined;
  if (emailRaw) {
    if (!isValidEmail(emailRaw)) {
      return {
        ok: false,
        status: 400,
        error_code: "validation_error",
        message: "Email invalid.",
      };
    }
    email = emailRaw;
  }

  if (body.consent !== true) {
    return {
      ok: false,
      status: 400,
      error_code: "validation_error",
      message: "Consimțământ obligatoriu.",
    };
  }

  const localeRaw = trimText(body.locale, 8);
  if (localeRaw !== "ro" && localeRaw !== "en") {
    return {
      ok: false,
      status: 400,
      error_code: "validation_error",
      message: "Locale invalid.",
    };
  }

  const depositPct = parseOptionalNumber(body.depositPct);
  const interestPct = parseOptionalNumber(body.interestPct);
  const termMonths = parseOptionalNumber(body.termMonths);

  if (
    depositPct === null ||
    interestPct === null ||
    termMonths === null ||
    !validateFinancingCalcParams(depositPct, interestPct, termMonths)
  ) {
    return {
      ok: false,
      status: 400,
      error_code: "validation_error",
      message: "Parametrii simulării sunt invalizi.",
    };
  }

  return {
    ok: true,
    honeypotTriggered: false,
    data: {
      listingId,
      fullName,
      phone,
      email,
      consent: true,
      locale: localeRaw,
      depositPct,
      interestPct,
      termMonths,
    },
  };
}

function parseNotesListingId(notes: unknown): string | null {
  if (typeof notes !== "string" || !notes.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(notes) as { listing_id?: unknown };
    if (typeof parsed.listing_id === "string" && parsed.listing_id.trim()) {
      return parsed.listing_id.trim();
    }
  } catch {
    return null;
  }
  return null;
}

export async function findFinancingDuplicate(
  supabase: SupabaseClient,
  phone: string,
  listingId: string,
): Promise<boolean> {
  const since = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from("leads")
    .select("id, notes")
    .eq("phone", phone)
    .eq("campaign_key", FINANCING_REQUEST_CAMPAIGN_KEY)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error || !data?.length) {
    return false;
  }

  return data.some((row) => parseNotesListingId(row.notes) === listingId);
}

export function buildFinancingLeadNotes(params: {
  listingId: string;
  sellerUserId: string;
  calc: FinancingCalculationResult;
  depositPct: number;
  interestPct: number;
  termMonths: number;
}): string {
  const notes: FinancingLeadNotes = {
    type: "financing_request",
    listing_id: params.listingId,
    seller_user_id: params.sellerUserId,
    partner: FINANCING_PARTNER_ID,
    consent: true,
    consent_version: FINANCING_CONSENT_VERSION,
    calc_snapshot: {
      vehicle_price: params.calc.vehiclePrice,
      deposit_pct: params.depositPct,
      deposit_amount: params.calc.depositAmount,
      interest_pct: params.interestPct,
      term_months: params.termMonths,
      monthly_payment_estimate: params.calc.monthlyPayment,
      financed_amount: params.calc.financedAmount,
      total_interest: params.calc.totalInterest,
      total_cost_including_deposit: params.calc.totalCostIncludingDeposit,
    },
    workflow: {
      status: "new",
      sent_to_partner_at: null,
    },
    monetization: {
      quickexit_share_pct: 50,
      partner_fee_reported: null,
      quickexit_fee_due: null,
      quickexit_fee_paid: false,
    },
  };

  const serialized = JSON.stringify(notes);
  if (serialized.length > MAX_NOTES_LENGTH) {
    throw new Error("Notes JSON depășește limita permisă.");
  }
  return serialized;
}

export function buildListingSourceUrl(locale: FinancingRequestLocale, listingId: string): string {
  return `${getSiteUrl()}/${locale}/anunt/${listingId}`;
}

export async function insertFinancingLead(
  supabase: SupabaseClient,
  params: {
    body: FinancingRequestBody;
    listing: FinancingListingRow;
    calc: FinancingCalculationResult;
    notes: string;
  },
): Promise<{ ok: true; leadId: string } | { ok: false; message: string }> {
  const { body, listing, calc, notes } = params;
  const sellerUserId = String(listing.user_id ?? "").trim();
  if (!sellerUserId) {
    return { ok: false, message: "Listing fără seller." };
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({
      lead_type: "buyer",
      source: "quickexit",
      campaign_key: FINANCING_REQUEST_CAMPAIGN_KEY,
      category: "auto",
      language: body.locale,
      full_name: body.fullName,
      phone: body.phone,
      email: body.email ?? null,
      source_url: buildListingSourceUrl(body.locale, listing.id),
      asset_summary: trimText(listing.title, 4000),
      est_value_eur: Math.round(calc.vehiclePrice),
      status: "new",
      legal_basis: "consent_financing_request",
      owner_email: getFinancingLeadOwnerEmail(),
      preferred_channel: "phone",
      notes,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    console.error("[financing/request] lead insert failed", error?.message);
    return { ok: false, message: error?.message ?? "Insert lead eșuat." };
  }

  return { ok: true, leadId: data.id };
}

export async function insertFinancingLeadEvent(
  supabase: SupabaseClient,
  params: {
    leadId: string;
    listingId: string;
    sellerUserId: string;
    depositPct: number;
    interestPct: number;
    termMonths: number;
    monthlyPaymentEstimate: number;
  },
): Promise<void> {
  const { error } = await supabase.from("lead_events").insert({
    lead_id: params.leadId,
    event_type: "financing_request_submitted",
    payload: {
      listing_id: params.listingId,
      seller_user_id: params.sellerUserId,
      partner: FINANCING_PARTNER_ID,
      deposit_pct: params.depositPct,
      interest_pct: params.interestPct,
      term_months: params.termMonths,
      monthly_payment_estimate: params.monthlyPaymentEstimate,
    },
    actor_email: null,
  });

  if (error) {
    console.error("[financing/request] lead_events insert failed", {
      leadId: params.leadId,
      reason: error.message,
    });
  }
}

export function recalculateFinancingFromListing(
  listing: FinancingListingRow,
  depositPct: number,
  interestPct: number,
  termMonths: number,
): FinancingCalculationResult | null {
  const vehiclePrice = Number(listing.exit_price);
  if (!Number.isFinite(vehiclePrice) || vehiclePrice <= 0) {
    return null;
  }
  return calculateFinancing({
    vehiclePrice,
    depositPct,
    annualInterestPct: interestPct,
    months: termMonths,
  });
}

export function isListingEligibleForFinancingRequest(listing: FinancingListingRow): boolean {
  return isFinancingCalculatorEnabled(listing);
}
