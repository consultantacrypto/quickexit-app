/**
 * Anonymous listing UTM visits. CI-safe: no network, no database.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mergeOfferUtm } from "../lib/offerAttribution";
import {
  LISTING_TRAFFIC_PRODUCTION_SUPABASE_HOST,
  hasListingUtm,
  listingTrafficWriteAllowed,
  parseListingTrafficBody,
  recordListingTrafficEvent,
  sanitizeListingReferrer,
  sanitizeListingUtmValue,
  takeListingTrafficRateLimit,
  toListingTrafficInsert,
  type ListingTrafficInsert,
  type ListingTrafficStore,
} from "../lib/listingTraffic";
import { handleListingTrafficPost } from "../lib/listingTrafficHandle";
import { reportListingPageview, reportListingTrafficLead } from "../lib/listingTrafficClient";
import {
  VISIT_SESSION_STORAGE_KEY,
  VISIT_UTM_STORAGE_KEY,
  readVisitUtmFromStore,
  rememberVisitUtm,
} from "../lib/listingTrafficSession";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
}

const SESSION = "11111111-1111-4111-8111-111111111111";
const SHORTS = {
  event_type: "pageview",
  session_id: SESSION,
  path: "/ro/anunt/voyah-dreamer",
  utm_source: "youtube",
  utm_medium: "social",
  utm_campaign: "shorts",
  utm_content: "voyah_dreamer_price",
  referrer: "https://www.youtube.com/watch?v=abc&email=person@example.com",
  email: "person@example.com",
  phone: "+40722111222",
  ip: "203.0.113.10",
};

const parsed = parseListingTrafficBody(SHORTS);
assert(parsed.ok, "shorts landing parses");
if (!parsed.ok) fail("unreachable");
assert(parsed.event.listingId === "voyah-dreamer", "listing slug comes from the path");
assert(parsed.event.utm.utm_source === "youtube", "utm_source kept");
assert(parsed.event.utm.utm_content === "voyah_dreamer_price", "utm_content kept");
assert(
  parsed.event.referrer === "https://www.youtube.com/watch",
  "referrer drops query and hash",
);
const insert = toListingTrafficInsert(parsed.event);
const insertKeys = Object.keys(insert).sort();
assert(!insertKeys.includes("email"), "insert has no email");
assert(!insertKeys.includes("phone"), "insert has no phone");
assert(!insertKeys.includes("ip"), "insert has no ip");
assert(!JSON.stringify(insert).includes("person@example.com"), "referrer query email is dropped");
assert(!JSON.stringify(insert).includes("203.0.113.10"), "ip is not copied into the row");

assert(
  !parseListingTrafficBody({
    event_type: "pageview",
    session_id: SESSION,
    path: "/ro/anunt/voyah-dreamer",
    utm_source: "not an email @x",
  }).ok,
  "utm with @ is rejected",
);
assert(sanitizeListingUtmValue("gclid_abc") === undefined, "click id values are rejected");
assert(
  !parseListingTrafficBody({
    ...SHORTS,
    utm_source: undefined,
    utm_medium: undefined,
    utm_campaign: undefined,
    utm_content: undefined,
    utm_term: undefined,
  }).ok,
  "pageview without utm is rejected",
);
assert(!parseListingTrafficBody({ ...SHORTS, path: "/ro/pune-anunt" }).ok, "non-listing path is rejected");
const pathWithQuery = parseListingTrafficBody({
  ...SHORTS,
  path: "/ro/anunt/voyah-dreamer?email=a@b.com",
});
assert(
  pathWithQuery.ok && pathWithQuery.event.path === "/ro/anunt/voyah-dreamer",
  "query string is stripped from the path",
);
assert(
  pathWithQuery.ok && !JSON.stringify(pathWithQuery.event).includes("a@b.com"),
  "path query email is not stored",
);
assert(sanitizeListingReferrer("javascript:alert(1)") === null, "non-http referrer dropped");
assert(
  sanitizeListingReferrer("https://user:secret@example.com/path") === null,
  "referrer credentials are dropped",
);

const oversized = parseListingTrafficBody({
  ...SHORTS,
  utm_campaign: `${"z".repeat(200)}`,
});
assert(oversized.ok && oversized.event.utm.utm_campaign?.length === 120, "utm campaign is length-capped");

const lead = parseListingTrafficBody({
  event_type: "lead",
  conversion: "offer",
  session_id: SESSION,
  path: "/en/anunt/voyah-dreamer",
  utm_source: "tiktok",
  utm_content: "esc_details",
});
assert(lead.ok && lead.event.conversion === "offer", "lead conversion parses");
assert(!parseListingTrafficBody({ ...SHORTS, event_type: "lead" }).ok, "lead requires a conversion");
assert(!parseListingTrafficBody({ ...SHORTS, conversion: "offer" }).ok, "pageview cannot carry a conversion");

const productionUrl = `https://${LISTING_TRAFFIC_PRODUCTION_SUPABASE_HOST}`;
assert(
  listingTrafficWriteAllowed({ vercelEnv: "production", supabaseUrl: productionUrl }),
  "production runtime may write the production project",
);
assert(
  !listingTrafficWriteAllowed({ vercelEnv: "preview", supabaseUrl: productionUrl }),
  "preview must not write the production project",
);
assert(
  !listingTrafficWriteAllowed({ vercelEnv: undefined, supabaseUrl: productionUrl }),
  "local/unknown runtime must not write the production project",
);
assert(
  listingTrafficWriteAllowed({
    vercelEnv: "preview",
    supabaseUrl: "https://nlnzlswjjplofpkhoxtr.supabase.co",
  }),
  "preview may write a non-production supabase host",
);
assert(
  !listingTrafficWriteAllowed({ vercelEnv: "preview", supabaseUrl: "https://example.com" }),
  "unrelated hosts are not writable",
);

function memoryStore(rows: ListingTrafficInsert[]): ListingTrafficStore {
  return {
    async findRecent(filter) {
      const since = Date.parse(filter.sinceIso);
      const found = rows.some((row) => {
        return (
          row.session_id === filter.sessionId &&
          row.path === filter.path &&
          row.event_type === filter.eventType &&
          row.conversion === filter.conversion &&
          since <= Date.now()
        );
      });
      return { found, error: false };
    },
    async insert(row) {
      rows.push(row);
      return { error: false };
    },
  };
}

async function main() {
const rows: ListingTrafficInsert[] = [];
const store = memoryStore(rows);
const first = await recordListingTrafficEvent(store, parsed.event, new Date());
const second = await recordListingTrafficEvent(store, parsed.event, new Date());
assert(first === "inserted", "first pageview inserts");
assert(second === "duplicate", "same session and path inside the window does not insert again");
assert(rows.length === 1, "duplicate pageview is not stored");
if (!lead.ok) fail("lead parse");
const leadResult = await recordListingTrafficEvent(store, lead.event, new Date());
assert(leadResult === "inserted", "a lead on the same session is a separate event");
assert(rows.length === 2, "pageview and lead both remain");

const limited = new Map<string, { count: number; resetAt: number }>();
let allowed = 0;
for (let i = 0; i < 40; i += 1) {
  if (takeListingTrafficRateLimit(limited, "hashed-ip", 1_000)) allowed += 1;
}
assert(allowed === 30, "rate limit stops a burst without storing the raw ip");

let opened = false;
const preview = await handleListingTrafficPost({
  sameOrigin: true,
  rateAllowed: true,
  bodyText: JSON.stringify(SHORTS),
  vercelEnv: "preview",
  supabaseUrl: productionUrl,
  openStore: () => {
    opened = true;
    return store;
  },
});
assert(preview.status === 204 && preview.outcome === "ignored", "preview handler does not store");
assert(!opened, "preview handler does not open the supabase client");

const broken: ListingTrafficStore = {
  async findRecent() {
    return { found: false, error: true };
  },
  async insert() {
    throw new Error("db down");
  },
};
const failed = await handleListingTrafficPost({
  sameOrigin: true,
  rateAllowed: true,
  bodyText: JSON.stringify({ ...SHORTS, session_id: "22222222-2222-4222-8222-222222222222" }),
  vercelEnv: "production",
  supabaseUrl: productionUrl,
  openStore: () => broken,
});
assert(failed.status === 204 && failed.outcome === "failed", "insert failure stays a 204 outcome");

const sessionStorage = memoryStorage();
const fetches: { url: string; body: Record<string, unknown> }[] = [];
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    sessionStorage,
    location: {
      pathname: "/ro/anunt/voyah-dreamer",
      search: "?utm_source=youtube&utm_medium=social&utm_campaign=shorts&utm_content=voyah_dreamer_price&email=person@example.com",
    },
  },
});
Object.defineProperty(globalThis, "document", {
  configurable: true,
  value: { referrer: "https://www.youtube.com/shorts/abc?email=person@example.com" },
});
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  fetches.push({
    url: String(input),
    body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
  });
  return new Response(null, { status: 204 });
}) as typeof fetch;

reportListingPageview();
reportListingPageview();
assert(fetches.length === 1, "client sends one pageview per session and path");
assert(fetches[0]?.url === "/api/traffic/listing-visit", "client posts to the traffic route");
assert(!("email" in (fetches[0]?.body ?? {})), "client body has no email field");
assert(fetches[0]?.body.utm_content === "voyah_dreamer_price", "client sends utm_content");
assert(
  fetches[0]?.body.referrer === "https://www.youtube.com/shorts/abc?email=person@example.com",
  "client forwards the raw referrer for the server to strip",
);
const serverView = parseListingTrafficBody(fetches[0]?.body);
assert(
  serverView.ok && serverView.event.referrer === "https://www.youtube.com/shorts/abc",
  "server strips the referrer query before storage",
);
const storedUtm = readVisitUtmFromStore(sessionStorage);
assert(storedUtm.utm_source === "youtube", "session stores utm_source");
assert(storedUtm.utm_content === "voyah_dreamer_price", "session stores utm_content");
assert(sessionStorage.getItem(VISIT_SESSION_STORAGE_KEY), "session id is stored");
rememberVisitUtm(sessionStorage, { utm_source: "instagram", utm_medium: "social" });
assert(readVisitUtmFromStore(sessionStorage).utm_source === "youtube", "first-touch utm_source stays");

(globalThis.window as { location: { pathname: string; search: string } }).location = {
  pathname: "/ro/anunt/voyah-dreamer",
  search: "",
};
reportListingTrafficLead("offer");
assert(fetches.length === 2, "later offer lead is sent");
assert(fetches[1]?.body.event_type === "lead", "lead event type");
assert(fetches[1]?.body.conversion === "offer", "offer conversion");
assert(fetches[1]?.body.utm_source === "youtube", "lead carries the session utm");
assert(fetches[1]?.body.session_id === fetches[0]?.body.session_id, "lead reuses the session id");
assert(!JSON.stringify(fetches[1]?.body).includes("@"), "lead payload has no email");

const merged = mergeOfferUtm(
  mergeOfferUtm({}, storedUtm),
  { utm_source: "google", utm_term: "old" },
);
assert(merged.utm_source === "youtube", "session utm wins over older consent storage");
assert(merged.utm_term === "old", "consent storage fills only missing keys");
assert(hasListingUtm(storedUtm), "stored visit utm is usable");

(globalThis.window as { location: { search: string } }).location.search = "";
fetches.length = 0;
sessionStorage.clear();
reportListingPageview();
assert(fetches.length === 0, "listing without utm does not send");

globalThis.fetch = (async () => {
  throw new Error("offline");
}) as typeof fetch;
(globalThis.window as { location: { pathname: string; search: string } }).location = {
  pathname: "/ro/anunt/other-listing",
  search: "?utm_source=instagram",
};
let threw = false;
try {
  reportListingPageview();
} catch {
  threw = true;
}
assert(!threw, "fetch failure does not throw");

const page = readFileSync(resolve("app/[locale]/anunt/[id]/page.tsx"), "utf8");
const beacon = readFileSync(resolve("app/components/ListingTrafficBeacon.tsx"), "utf8");
const route = readFileSync(resolve("app/api/traffic/listing-visit/route.ts"), "utf8");
const offer = readFileSync(resolve("lib/offerAttribution.ts"), "utf8");
const layout = readFileSync(resolve("app/[locale]/layout.tsx"), "utf8");
const migration = readFileSync(
  resolve("supabase/migrations/20261111170000_listing_traffic_events.sql"),
  "utf8",
);
assert(page.includes("<ListingTrafficBeacon />"), "listing page mounts the beacon");
assert(beacon.includes("reportListingPageview()"), "beacon reports a pageview");
assert(beacon.includes("return null"), "beacon renders nothing");
assert(route.includes("handleListingTrafficPost"), "route uses the guarded handler");
assert(route.includes("status: 204"), "route answers 204");
assert(!route.includes("lead_events"), "route does not write lead_events");
assert(offer.includes("readVisitSessionUtm()"), "offer attribution reads session utm");
assert(layout.includes("<VercelWebAnalytics />"), "vercel web analytics stays mounted");
assert(/ENABLE ROW LEVEL SECURITY/i.test(migration), "migration enables rls");
assert(/FORCE ROW LEVEL SECURITY/i.test(migration), "migration forces rls");
assert(/REVOKE ALL ON TABLE public\.listing_traffic_events FROM anon/i.test(migration), "anon revoked");
assert(/REVOKE ALL ON TABLE public\.listing_traffic_events FROM authenticated/i.test(migration), "authenticated revoked");
assert(/GRANT SELECT, INSERT ON TABLE public\.listing_traffic_events TO service_role/i.test(migration), "service role insert");
assert(!/CREATE POLICY/i.test(migration), "no public policy");
assert(!/GRANT [^;]* TO anon/i.test(migration), "no anon grant");
assert(!/lead_events/i.test(migration), "migration does not alter lead_events");
assert(migration.includes(VISIT_UTM_STORAGE_KEY) === false, "migration has no client storage key");

console.log("OK listing-traffic");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
