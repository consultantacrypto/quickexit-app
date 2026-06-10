export const LEAD_TYPES = ["seller", "buyer", "connector"] as const;
export type LeadType = (typeof LEAD_TYPES)[number];

export const LEAD_STATUSES = [
  "new",
  "reviewed",
  "contacted",
  "responded",
  "qualified",
  "call_scheduled",
  "converted",
  "lost",
  "archived",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_CATEGORIES = [
  "auto",
  "imobiliare",
  "lux",
  "business",
  "gadgets",
  "foto",
] as const;
export type LeadCategory = (typeof LEAD_CATEGORIES)[number];

export const LEAD_LANGUAGES = ["ro", "en"] as const;

export type LeadRow = {
  id: string;
  lead_type: LeadType;
  campaign_key: string | null;
  language: string;
  preferred_channel: string | null;
  full_name: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  linkedin_url: string | null;
  source: string;
  source_url: string | null;
  data_source_note: string | null;
  legal_basis: string;
  category: string | null;
  asset_summary: string | null;
  asset_location: string | null;
  est_value_eur: number | null;
  status: LeadStatus;
  ai_score: number | null;
  ai_score_reason: string | null;
  next_action: string | null;
  next_action_at: string | null;
  notes: string | null;
  owner_email: string | null;
  delete_requested: boolean;
  created_at: string;
  updated_at: string;
};

export type LeadEventRow = {
  id: string;
  lead_id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  actor_email: string | null;
  created_at: string;
};

export type LeadMessageRow = {
  id: string;
  lead_id: string;
  channel: string;
  direction: string;
  body: string;
  generated_by_ai: boolean;
  model: string | null;
  approved_by: string | null;
  copied_at: string | null;
  sent_manually_at: string | null;
  created_at: string;
};

export type LeadCreateInput = {
  lead_type: LeadType;
  campaign_key?: string | null;
  language?: string;
  preferred_channel?: string | null;
  full_name?: string | null;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  linkedin_url?: string | null;
  source?: string;
  source_url?: string | null;
  data_source_note?: string | null;
  legal_basis?: string;
  category?: string | null;
  asset_summary?: string | null;
  asset_location?: string | null;
  est_value_eur?: number | null;
  status?: LeadStatus;
  next_action?: string | null;
  next_action_at?: string | null;
  notes?: string | null;
  owner_email?: string | null;
};

const MAX_TEXT = 500;
const MAX_LONG_TEXT = 4000;

function trimText(value: unknown, maxLen = MAX_TEXT): string | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (!raw) return null;
  return raw.slice(0, maxLen);
}

function trimLongText(value: unknown): string | null {
  return trimText(value, MAX_LONG_TEXT);
}

function parseOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ".").trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

export function isLeadType(value: unknown): value is LeadType {
  return typeof value === "string" && (LEAD_TYPES as readonly string[]).includes(value);
}

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && (LEAD_STATUSES as readonly string[]).includes(value);
}

export function isLeadCategory(value: unknown): value is LeadCategory {
  return typeof value === "string" && (LEAD_CATEGORIES as readonly string[]).includes(value);
}

export function sanitizeLeadCreateInput(
  raw: Record<string, unknown>,
  defaultOwnerEmail?: string,
): { ok: true; data: LeadCreateInput } | { ok: false; error: string } {
  if (!isLeadType(raw.lead_type)) {
    return { ok: false, error: "lead_type invalid (seller | buyer | connector)." };
  }

  const language = trimText(raw.language, 8) || "ro";
  if (!(LEAD_LANGUAGES as readonly string[]).includes(language)) {
    return { ok: false, error: "language invalid (ro | en)." };
  }

  const categoryRaw = trimText(raw.category, 40);
  if (categoryRaw && !isLeadCategory(categoryRaw)) {
    return { ok: false, error: `category invalid. Allowed: ${LEAD_CATEGORIES.join(", ")}.` };
  }

  const statusRaw = raw.status;
  const status = statusRaw === undefined || statusRaw === null ? "new" : statusRaw;
  if (!isLeadStatus(status)) {
    return { ok: false, error: "status invalid." };
  }

  const fullName = trimText(raw.full_name, 200);
  const phone = trimText(raw.phone, 40);
  const email = trimText(raw.email, 200);
  if (!fullName && !phone && !email) {
    return { ok: false, error: "Cel puțin unul din full_name, phone sau email este obligatoriu." };
  }

  let nextActionAt: string | null = null;
  if (raw.next_action_at) {
    const d = new Date(String(raw.next_action_at));
    if (Number.isNaN(d.getTime())) {
      return { ok: false, error: "next_action_at invalid." };
    }
    nextActionAt = d.toISOString();
  }

  return {
    ok: true,
    data: {
      lead_type: raw.lead_type,
      campaign_key: trimText(raw.campaign_key, 80),
      language,
      preferred_channel: trimText(raw.preferred_channel, 40),
      full_name: fullName,
      company: trimText(raw.company, 200),
      phone,
      email,
      linkedin_url: trimText(raw.linkedin_url, 500),
      source: trimText(raw.source, 80) || "manual",
      source_url: trimText(raw.source_url, 500),
      data_source_note: trimLongText(raw.data_source_note),
      legal_basis: trimText(raw.legal_basis, 80) || "legitimate_interest",
      category: categoryRaw,
      asset_summary: trimLongText(raw.asset_summary),
      asset_location: trimText(raw.asset_location, 200),
      est_value_eur: parseOptionalNumber(raw.est_value_eur),
      status,
      next_action: trimText(raw.next_action, 500),
      next_action_at: nextActionAt,
      notes: trimLongText(raw.notes),
      owner_email: trimText(raw.owner_email, 200) || defaultOwnerEmail || null,
    },
  };
}

/**
 * Paste import: one lead per line.
 * Format: lead_type, full_name, phone, email, category, asset_summary, source
 * Delimiter: tab or comma. Lines starting with # are ignored.
 */
export function parseLeadImportLines(
  text: string,
): { ok: true; rows: LeadCreateInput[] } | { ok: false; error: string; line?: number } {
  const lines = text.split(/\r?\n/);
  const rows: LeadCreateInput[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#")) continue;

    const parts = line.includes("\t") ? line.split("\t") : line.split(",").map((p) => p.trim());
    if (parts.length < 2) {
      return {
        ok: false,
        error: "Format invalid: lead_type și cel puțin un câmp de contact sunt obligatorii.",
        line: i + 1,
      };
    }

    const [leadTypeRaw, fullName, phone, email, category, assetSummary, source] = parts;
    const parsed = sanitizeLeadCreateInput({
      lead_type: leadTypeRaw?.trim().toLowerCase(),
      full_name: fullName?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      category: category?.trim() || null,
      asset_summary: assetSummary?.trim() || null,
      source: source?.trim() || "import",
    });

    if (!parsed.ok) {
      return { ok: false, error: parsed.error, line: i + 1 };
    }
    rows.push(parsed.data);
  }

  if (rows.length === 0) {
    return { ok: false, error: "Nicio linie validă de import." };
  }

  return { ok: true, rows };
}

export const LEAD_PATCHABLE_FIELDS = [
  "lead_type",
  "campaign_key",
  "language",
  "preferred_channel",
  "full_name",
  "company",
  "phone",
  "email",
  "linkedin_url",
  "source",
  "source_url",
  "data_source_note",
  "legal_basis",
  "category",
  "asset_summary",
  "asset_location",
  "est_value_eur",
  "status",
  "next_action",
  "next_action_at",
  "notes",
  "owner_email",
] as const;
