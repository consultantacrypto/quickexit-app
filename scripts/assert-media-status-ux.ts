/**
 * Phase 2F — Media payment status UX assertions (read-only; no Stripe/webhook mutations).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  indexMediaOrdersByListingId,
  mapMediaEditorialStatusToUx,
  MEDIA_STATUS_MAX_REFRESHES,
  pickPrimaryMediaOrderForListing,
  resolveMediaPaymentUx,
  type MediaOrderStatusView,
} from "../lib/mediaStatusDisplay";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

assert(MEDIA_STATUS_MAX_REFRESHES === 2, "bounded refresh max");
assert(mapMediaEditorialStatusToUx("queued") === "queued", "queued map");
assert(mapMediaEditorialStatusToUx("in_production") === "in_production", "in_production map");
assert(mapMediaEditorialStatusToUx("unknown_status") === null, "unknown editorial hidden");
assert(mapMediaEditorialStatusToUx("PAID") === null, "raw payment string not editorial");

const pending: MediaOrderStatusView = {
  id: "mo1",
  listing_id: "L1",
  package: "stories_4",
  payment_status: "pending",
  editorial_status: "queued",
  amount_ron: 299,
  currency: "ron",
  paid_at: null,
};
const paid: MediaOrderStatusView = {
  ...pending,
  id: "mo2",
  payment_status: "paid",
  paid_at: "2026-10-06T10:00:00.000Z",
};
const failed: MediaOrderStatusView = {
  ...pending,
  id: "mo3",
  payment_status: "failed",
};

assert(
  resolveMediaPaymentUx({
    paymentSuccessContext: true,
    listingStatus: "pending_payment",
    mediaOrder: pending,
  }).ux === "processing",
  "success + pending listing → processing",
);
assert(
  resolveMediaPaymentUx({
    paymentSuccessContext: true,
    listingStatus: "active",
    mediaOrder: pending,
  }).ux === "listingActiveMediaPending",
  "active + media pending",
);
assert(
  resolveMediaPaymentUx({
    paymentSuccessContext: true,
    listingStatus: "active",
    mediaOrder: paid,
  }).ux === "listingActiveMediaPaid",
  "active + media paid",
);
assert(
  resolveMediaPaymentUx({
    paymentSuccessContext: true,
    listingStatus: "active",
    mediaOrder: paid,
  }).showEditorial === true,
  "show editorial when paid",
);
assert(
  resolveMediaPaymentUx({
    paymentSuccessContext: false,
    listingStatus: "active",
    mediaOrder: failed,
  }).ux === "mediaFailed",
  "failed media visible without success query",
);
assert(
  resolveMediaPaymentUx({
    paymentSuccessContext: true,
    listingStatus: "active",
    mediaOrder: null,
  }).ux === "listingOnlySuccess",
  "listing-only success",
);
assert(
  resolveMediaPaymentUx({
    paymentSuccessContext: true,
    listingStatus: "pending_payment",
    mediaOrder: pending,
  }).shouldRefresh === true,
  "processing should refresh",
);
assert(
  resolveMediaPaymentUx({
    paymentSuccessContext: false,
    listingStatus: "active",
    mediaOrder: paid,
  }).shouldRefresh === false,
  "paid card no refresh",
);

const cancelledHistory: MediaOrderStatusView = {
  ...pending,
  id: "mo0",
  payment_status: "cancelled",
};
assert(
  pickPrimaryMediaOrderForListing([cancelledHistory, pending], "L1")?.id === "mo1",
  "prefer pending over cancelled history",
);
assert(
  pickPrimaryMediaOrderForListing([cancelledHistory, paid], "L1")?.payment_status === "paid",
  "prefer paid over cancelled",
);

const indexed = indexMediaOrdersByListingId([
  { ...pending, listing_id: "L1" },
  { ...paid, listing_id: "L2", id: "moL2" },
]);
assert(indexed.L1?.payment_status === "pending", "index L1");
assert(indexed.L2?.payment_status === "paid", "index L2");

const dash = readFileSync(resolve("app/[locale]/dashboard/page.tsx"), "utf8");
assert(dash.includes("MediaPaymentStatusBanner"), "dashboard uses status banner");
assert(dash.includes("media_orders"), "dashboard reads media_orders");
assert(dash.includes("MEDIA_STATUS_MAX_REFRESHES"), "bounded refresh wired");
assert(!/payment_status:\s*['\"]paid['\"]/.test(dash), "dashboard does not mark paid");
assert(!dash.includes("markMediaOrderPaid"), "no client fulfillment helper");
assert(!dash.includes("/api/stripe/webhook"), "dashboard does not call webhook");
assert(dash.includes("paymentCancel.message"), "cancel copy still used");
assert(dash.includes("mediaPackage: mediaFromDraft"), "cancel resume may restore Media from draft");

const banner = readFileSync(resolve("app/components/MediaPaymentStatusBanner.tsx"), "utf8");
assert(banner.includes("role=\"status\""), "banner a11y status");
assert(banner.includes("data-media-ux"), "banner ux attribute for QA");
assert(!banner.includes("fetch("), "banner is display-only");

const ro = JSON.parse(readFileSync(resolve("messages/ro.json"), "utf8"));
const en = JSON.parse(readFileSync(resolve("messages/en.json"), "utf8"));
assert(
  ro.Dashboard?.paymentCancel?.message?.includes("anulată"),
  "ro cancel copy updated",
);
assert(
  en.Dashboard?.paymentCancel?.message?.includes("cancelled"),
  "en cancel copy updated",
);
assert(
  ro.Dashboard?.mediaPaymentStatus?.listingActiveMediaPaid?.includes("QuickExit Media"),
  "ro paid media copy",
);
assert(
  en.Dashboard?.mediaEditorialStatus?.queued?.toLowerCase().includes("waiting"),
  "en editorial queued",
);
assert(
  ro.Dashboard?.mediaEditorialStatus?.published === "Publicat",
  "ro published label",
);

// Media history display is not gated on the checkout feature flag (select is unconditional).
assert(dash.includes('.from("media_orders")'), "orders fetched without flag gate around select");
assert(
  dash.includes("mediaOrdersByListingId[item.id]"),
  "existing Media order can render on listing cards",
);

const prep = readFileSync(resolve("docs/internal/media-sandbox-e2e-prep.md"), "utf8");
assert(prep.includes("STRIPE_WEBHOOK_ALLOW_TEST_EVENTS"), "env contract documented");
assert(prep.includes("/api/stripe/webhook"), "canonical webhook documented");
assert(prep.includes("Do not") || prep.includes("Do NOT"), "safety language present");
assert(!prep.includes("geywuzwbzecknokvnins") || prep.includes("must **not**"), "prod ref warned");

const webhook = readFileSync(resolve("app/api/stripe/webhook/route.ts"), "utf8");
assert(webhook.includes("markMediaOrderPaid"), "2E webhook still present");
const legacy = readFileSync(resolve("app/api/webhook/route.ts"), "utf8");
assert(!legacy.includes("media_orders"), "legacy webhook untouched");

console.log("OK media-status-ux-phase-2f");
