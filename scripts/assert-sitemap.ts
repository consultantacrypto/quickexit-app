import {
  buildListingSitemapEntries,
  buildStaticSitemapEntries,
  isActivePublicListingRow,
  isPublicListingSitemapId,
  mergeSitemapEntries,
  sitemapLastModified,
} from "../lib/sitemapEntries";
import { PRODUCTION_SITE_URL } from "../lib/siteUrl";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const now = new Date("2026-08-30T10:00:00.000Z");
const goodId = "50e8decd-635a-46f7-908e-2ac1fddf8ac6";

assert(isPublicListingSitemapId(goodId), "uuid accepted");
assert(!isPublicListingSitemapId(null), "null id rejected");
assert(!isPublicListingSitemapId(""), "empty id rejected");
assert(!isPublicListingSitemapId("draft"), "non-uuid rejected");

assert(
  !isActivePublicListingRow({
    id: goodId,
    status: "draft",
    is_seed: false,
  }),
  "draft excluded",
);
assert(
  !isActivePublicListingRow({
    id: goodId,
    status: "active",
    is_seed: true,
  }),
  "seed excluded",
);
assert(
  isActivePublicListingRow({
    id: goodId,
    status: "active",
    is_seed: false,
  }),
  "active public included",
);

const entries = buildListingSitemapEntries(
  [
    null,
    { id: null, status: "active", is_seed: false },
    { id: goodId, status: "active", is_seed: false, created_at: "not-a-date" },
    { id: goodId, status: "inactive", is_seed: false },
    { id: "x", status: "active", is_seed: false },
  ],
  PRODUCTION_SITE_URL,
  now,
);

assert(entries.length === 1, "malformed rows skipped, one valid remains");
assert(
  entries[0].url === `${PRODUCTION_SITE_URL}/ro/anunt/${goodId}`,
  "canonical listing url",
);
assert(
  sitemapLastModified("not-a-date", now).getTime() === now.getTime(),
  "invalid date falls back",
);

const staticEntries = buildStaticSitemapEntries(PRODUCTION_SITE_URL, now);
assert(
  staticEntries.some((e) => e.url === `${PRODUCTION_SITE_URL}/ro`),
  "ro home present",
);
assert(
  staticEntries.some((e) => e.url === `${PRODUCTION_SITE_URL}/en`),
  "en home present",
);
assert(
  staticEntries.every((e) => e.url.startsWith(PRODUCTION_SITE_URL)),
  "static urls are production canonical",
);

const merged = mergeSitemapEntries(staticEntries, entries, [
  { url: "https://evil.example/leak", lastModified: now },
]);
assert(
  merged.every((e) => e.url.startsWith(PRODUCTION_SITE_URL) || e.url.includes("localhost")),
  "non-canonical urls dropped",
);
assert(merged.some((e) => e.url.includes(goodId)), "listing kept after merge");

console.log("OK sitemap");
