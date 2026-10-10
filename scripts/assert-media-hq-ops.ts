import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildMediaEditorialTransition,
  canTransitionMediaEditorial,
  MEDIA_EDITORIAL_TRANSITIONS,
  MEDIA_HQ_TAB_STATUSES,
  parseMediaHqListQuery,
} from "../lib/mediaHqOps";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const orderId = "11111111-1111-4111-8111-111111111111";

// Valid transitions
assert(canTransitionMediaEditorial("queued", "in_research"), "queued→research");
assert(canTransitionMediaEditorial("queued", "needs_info"), "queued→needs_info");
assert(canTransitionMediaEditorial("in_research", "in_production"), "research→prod");
assert(canTransitionMediaEditorial("in_production", "published"), "prod→published");
assert(canTransitionMediaEditorial("queued", "rejected"), "queued→rejected");
assert(canTransitionMediaEditorial("in_production", "cancelled"), "prod→cancelled");

// Invalid transitions
assert(!canTransitionMediaEditorial("queued", "published"), "no skip to published");
assert(!canTransitionMediaEditorial("published", "in_research"), "published terminal");
assert(!canTransitionMediaEditorial("rejected", "queued"), "rejected terminal");
assert(!canTransitionMediaEditorial("cancelled", "queued"), "cancelled terminal");
assert(!canTransitionMediaEditorial("queued", "queued"), "no noop");

const published = buildMediaEditorialTransition({
  orderId,
  toStatus: "published",
  currentStatus: "in_production",
  currentFulfilledAt: null,
});
assert(published.ok, "publish build ok");
if (published.ok) {
  assert(published.patch.editorial_status === "published", "publish status");
  assert(typeof published.patch.fulfilled_at === "string", "sets fulfilled_at");
  assert(!("payment_status" in published.patch), "never patches payment_status");
}

const publishedKeepFulfilled = buildMediaEditorialTransition({
  orderId,
  toStatus: "published",
  currentStatus: "in_production",
  currentFulfilledAt: "2026-01-01T00:00:00.000Z",
});
assert(publishedKeepFulfilled.ok, "publish keep fulfilled ok");
if (publishedKeepFulfilled.ok) {
  assert(
    publishedKeepFulfilled.patch.fulfilled_at === undefined,
    "does not overwrite fulfilled_at",
  );
}

const rejectMissing = buildMediaEditorialTransition({
  orderId,
  toStatus: "rejected",
  currentStatus: "queued",
  currentFulfilledAt: null,
  rejectionReason: "x",
});
assert(!rejectMissing.ok, "reject requires reason length");

const rejectOk = buildMediaEditorialTransition({
  orderId,
  toStatus: "rejected",
  currentStatus: "queued",
  currentFulfilledAt: null,
  rejectionReason: "Missing asset photos for editorial package.",
});
assert(rejectOk.ok, "reject with reason ok");
if (rejectOk.ok) {
  assert(rejectOk.patch.rejection_reason?.includes("Missing"), "stores reason");
  assert(!("payment_status" in rejectOk.patch), "reject never changes payment");
}

const invalid = buildMediaEditorialTransition({
  orderId,
  toStatus: "published",
  currentStatus: "queued",
  currentFulfilledAt: null,
});
assert(!invalid.ok && invalid.error_code === "invalid_transition", "invalid transition");

const tab = parseMediaHqListQuery(new URLSearchParams("tab=in_research&limit=10"));
assert(tab.ok && tab.ok && tab.tab === "in_research" && tab.limit === 10, "parse tab");
assert(MEDIA_HQ_TAB_STATUSES.closed.includes("rejected"), "closed includes rejected");
assert(MEDIA_HQ_TAB_STATUSES.closed.includes("cancelled"), "closed includes cancelled");

for (const [from, tos] of Object.entries(MEDIA_EDITORIAL_TRANSITIONS)) {
  for (const to of tos) {
    assert(canTransitionMediaEditorial(from as never, to), `map ${from}→${to}`);
  }
}

