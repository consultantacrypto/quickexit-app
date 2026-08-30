/**
 * Canonical listing image URLs and cover-fit policy.
 *
 * Supabase `/render/image/` with only `width` mangles progressive JPEGs
 * (SOF height stays at the original, producing extreme portrait bytes).
 * We never request that transform. Next/Image's default optimizer resizes
 * the original object while preserving aspect ratio.
 */

export const SUPABASE_OBJECT_PUBLIC = "/storage/v1/object/public/";
export const SUPABASE_RENDER_PUBLIC = "/storage/v1/render/image/public/";

/** Card / grid frame (4:3). */
export const LISTING_CARD_ASPECT = 4 / 3;

/**
 * Cover is allowed when source AR is within 25% of the container AR.
 * 4:3 cards → roughly 1.00–1.67. Extreme portrait/pano uses contain.
 */
export const COVER_ASPECT_RELATIVE_TOLERANCE = 0.25;

export const LISTING_MEDIA_NEUTRAL_BG = "#F5F1E8";

export function canonicalListingImageSrc(src: string): string {
  const raw = typeof src === "string" ? src.trim() : "";
  if (!raw) return raw;

  try {
    const isRender = raw.includes(SUPABASE_RENDER_PUBLIC);
    const isObject = raw.includes(SUPABASE_OBJECT_PUBLIC);
    if (!isRender && !isObject) return raw;

    const swapped = isRender
      ? raw.replace(SUPABASE_RENDER_PUBLIC, SUPABASE_OBJECT_PUBLIC)
      : raw;
    const url = new URL(swapped);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return raw;
  }
}

export function listingImageAspectRatio(width: number, height: number): number | null {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;
  return width / height;
}

export function shouldObjectCover(
  sourceAspect: number | null,
  containerAspect: number = LISTING_CARD_ASPECT,
  tolerance: number = COVER_ASPECT_RELATIVE_TOLERANCE,
): boolean {
  if (sourceAspect == null || !Number.isFinite(sourceAspect) || sourceAspect <= 0) {
    return false;
  }
  if (!Number.isFinite(containerAspect) || containerAspect <= 0) return false;
  return Math.abs(sourceAspect / containerAspect - 1) <= tolerance;
}

export function listingObjectFit(
  sourceAspect: number | null,
  containerAspect: number = LISTING_CARD_ASPECT,
): "cover" | "contain" {
  return shouldObjectCover(sourceAspect, containerAspect) ? "cover" : "contain";
}

export function reorderListingImagesCover(images: string[], coverIndex: number): string[] {
  if (!Array.isArray(images) || images.length === 0) return [];
  if (!Number.isInteger(coverIndex) || coverIndex < 0 || coverIndex >= images.length) {
    return [...images];
  }
  if (coverIndex === 0) return [...images];
  const next = [...images];
  const [picked] = next.splice(coverIndex, 1);
  next.unshift(picked);
  return next;
}
