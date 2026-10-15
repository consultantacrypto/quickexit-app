/**
 * Format demand.requirements jsonb for public cards / detail.
 * Keys are category-specific form fields from PosteazaCerereClient.
 */

const LABEL_RO: Record<string, string> = {
  modele: "Modele",
  an_minim: "An minim",
  km_max: "Rulaj max",
  culoare: "Culoare",
  locatie: "Locație",
  tip_proprietate: "Tip proprietate",
  suprafata_min: "Suprafață min",
  stadiu: "Stadiu",
  brand_model: "Brand / model",
  stare: "Stare",
  acte: "Documente",
  an: "An",
  domeniu: "Domeniu",
  vechime_min: "Vechime min",
  conditii_achizitie: "Condiții",
  model_specs: "Specificații",
};

const LABEL_EN: Record<string, string> = {
  modele: "Models",
  an_minim: "Min year",
  km_max: "Max km",
  culoare: "Color",
  locatie: "Location",
  tip_proprietate: "Property type",
  suprafata_min: "Min area",
  stadiu: "Stage",
  brand_model: "Brand / model",
  stare: "Condition",
  acte: "Documents",
  an: "Year",
  domeniu: "Domain",
  vechime_min: "Min age",
  conditii_achizitie: "Conditions",
  model_specs: "Specs",
};

export type DemandRequirementChip = {
  key: string;
  label: string;
  value: string;
};

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

export function parseDemandRequirements(raw: unknown): DemandRequirementChip[] {
  const obj = asRecord(raw);
  if (!obj) return [];
  const chips: DemandRequirementChip[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value == null) continue;
    const text = String(value).trim();
    if (!text) continue;
    chips.push({
      key,
      label: LABEL_RO[key] ?? key.replace(/_/g, " "),
      value: text.slice(0, 80),
    });
  }
  return chips;
}

export function formatDemandRequirementChips(
  raw: unknown,
  locale: "ro" | "en",
  limit = 4,
): DemandRequirementChip[] {
  const labels = locale === "en" ? LABEL_EN : LABEL_RO;
  return parseDemandRequirements(raw)
    .map((chip) => ({
      ...chip,
      label: labels[chip.key] ?? chip.label,
    }))
    .slice(0, Math.max(0, limit));
}

export function extractDemandLocation(raw: unknown): string | null {
  const obj = asRecord(raw);
  if (!obj) return null;
  const loc = obj.locatie;
  if (loc == null) return null;
  const text = String(loc).trim();
  return text || null;
}
