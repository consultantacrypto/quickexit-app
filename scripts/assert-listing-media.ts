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
assert(shouldObjectCover(1.781, LISTING_CARD_ASPECT) === false, "wide aerial uses contain");
assert(shouldObjectCover(null) === false, "unknown AR defaults to contain");
assert(listingObjectFit(0.375) === "contain", "object-fit for extreme portrait");
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

console.log("OK listing-media");