const route = readFileSync(resolve("app/api/hq/media-orders/route.ts"), "utf8");
assert(route.includes("assertHqAdminFromBearer"), "API requires HQ auth");
assert(route.includes("buildMediaEditorialTransition"), "API uses transition builder");
assert(!route.includes(".update({ payment_status"), "API does not set payment_status");
assert(route.includes('from("media_orders")'), "queries media_orders");

const client = readFileSync(
  resolve("app/[locale]/hq-admin/media/MediaOpsClient.tsx"),
  "utf8",
);
assert(client.includes("/api/hq/media-orders"), "client calls HQ API");
assert(client.includes("Authorization"), "client sends bearer");
assert(!client.includes("SUPABASE_SERVICE_ROLE"), "no service role in client");
assert(!client.includes('.from("media_orders").update'), "no client direct update");
assert(!client.includes("consultantacrypto"), "no hardcoded admin email in Media client");
assert(!/ADMIN_EMAILS\s*=/.test(client), "no client ADMIN_EMAILS allowlist");
assert(!client.includes("NEXT_PUBLIC_HQ_ADMIN"), "no public admin allowlist");

const mediaPage = readFileSync(
  resolve("app/[locale]/hq-admin/media/page.tsx"),
  "utf8",
);
const hqLayout = readFileSync(resolve("app/[locale]/hq-admin/layout.tsx"), "utf8");
assert(hqLayout.includes("resolveHqAdminPageAuth"), "shared hq-admin layout server gate");
assert(mediaPage.includes("MediaOpsClient"), "renders client after shared layout gate");
assert(
  !mediaPage.includes("resolveMediaHqPageAuth"),
  "media page uses shared layout instead of local gate",
);

const serverAuth = readFileSync(resolve("lib/mediaHqServerAuth.ts"), "utf8");
assert(serverAuth.includes("resolveHqAdminPageAuth"), "Media auth delegates to canonical HQ auth");
assert(!serverAuth.includes("NEXT_PUBLIC"), "allowlist stays server-only");
assert(!serverAuth.includes("consultantacrypto"), "no hardcoded email in server auth");

const pageAuth = readFileSync(resolve("lib/hqAdminPageAuth.ts"), "utf8");
const allowlist = readFileSync(resolve("lib/hqAdminAllowlist.ts"), "utf8");
assert(pageAuth.includes("createServerSupabaseClient"), "canonical cookie session");
assert(pageAuth.includes("getUser"), "validates user server-side");
assert(pageAuth.includes('status: "authorized"'), "authorized status");
assert(allowlist.includes("getHqAdminEmails"), "uses HQ_ADMIN_EMAILS helper");

const hqPage = readFileSync(resolve("app/[locale]/hq-admin/page.tsx"), "utf8");
assert(hqPage.includes("/hq-admin/media"), "HQ nav link to media");

const checkout = readFileSync(resolve("app/api/stripe/checkout/route.ts"), "utf8");
const webhook = readFileSync(resolve("app/api/stripe/webhook/route.ts"), "utf8");
assert(checkout.includes("isMediaCheckoutEnabled"), "checkout untouched marker");
assert(webhook.includes("mediaWebhookFulfillment"), "webhook media fulfill marker");

const ro = JSON.parse(readFileSync(resolve("messages/ro.json"), "utf8"));
const en = JSON.parse(readFileSync(resolve("messages/en.json"), "utf8"));
assert(
  ro.Dashboard.mediaEditorialStatus.queued.includes("coada editorială"),
  "ro queued copy",
);
assert(
  en.Dashboard.mediaEditorialStatus.published.includes("has been published"),
  "en published copy",
);
assert(
  !String(ro.Dashboard.mediaEditorialStatus.rejected).includes("rejection_reason"),
  "no raw rejection_reason in seller copy",
);

const sql = readFileSync(resolve("docs/internal/sql/media-orders.sql"), "utf8");
assert(sql.includes("GRANT SELECT ON public.media_orders TO authenticated"), "owner select grant");
assert(!/GRANT UPDATE ON public\.media_orders TO authenticated/.test(sql), "no client update grant");
assert(!/FOR UPDATE/.test(sql), "no update policy");

console.log("OK media-hq-ops");
