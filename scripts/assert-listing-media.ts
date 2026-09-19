import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  LISTING_CARD_ASPECT,
  canonicalListingImageSrc,
  listingObjectFit,
  reorderListingImagesCover,
  shouldObjectCover,
} from "../lib/listingMedia";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const objectUrl =
  "https://geywuzwbzecknokvnins.supabase.co/storage/v1/object/public/listings/user/280m6gxaf0h.jpg";
const renderUrl = `${objectUrl.replace("/object/public/", "/render/image/public/")}?width=640&quality=75`;

assert(
  canonicalListingImageSrc(renderUrl) === objectUrl,
  "render URL must canonicalize to object URL without width/quality",
);
assert(
  canonicalListingImageSrc(`${objectUrl}?width=828&quality=75`) === objectUrl,
  "object URL query params must be stripped",
);
assert(
  canonicalListingImageSrc("https://images.unsplash.com/photo-x") ===
    "https://images.unsplash.com/photo-x",
  "non-supabase URLs pass through",
);

assert(shouldObjectCover(1.5, LISTING_CARD_ASPECT) === true, "3:2 into 4:3 uses cover");
assert(shouldObjectCover(1.333, LISTING_CARD_ASPECT) === true, "native 4:3 uses cover");
assert(shouldObjectCover(0.375, LISTING_CARD_ASPECT) === false, "broken portrait transform uses contain");
assert(shouldObjectCover(0.707, LISTING_CARD_ASPECT) === false, "cadastral portrait uses contain");
assert(shouldObjectCover(16 / 9, LISTING_CARD_ASPECT) === false, "16:9 into 4:3 uses contain");
assert(shouldObjectCover(1.781, LISTING_CARD_ASPECT) === false, "wide aerial uses contain");
assert(shouldObjectCover(null) === false, "unknown AR defaults to contain");
assert(listingObjectFit(0.375) === "contain", "object-fit for extreme portrait");
assert(listingObjectFit(3 / 4) === "contain", "object-fit for portrait 3:4");
assert(listingObjectFit(16 / 9) === "contain", "object-fit for 16:9 without forceCover");
assert(listingObjectFit(4 / 3) === "cover", "object-fit for native 4:3");
assert(listingObjectFit(1.5) === "cover", "object-fit for landscape 3:2");

const images = ["a.jpg", "b.jpg", "c.jpg"];
assert(
  reorderListingImagesCover(images, 2).join(",") === "c.jpg,a.jpg,b.jpg",
  "cover reorder moves index to 0",
);
assert(
  reorderListingImagesCover(images, 0).join(",") === "a.jpg,b.jpg,c.jpg",
  "cover 0 is a copy",
);
assert(
  images.join(",") === "a.jpg,b.jpg,c.jpg",
  "reorder does not mutate input",
);
assert(
  reorderListingImagesCover(images, 9).join(",") === "a.jpg,b.jpg,c.jpg",
  "invalid index is a no-op copy",
);

const adCard = readFileSync(resolve("app/components/AdCard.tsx"), "utf8");
const listingMedia = readFileSync(resolve("app/components/ListingMedia.tsx"), "utf8");
const anuntClient = readFileSync(resolve("app/[locale]/anunt/[id]/AnuntClient.tsx"), "utf8");
const photoEditor = readFileSync(resolve("app/components/ListingPhotoEditor.tsx"), "utf8");

assert(adCard.includes("aspect-[4/3]"), "AdCard frame stays 4:3");
assert(/<ListingMedia[\s\S]*?forceCover/.test(adCard), "AdCard requests forceCover");
assert(
  listingMedia.includes("forceCover = false"),
  "ListingMedia default forceCover is false",
);
assert(
  listingMedia.includes('useState<"cover" | "contain">(forceCover ? "cover" : "contain")'),
  "forceCover paints cover on first render",
);
assert(
  listingMedia.includes("if (forceCover) return;"),
  "natural AR measurement cannot override forceCover",
);

const listingMediaCallSites = [
  ["AdCard", adCard],
  ["AnuntClient", anuntClient],
  ["ListingPhotoEditor", photoEditor],
] as const;

for (const [name, source] of listingMediaCallSites) {
  const matches = source.match(/<ListingMedia\b[\s\S]*?\/>/g) ?? [];
  for (const call of matches) {
    const hasForce = /\bforceCover\b/.test(call);
    if (name === "AdCard") {
      assert(hasForce, "every AdCard ListingMedia uses forceCover");
    } else {
      assert(!hasForce, `${name} ListingMedia must not set forceCover`);
    }
  }
}

assert(
  /<Image[\s\S]*?className="object-contain"/.test(anuntClient),
  "listing lightbox stays object-contain",
);
assert(!photoEditor.includes("forceCover"), "ListingPhotoEditor does not pass forceCover");

console.log("OK listing-media");
