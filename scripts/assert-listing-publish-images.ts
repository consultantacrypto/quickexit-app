/**
 * Static + unit asserts for zero-image paid listing guard.
 * No network. No Production mutation.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  BLOCKED_ZERO_IMAGES_CODE,
  listingImagesReadyForCheckout,
  listingHasRenderableImages,
} from "../lib/listingPublishImages";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const objectUrl =
  "https://geywuzwbzecknokvnins.supabase.co/storage/v1/object/public/listings/user/cover.jpg";

const zeroSpecific = listingImagesReadyForCheckout("specific_asset", []);
assert(!zeroSpecific.ok && zeroSpecific.code === BLOCKED_ZERO_IMAGES_CODE, "specific empty blocked");

const oneSpecific = listingImagesReadyForCheckout("specific_asset", [objectUrl]);
assert(oneSpecific.ok && oneSpecific.images.length === 1, "specific one image allowed");

const multi = listingImagesReadyForCheckout("specific_asset", [objectUrl, objectUrl]);
assert(multi.ok && multi.images.length === 1, "dedupe still ok");

const catalogEmpty = listingImagesReadyForCheckout("catalog_offer", []);
assert(catalogEmpty.ok && catalogEmpty.kind === "catalog_offer", "catalog empty allowed");

assert(!listingHasRenderableImages([]), "no renderable");
assert(listingHasRenderableImages([objectUrl]), "has renderable");

const checkout = readFileSync(resolve("app/api/stripe/checkout/route.ts"), "utf8");
assert(checkout.includes("listingImagesReadyForCheckout"), "checkout uses image gate");
assert(checkout.includes("blocked_zero_images") || checkout.includes("BLOCKED_ZERO_IMAGES_CODE"), "checkout emits blocked code");
assert(checkout.includes('component: "listing_publish"'), "checkout logs listing_publish");
assert(checkout.includes('operation: "image_validation"'), "checkout logs image_validation");

const publish = readFileSync(resolve("app/[locale]/pune-anunt/PuneAnuntClient.tsx"), "utf8");
assert(publish.includes("checkoutErrors.imagesRequired"), "client shows imagesRequired");
assert(publish.includes("uploadListingImageFile"), "client uses shared upload helper");
assert(publish.includes("uploadFailedNamed"), "named upload failure UX");

const detail = readFileSync(resolve("app/[locale]/anunt/[id]/AnuntClient.tsx"), "utf8");
assert(!detail.includes("images.unsplash.com/photo-1512917774080"), "detail no unsplash house fallback");
assert(detail.includes("gallery.imagesUnavailable"), "neutral placeholder copy");

const webhook = readFileSync(resolve("app/api/stripe/webhook/route.ts"), "utf8");
assert(webhook.includes("activate_zero_images") || webhook.includes("listing.activate.zero_images"), "webhook warns on zero-image activate");
assert(!webhook.includes("return fail(\"blocked_zero_images\")"), "webhook does not strand paid activation");

console.log("OK listing-publish-images");
