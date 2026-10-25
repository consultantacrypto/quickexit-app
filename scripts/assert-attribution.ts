import { readFileSync } from "node:fs";
import { CHANNEL_LINKS, buildChannelRedirect, channelLinkUrl } from "../lib/channelLinks";
import {
  absorbTouch,
  attributionMetadata,
  parseHeardFrom,
  sanitizeUtmValue,
  snapshotFromMetadata,
  touchFromLocation,
} from "../lib/attribution";
import { buildHqMetrics } from "../lib/hqMetrics";
import { buildSocialShareKit } from "../lib/socialShare";
import { DEFAULT_HOUSE_ACCOUNT_ID } from "../lib/hqHouseAccount";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const codes = CHANNEL_LINKS.map((link) => link.code);
for (const code of ["yt-md", "yt-qe", "tt-md", "tt-qe", "ig-qe", "x-qe", "x-md"]) {
  assert(codes.includes(code), `channel code ${code} exists`);
  assert(channelLinkUrl(code) === `https://www.quickexit.ro/go/${code}`, `${code} public URL`);
}

const redirect = buildChannelRedirect({
  code: "yt-md",
  origin: "https://www.quickexit.ro",
  content: "dQw4w9WgXcQ",
  now: "2026-10-22T08:00:00.000Z",
});
const location = new URL(redirect.location);
assert(location.pathname === "/ro", "channel link lands on the Romanian homepage");
assert(location.searchParams.get("utm_source") === "youtube", "yt-md source");
assert(location.searchParams.get("utm_medium") === "social", "yt-md medium");
assert(location.searchParams.get("utm_campaign") === "mihai_daniel", "yt-md campaign");
assert(location.searchParams.get("utm_content") === "dQw4w9WgXcQ", "video id becomes utm_content");
assert(redirect.setCookie?.value.includes("youtube"), "redirect cookie stores the touch");

const targeted = buildChannelRedirect({
  code: "ig-qe",
  origin: "https://www.quickexit.ro",
  to: "/tarife",
  now: "2026-10-22T08:00:00.000Z",
});
assert(new URL(targeted.location).pathname === "/ro/tarife", "to= path is locale-prefixed");

const unknown = buildChannelRedirect({
  code: "nope",
  origin: "https://www.quickexit.ro",
});
assert(unknown.location === "https://www.quickexit.ro/ro", "unknown code goes home");
assert(unknown.setCookie === null, "unknown code does not write attribution");

const first = absorbTouch(null, {
  utm_source: "youtube",
  utm_medium: "social",
  utm_campaign: "mihai_daniel",
  landing_path: "/ro",
  captured_at: "2026-10-01T00:00:00.000Z",
});
const second = absorbTouch(first, {
  utm_source: "tiktok",
  utm_medium: "social",
  utm_campaign: "quickexit",
  ttclid: "CLICK123",
  landing_path: "/ro/anunturi",
  captured_at: "2026-10-22T00:00:00.000Z",
});
assert(second.first?.utm_source === "youtube", "first touch is kept");
assert(second.last?.utm_source === "tiktok", "last touch updates");
assert(second.last?.ttclid === "CLICK123", "click id is stored on the touch");
assert(sanitizeUtmValue("user@example.com") === undefined, "email-like utm is dropped");

const touch = touchFromLocation(
  "https://www.quickexit.ro/ro?utm_source=google&utm_medium=cpc&gclid=GCLID123&email=a@b.c",
  "https://www.google.com/search",
  "2026-10-22T09:00:00.000Z",
);
assert(touch?.utm_source === "google", "landing utm captured");
assert(touch?.gclid === "GCLID123", "gclid captured separately from utm");
assert(touch?.referrer === "https://www.google.com/search", "external referrer kept without query");
assert(!JSON.stringify(touch).includes("a@b.c"), "landing touch drops the email query");

assert(parseHeardFrom("other", "x") === null, "Altceva needs a short note");
assert(parseHeardFrom("other", "un podcast")?.heard_from === "other", "Altceva with text is valid");
assert(parseHeardFrom("youtube_mihai_daniel", "")?.heard_from_detail === null, "named option needs no detail");

const meta = attributionMetadata(second);
const roundTrip = snapshotFromMetadata(meta);
assert(roundTrip.first?.utm_source === "youtube", "stripe metadata keeps first source");
assert(roundTrip.last?.ttclid === "CLICK123", "stripe metadata keeps last click id");

