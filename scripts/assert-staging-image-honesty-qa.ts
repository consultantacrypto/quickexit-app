/**
 * Static security + wiring asserts for Staging Image Honesty QA tooling.
 * No network, no DB, no Storage writes.
 * Run: npx tsx scripts/assert-staging-image-honesty-qa.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  IMAGE_HONESTY_QA_MARKER,
  IMAGE_HONESTY_QA_TITLE_PREFIX,
  PRODUCTION_SUPABASE_HOST,
  STAGING_SUPABASE_HOST,
  assertStagingImageHonestyPlane,
  buildImageHonestyQaTitle,
  solidPngBytes,
} from "../lib/stagingImageHonestyQa";
import { PUBLIC_LISTING_SORT_PRIMARY } from "../lib/listingRank";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

// --- Plane lock unit tests ---
assert(
  STAGING_SUPABASE_HOST === "nlnzlswjjplofpkhoxtr.supabase.co",
  "Staging host constant",
);
assert(
  PRODUCTION_SUPABASE_HOST === "geywuzwbzecknokvnins.supabase.co",
  "Production host constant",
);

const refuseProdVercel = assertStagingImageHonestyPlane({
  VERCEL_ENV: "production",
  NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING_SUPABASE_HOST}`,
  NODE_ENV: "production",
} as NodeJS.ProcessEnv);
assert(!refuseProdVercel.ok, "refuses Vercel production even with Staging URL");
assert(
  !refuseProdVercel.ok && refuseProdVercel.error === "refused_vercel_production",
  "production vercel error code",
);

const refuseProdHost = assertStagingImageHonestyPlane({
  VERCEL_ENV: "preview",
  NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_SUPABASE_HOST}`,
  NODE_ENV: "production",
} as NodeJS.ProcessEnv);
assert(!refuseProdHost.ok, "refuses Production Supabase host on Preview");
assert(
  !refuseProdHost.ok && refuseProdHost.error === "refused_production_supabase_host",
  "production host error code",
);

const refuseUnknown = assertStagingImageHonestyPlane({
  VERCEL_ENV: "",
  NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING_SUPABASE_HOST}`,
  NODE_ENV: "production",
} as NodeJS.ProcessEnv);
assert(!refuseUnknown.ok, "refuses unknown deploy context");

const allowPreview = assertStagingImageHonestyPlane({
  VERCEL_ENV: "preview",
  NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING_SUPABASE_HOST}`,
  NODE_ENV: "production",
} as NodeJS.ProcessEnv);
assert(allowPreview.ok, "allows Preview + Staging host");

const allowDev = assertStagingImageHonestyPlane({
  VERCEL_ENV: "development",
  NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING_SUPABASE_HOST}`,
  NODE_ENV: "development",
} as NodeJS.ProcessEnv);
assert(allowDev.ok, "allows development + Staging host");

const title = buildImageHonestyQaTitle("unit");
assert(title.startsWith(IMAGE_HONESTY_QA_TITLE_PREFIX), "QA title prefix");
assert(IMAGE_HONESTY_QA_MARKER === "image_honesty_pra_v1", "QA marker stable");

const png = solidPngBytes(8, 6, [255, 209, 0]);
assert(png[0] === 137 && png[1] === 80 && png[2] === 78 && png[3] === 71, "PNG signature");
assert(png.length > 40, "PNG has payload");

// --- Source wiring / security ---
const actions = readFileSync(
  resolve("app/actions/stagingImageHonestyQaActions.ts"),
  "utf8",
);
assert(actions.includes("assertStagingImageHonestyPlane"), "actions plane-lock");
assert(actions.includes("resolveHqAdminPageAuth"), "actions HQ cookie auth");
assert(actions.includes('status: "pending_payment"'), "creates pending_payment only");
assert(!/status:\s*["']active["']/.test(actions), "never inserts status=active");
assert(!actions.includes("stripe"), "no stripe references in actions");
assert(!actions.includes("SERVICE_ROLE"), "no service role in actions");
assert(!actions.includes("service_role"), "no service_role string in actions");
assert(!actions.includes("createClient("), "no ad-hoc supabase admin client");
assert(actions.includes("createServerSupabaseClient"), "uses cookie SSR client");
assert(actions.includes("IMAGE_HONESTY_QA_MARKER"), "marks details.qa");
assert(actions.includes("refused_non_qa_title"), "cleanup title gate");
assert(actions.includes("refused_missing_qa_marker"), "cleanup marker gate");
assert(actions.includes("forbidden_not_owner"), "cleanup owner gate");
assert(actions.includes(".storage"), "uses storage API");
assert(actions.includes('.from("listings")'), "writes listings bucket/table");
assert(actions.includes("upload_url_not_staging"), "rejects non-staging public URL");
assert(
  !actions.includes("console.log") && !actions.includes("console.info"),
  "actions do not log fixture payloads",
);

const helpers = readFileSync(resolve("lib/stagingImageHonestyQa.ts"), "utf8");
assert(helpers.includes("refused_vercel_production"), "helper refuses prod vercel");
assert(helpers.includes("refused_production_supabase_host"), "helper refuses prod host");
assert(helpers.includes("refused_non_staging_supabase_host"), "helper requires staging host");
assert(!helpers.includes("SERVICE_ROLE"), "helpers have no service role");

const client = readFileSync(
  resolve("app/[locale]/hq-admin/image-honesty-qa/ImageHonestyQaClient.tsx"),
  "utf8",
);
assert(client.includes("createStagingImageHonestyQaFixture"), "client create action");
assert(client.includes("cleanupStagingImageHonestyQaFixture"), "client cleanup action");
assert(client.includes("ListingMedia"), "client previews ListingMedia");
assert(client.includes("AdCard"), "client previews AdCard");
assert(client.includes("Creează test"), "client create CTA label");
assert(client.includes("Curăță test"), "client cleanup CTA label");
assert(client.includes("STAGING ONLY"), "client Staging-only badge");
assert(!client.includes("SERVICE_ROLE"), "client no service role");
assert(!client.includes("consultantacrypto"), "client no hardcoded admin email");
assert(!client.includes("NEXT_PUBLIC_HQ_ADMIN"), "client no public allowlist");
assert(!client.includes("stripe"), "client no stripe");
assert(actions.includes("storage_remove_failed"), "cleanup reports storage remove errors");

const page = readFileSync(
  resolve("app/[locale]/hq-admin/image-honesty-qa/page.tsx"),
  "utf8",
);
assert(page.includes("ImageHonestyQaClient"), "page renders client");

const hqLayout = readFileSync(resolve("app/[locale]/hq-admin/layout.tsx"), "utf8");
assert(hqLayout.includes("resolveHqAdminPageAuth"), "hq-admin layout server gate");

const hqPage = readFileSync(resolve("app/[locale]/hq-admin/page.tsx"), "utf8");
assert(hqPage.includes("/hq-admin/image-honesty-qa"), "HQ nav link present");

// No unauthenticated public fixture API
const apiTreeHint = readFileSync(
  resolve("app/actions/stagingImageHonestyQaActions.ts"),
  "utf8",
);
assert(
  !apiTreeHint.includes("export async function GET") &&
    !apiTreeHint.includes("NextResponse"),
  "actions are not an HTTP route",
);

// Admin Bump ranking untouched by this tooling
const category = readFileSync(
  resolve("app/[locale]/categorii/[slug]/CategorieClient.tsx"),
  "utf8",
);
assert(
  category.includes(`.order("${PUBLIC_LISTING_SORT_PRIMARY}", { ascending: false })`),
  "category effective_sort_at ordering preserved",
);
const bumpAssert = readFileSync(resolve("scripts/assert-listing-admin-bump.ts"), "utf8");
assert(bumpAssert.includes("hq_bump_listing"), "bump assert still present");

const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8")) as {
  scripts?: Record<string, string>;
};
assert(
  Boolean(pkg.scripts?.["assert:staging-image-honesty-qa"]),
  "package.json script registered",
);

console.log("OK staging-image-honesty-qa");
