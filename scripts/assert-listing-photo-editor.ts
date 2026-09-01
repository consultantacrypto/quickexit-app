import {
  canonicalListingImageSrc,
  reorderListingImagesCover,
} from "../lib/listingMedia";
import {
  MAX_LISTING_IMAGE_BYTES,
  MAX_LISTING_IMAGES,
  MIN_LISTING_IMAGES,
  buildListingImagesPatch,
  canRemoveListingImage,
  isAllowedListingImageUrl,
  listingImageMagicLooksValid,
  listingImageStoragePath,
  listingImagesPatchKeys,
  moveListingImage,
  removeListingImageAt,
  sanitizeListingImageUrls,
  validateListingImageFile,
} from "../lib/listingImageUpload";

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
  sanitizeListingImageUrls([renderUrl, objectUrl, objectUrl, "javascript:alert(1)", " "])
    .join(",") === objectUrl,
  "sanitize canonicalizes render, drops dupes and malformed",
);
assert(isAllowedListingImageUrl(objectUrl), "object URL allowed");
assert(!isAllowedListingImageUrl(renderUrl) || sanitizeListingImageUrls([renderUrl])[0] === objectUrl, "render is rewritten then allowed as object");
assert(sanitizeListingImageUrls([renderUrl])[0] === objectUrl, "saved URL is object not render");
assert(!isAllowedListingImageUrl("javascript:alert(1)"), "javascript URL rejected");

const ordered = ["a.jpg", "b.jpg", "c.jpg"];
assert(moveListingImage(ordered, 2, 0).join(",") === "c.jpg,a.jpg,b.jpg", "move to front");
assert(moveListingImage(ordered, 0, 2).join(",") === "b.jpg,c.jpg,a.jpg", "move to end");
assert(ordered.join(",") === "a.jpg,b.jpg,c.jpg", "move does not mutate");
assert(removeListingImageAt(ordered, 1).join(",") === "a.jpg,c.jpg", "remove index");
assert(reorderListingImagesCover(["a", "b", "c"], 2).join(",") === "c,a,b", "cover still images[0]");

assert(listingImageStoragePath("user-1", "png").startsWith("user-1/"), "upload path is owner prefix");
assert(listingImageStoragePath("user-1", "png").endsWith(".png"), "extension preserved");

const jpeg = new File([new Uint8Array(32)], "shot.jpg", { type: "image/jpeg" });
assert(validateListingImageFile(jpeg, 0) === null, "jpeg accepted");
const gif = new File([new Uint8Array(32)], "x.gif", { type: "image/gif" });
assert(validateListingImageFile(gif, 0) === "unsupported_type", "gif rejected");
const spoofed = new File([new Uint8Array(32)], "shot.jpg", { type: "image/gif" });
assert(validateListingImageFile(spoofed, 0) === "unsupported_type", "gif spoofed as jpg rejected");
const huge = new File([new Uint8Array(MAX_LISTING_IMAGE_BYTES + 1)], "big.jpg", {
  type: "image/jpeg",
});
assert(validateListingImageFile(huge, 0) === "file_too_large", "oversize rejected");
assert(validateListingImageFile(jpeg, MAX_LISTING_IMAGES) === "limit_reached", "count limit");

const webp = new File([new Uint8Array(32)], "w.webp", { type: "image/webp" });
assert(validateListingImageFile(webp, 0) === null, "webp accepted");
const png = new File([new Uint8Array(32)], "w.png", { type: "image/png" });
assert(validateListingImageFile(png, 0) === null, "png accepted");

assert(canonicalListingImageSrc(renderUrl) === objectUrl, "editor uses canonicalListingImageSrc");
assert(sanitizeListingImageUrls([objectUrl])[0] === objectUrl, "untouched object URL preserved exactly");

assert(canRemoveListingImage(["a"], 0) === false, "cannot remove last image");
assert(removeListingImageAt(["only"], 0).join(",") === "only", "last image stays");
assert(MIN_LISTING_IMAGES === 1, "cover required");

const emptyPatch = buildListingImagesPatch([]);
assert("error" in emptyPatch && emptyPatch.error === "empty", "empty patch rejected");
const patch = buildListingImagesPatch([objectUrl, objectUrl, renderUrl]);
assert(!("error" in patch), "valid patch");
if (!("error" in patch)) {
  assert(patch.images.length === 1 && patch.images[0] === objectUrl, "patch dedupes and canonicalizes");
  assert(listingImagesPatchKeys(patch).join(",") === "images", "photo save payload is images-only helper");
}

const jpegMagic = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
assert(listingImageMagicLooksValid(jpegMagic), "jpeg magic accepted");
assert(!listingImageMagicLooksValid(new Uint8Array([0x00, 0x01, 0x02, 0x03])), "non-image magic rejected");

console.log("OK listing-photo-editor");
