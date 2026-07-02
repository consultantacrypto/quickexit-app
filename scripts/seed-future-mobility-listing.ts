/**
 * Manual ops script — does NOT run automatically.
 * Accepts a seed payload `{ listing, details }` or a content pack (`.draft.json`).
 *
 * Usage (live insert):
 *   FUTURE_MOBILITY_SEED_FILE=./data/future-mobility/xiaomi-su7-ultra.draft.json \
 *   FUTURE_MOBILITY_LISTING_USER_ID=<uuid> \
 *   npx tsx scripts/seed-future-mobility-listing.ts
 *
 * Dry-run (validate + transform only, no Supabase):
 *   FUTURE_MOBILITY_SEED_DRY_RUN=1 \
 *   FUTURE_MOBILITY_SEED_FILE=./data/future-mobility/xiaomi-su7-ultra.draft.json \
 *   npx tsx scripts/seed-future-mobility-listing.ts
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { parseFutureMobilityDetails, FUTURE_MOBILITY_COLLECTION } from "../lib/futureMobility";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const seedFile = process.env.FUTURE_MOBILITY_SEED_FILE;
const userId = process.env.FUTURE_MOBILITY_LISTING_USER_ID;
const dryRun =
  process.env.FUTURE_MOBILITY_SEED_DRY_RUN === "1" ||
  process.env.FUTURE_MOBILITY_SEED_DRY_RUN === "true";

const FORBIDDEN_PLACEHOLDER =
  /REPLACE_WITH_|TODO|TBD|PENDING_CONFIRMATION|AUTOCONSUL_CONFIRMED_VALUE/i;

type SeedPayload = {
  listing: Record<string, unknown>;
  details: Record<string, unknown>;
};

type ContentPack = {
  listing?: Record<string, unknown>;
  details?: Record<string, unknown>;
  content?: {
    benefits?: string[];
    for_whom?: string;
  };
  commercial_status?: string;
  commercial_confirmation?: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function findForbiddenPlaceholders(value: unknown, currentPath = ""): string[] {
  const hits: string[] = [];

  if (typeof value === "string") {
    if (FORBIDDEN_PLACEHOLDER.test(value)) {
      hits.push(`${currentPath || "(root)"} contains forbidden placeholder`);
    }
    return hits;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      hits.push(...findForbiddenPlaceholders(item, `${currentPath}[${index}]`));
    });
    return hits;
  }

  if (isRecord(value)) {
    for (const [key, nested] of Object.entries(value)) {
      const nextPath = currentPath ? `${currentPath}.${key}` : key;
      hits.push(...findForbiddenPlaceholders(nested, nextPath));
    }
  }

  return hits;
}

function assertCommercialConfirmed(raw: ContentPack): void {
  const rootStatus =
    typeof raw.commercial_status === "string" ? raw.commercial_status.trim() : "";
  const nestedStatus =
    typeof raw.commercial_confirmation?.commercial_status === "string"
      ? raw.commercial_confirmation.commercial_status.trim()
      : "";

  if (
    rootStatus === "pending_partner_confirmation" ||
    nestedStatus === "pending_partner_confirmation"
  ) {
    console.error(
      "Future Mobility listing cannot be seeded while commercial confirmation is pending.",
    );
    process.exit(1);
  }
}

function buildDescriptionFromPack(
  listing: Record<string, unknown>,
  content?: ContentPack["content"],
): string {
  const base =
    (typeof listing.description === "string" && listing.description.trim()) ||
    (typeof listing.description_long === "string" && listing.description_long.trim()) ||
    (typeof listing.description_short === "string" && listing.description_short.trim()) ||
    "";

  const sections: string[] = [];
  if (base) sections.push(base);

  if (content?.benefits?.length) {
    sections.push(
      ["Beneficii principale:", ...content.benefits.map((item) => `• ${item}`)].join("\n"),
    );
  }

  if (content?.for_whom?.trim()) {
    sections.push(`Pentru cine este:\n${content.for_whom.trim()}`);
  }

  const merged = sections.join("\n\n").trim();
  if (!merged) {
    console.error("listing.description cannot be empty after content pack transformation.");
    process.exit(1);
  }

  return merged;
}

function transformContentPack(raw: ContentPack): SeedPayload {
  if (!raw.listing || !raw.details) {
    console.error("Seed file must contain { listing, details }.");
    process.exit(1);
  }

  const listing: Record<string, unknown> = { ...raw.listing };
  const details: Record<string, unknown> = { ...raw.details };

  if (!listing.description) {
    listing.description = buildDescriptionFromPack(listing, raw.content);
  }

  delete listing.description_long;
  delete listing.description_short;

  return { listing, details };
}

function assertNonEmptyImages(listing: Record<string, unknown>): void {
  const images = listing.images;
  if (!Array.isArray(images) || images.length === 0) {
    console.error("listing.images must contain at least one image URL before live seed.");
    process.exit(1);
  }
}

function printDryRunSummary(payload: SeedPayload, modelSlug: string | undefined): void {
  const description =
    typeof payload.listing.description === "string" ? payload.listing.description : "";
  const imageCount = Array.isArray(payload.listing.images) ? payload.listing.images.length : 0;

  console.log("Future Mobility seed dry-run OK");
  console.log(
    JSON.stringify(
      {
        model_slug: modelSlug ?? null,
        title: payload.listing.title ?? null,
        description_length: description.length,
        image_count: imageCount,
        collection: payload.details.collection ?? null,
      },
      null,
      2,
    ),
  );
}

async function main() {
  if (!seedFile?.trim()) {
    console.error("Set FUTURE_MOBILITY_SEED_FILE to a JSON payload path.");
    process.exit(1);
  }

  if (!dryRun && !userId?.trim()) {
    console.error("Set FUTURE_MOBILITY_LISTING_USER_ID to the seller user UUID.");
    process.exit(1);
  }

  if (!dryRun && (!supabaseUrl || !serviceRoleKey)) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const resolvedSeedFile = seedFile.trim();
  const resolvedUserId = userId?.trim() ?? "";
  const absolutePath = path.resolve(process.cwd(), resolvedSeedFile);

  if (!fs.existsSync(absolutePath)) {
    console.error(`Seed file not found: ${absolutePath}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(absolutePath, "utf-8")) as ContentPack & SeedPayload;

  if (!dryRun) {
    assertCommercialConfirmed(raw);
  }

  const payload: SeedPayload =
    raw.content || raw.commercial_status || raw.commercial_confirmation
      ? transformContentPack(raw)
      : { listing: raw.listing, details: raw.details };

  if (!payload?.listing || !payload?.details) {
    console.error("Seed file must contain { listing, details }.");
    process.exit(1);
  }

  if (payload.details.collection !== FUTURE_MOBILITY_COLLECTION) {
    console.error(`details.collection must be "${FUTURE_MOBILITY_COLLECTION}".`);
    process.exit(1);
  }

  const parsed = parseFutureMobilityDetails(payload.details);
  if (!parsed) {
    console.error("details failed Future Mobility validation.");
    process.exit(1);
  }

  const placeholderHits = [
    ...findForbiddenPlaceholders(payload.listing, "listing"),
    ...findForbiddenPlaceholders(payload.details, "details"),
  ];
  if (placeholderHits.length > 0) {
    for (const hit of placeholderHits) {
      console.error(hit);
    }
    process.exit(1);
  }

  if (
    !payload.listing.description ||
    (typeof payload.listing.description === "string" && !payload.listing.description.trim())
  ) {
    console.error("listing.description is required and cannot be empty.");
    process.exit(1);
  }

  const modelSlug = parsed.model_slug;

  if (dryRun) {
    printDryRunSummary(payload, modelSlug);
    return;
  }

  assertNonEmptyImages(payload.listing);

  const supabase = createClient(supabaseUrl!, serviceRoleKey!);

  if (modelSlug) {
    const { data: existing } = await supabase
      .from("listings")
      .select("id")
      .eq("status", "active")
      .filter("details->>collection", "eq", FUTURE_MOBILITY_COLLECTION)
      .filter("details->>model_slug", "eq", modelSlug)
      .maybeSingle();

    if (existing?.id) {
      console.log(
        `Active Future Mobility listing already exists for model_slug=${modelSlug} (${existing.id}).`,
      );
      process.exit(0);
    }
  }

  const insertRow = {
    ...payload.listing,
    user_id: resolvedUserId,
    details: payload.details,
    status: "active",
    is_seed: false,
  };

  const { data, error } = await supabase.from("listings").insert(insertRow).select("id").single();
  if (error) {
    console.error("Insert failed:", error.message);
    process.exit(1);
  }

  console.log(`Future Mobility listing created: ${data.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
