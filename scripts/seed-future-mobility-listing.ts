/**
 * Manual ops script — does NOT run automatically.
 * Reads listing + details from a JSON file with confirmed commercial data.
 *
 * Usage:
 *   FUTURE_MOBILITY_SEED_FILE=./path/to/listing.json \
 *   FUTURE_MOBILITY_LISTING_USER_ID=<uuid> \
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

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const resolvedSupabaseUrl = supabaseUrl;
const resolvedServiceRoleKey = serviceRoleKey;

if (!seedFile?.trim()) {
  console.error("Set FUTURE_MOBILITY_SEED_FILE to a JSON payload path.");
  process.exit(1);
}

if (!userId?.trim()) {
  console.error("Set FUTURE_MOBILITY_LISTING_USER_ID to the seller user UUID.");
  process.exit(1);
}

const resolvedSeedFile = seedFile.trim();
const resolvedUserId = userId.trim();

type SeedPayload = {
  listing: Record<string, unknown>;
  details: Record<string, unknown>;
};

async function main() {
  const absolutePath = path.resolve(process.cwd(), resolvedSeedFile);
  if (!fs.existsSync(absolutePath)) {
    console.error(`Seed file not found: ${absolutePath}`);
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(absolutePath, "utf-8")) as SeedPayload;
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

  const placeholderPattern = /REPLACE_WITH_CONFIRMED_/i;
  const serialized = JSON.stringify(payload);
  if (placeholderPattern.test(serialized)) {
    console.error("Seed payload still contains REPLACE_WITH_CONFIRMED_* placeholders.");
    process.exit(1);
  }

  const supabase = createClient(resolvedSupabaseUrl, resolvedServiceRoleKey);
  const modelSlug = parsed.model_slug;

  if (modelSlug) {
    const { data: existing } = await supabase
      .from("listings")
      .select("id")
      .eq("status", "active")
      .filter("details->>collection", "eq", FUTURE_MOBILITY_COLLECTION)
      .filter("details->>model_slug", "eq", modelSlug)
      .maybeSingle();

    if (existing?.id) {
      console.log(`Active Future Mobility listing already exists for model_slug=${modelSlug} (${existing.id}).`);
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
