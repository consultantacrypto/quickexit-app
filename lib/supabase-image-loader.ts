import type { ImageLoaderProps } from "next/image";
import { canonicalListingImageSrc } from "@/lib/listingMedia";

/**
 * Pass-through loader. Do not map object URLs onto `/render/image/` —
 * that transform returns progressive JPEGs with an unscaled SOF height.
 * Next/Image's default optimizer should be preferred (omit this loader).
 * Kept so existing `loader={supabaseImageLoader}` call sites still emit
 * undistorted originals if not yet migrated.
 */
export default function supabaseImageLoader({ src }: ImageLoaderProps): string {
  return canonicalListingImageSrc(src) || src;
}