const house = DEFAULT_HOUSE_ACCOUNT_ID;
const report = buildHqMetrics({
  now: new Date("2026-10-22T10:00:00.000Z"),
  excludeHouse: true,
  houseIds: [house],
  listings: [
    {
      id: "house",
      actor_id: house,
      status: "active",
      created_at: "2026-10-10T10:00:00.000Z",
      attribution_first: { utm_source: "youtube", utm_medium: "social" },
    },
    {
      id: "organic",
      actor_id: "11111111-1111-4111-8111-111111111111",
      status: "pending_payment",
      created_at: "2026-10-20T10:00:00.000Z",
      heard_from: "youtube_quickexit",
      attribution_first: { utm_source: "youtube", utm_medium: "social" },
    },
    {
      id: "paid",
      actor_id: "22222222-2222-4222-8222-222222222222",
      status: "active",
      created_at: "2026-10-21T10:00:00.000Z",
      attribution_first: { utm_source: "google", utm_medium: "cpc" },
    },
    {
      id: "sold",
      actor_id: "33333333-3333-4333-8333-333333333333",
      status: "sold",
      created_at: "2026-09-01T10:00:00.000Z",
      sold_at: "2026-10-15T10:00:00.000Z",
    },
  ],
  inquiries: [
    {
      id: "inq",
      actor_id: "11111111-1111-4111-8111-111111111111",
      created_at: "2026-10-20T12:00:00.000Z",
      attribution_first: { utm_source: "tiktok", utm_medium: "social" },
    },
  ],
  offers: [],
  demands: [],
  payments: [
    {
      id: "cs_1",
      user_id: "22222222-2222-4222-8222-222222222222",
      listing_id: "paid",
      package_id: "urgent",
      amount_minor: 17900,
      paid_at: "2026-10-21T11:00:00.000Z",
      attribution_first: { utm_source: "google", utm_medium: "cpc" },
    },
  ],
});

const october = report.months.find((row) => row.key === "2026-10");
assert(october, "October bucket exists");
assert(october!.sellersAll === 2, "house seller is excluded, two real sellers remain");
assert(october!.sellersOrganic === 1, "paid medium is not an organic seller");
assert(october!.listings === 2, "house listing excluded from October listings");
assert(october!.abandonedListings === 1, "pending listing counts as abandoned checkout");
assert(october!.paidListings === 1, "paid listing counted");
assert(october!.revenueRon === 179, "revenue is major RON");
assert(october!.sold === 1, "sold_at lands in October");
assert(report.products[0]?.product === "urgent", "revenue grouped by package");
assert(
  report.autoSources.some((row) => row.source === "youtube" && row.listings === 1),
  "automatic source breakdown",
);
assert(
  report.reportedSources.some((row) => row.source === "youtube_quickexit"),
  "self-reported source breakdown",
);

const included = buildHqMetrics({
  now: new Date("2026-10-22T10:00:00.000Z"),
  excludeHouse: false,
  houseIds: [house],
  listings: [
    {
      id: "house",
      actor_id: house,
      status: "active",
      created_at: "2026-10-10T10:00:00.000Z",
    },
  ],
  inquiries: [],
  offers: [],
  demands: [],
  payments: [],
});
assert(
  included.months.find((row) => row.key === "2026-10")?.listings === 1,
  "toggle off keeps the founder listing",
);

const kit = buildSocialShareKit({ id: "listing-1", title: "Test", exit_price: 1000 });
assert(kit.utm.youtube.includes("utm_source=youtube"), "share kit tags YouTube");
assert(kit.utm.tiktok.includes("utm_source=tiktok"), "share kit tags TikTok");
assert(kit.youtubeCaption.includes(kit.utm.youtube), "YouTube caption uses the tagged URL");
assert(kit.tiktokCaption.includes(kit.utm.tiktok), "TikTok caption uses the tagged URL");

const middleware = readFileSync("middleware.ts", "utf8");
assert(middleware.includes('path.startsWith("/go/")'), "middleware lets /go bypass locale routing");
assert(middleware.indexOf('path.startsWith("/go/")') < middleware.indexOf("handleI18nRouting(request)"), "go bypass is before i18n");
assert(!middleware.includes("utm_source"), "middleware does not special-case UTM deletion");

const checkout = readFileSync("app/api/stripe/checkout/route.ts", "utf8");
assert(checkout.includes("client_reference_id: user.id"), "checkout sets client_reference_id");
assert(checkout.includes("resolveCheckoutAttribution"), "checkout copies attribution into metadata");

const webhook = readFileSync("app/api/stripe/webhook/route.ts", "utf8");
assert(webhook.includes("recordCheckoutPayment"), "webhook writes the payments row");

const ga = readFileSync("lib/ga4MeasurementProtocol.ts", "utf8");
assert(ga.includes("GA4_MEASUREMENT_PROTOCOL_API_SECRET"), "measurement protocol secret is documented");
assert(ga.includes('reason: "missing_secret"'), "missing secret is a no-op");

const migration = readFileSync(
  "supabase/migrations/20261022120000_attribution_payments_sold_at.sql",
  "utf8",
);
assert(migration.includes("CREATE TABLE IF NOT EXISTS public.payments"), "payments table migration");
assert(migration.includes("sold_at"), "sold_at migration");
assert(migration.includes("listings_set_sold_at"), "sold_at trigger");

const rls = readFileSync(
  "supabase/migrations/20261022120100_rls_qe_ops_founder_expiry_ext_rollback.sql",
  "utf8",
);
assert(rls.includes("qe_ops_founder_expiry_ext_20261120_rollback"), "rollback table named");
assert(rls.includes("ENABLE ROW LEVEL SECURITY"), "rollback table RLS");
assert(rls.toLowerCase().includes("drop table"), "note says the table may be dropped");

console.log("OK attribution");
