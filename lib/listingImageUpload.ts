/**
 * Shared listing image upload + URL sanitization.
 * Upload path matches PuneAnuntClient: bucket `listings`, `${userId}/${random}.${ext}`.
 * Does not delete Storage objects.
 */
import { canonicalListingImageSrc, SUPABASE_RENDER_PUBLIC } from "@/lib/listingMedia";

export const LISTINGS_STORAGE_BUCKET = "listings";
export const MIN_LISTING_IMAGES = 1;
export const MAX_LISTING_IMAGES = 20;
export const MAX_LISTING_IMAGE_BYTES = 8 * 1024 * 1024;
export const LISTING_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
export const LISTING_IMAGES_PATCH_KEYS = ["images"] as const;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp"]);

export type ListingImageFileError =
  | "unsupported_type"
  | "file_too_large"
  | "limit_reached";

export function listingImageExtension(file: File): string | null {
  const fromName = file.name.split(".").pop()?.toLowerCase().trim() ?? "";
  if (ALLOWED_EXT.has(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return null;
}

export function validateListingImageFile(
  file: File,
  currentCount: number,
): ListingImageFileError | null {
  if (currentCount >= MAX_LISTING_IMAGES) return "limit_reached";
  const ext = listingImageExtension(file);
  if (!ext) return "unsupported_type";
  if (file.type && !ALLOWED_MIME.has(file.type)) return "unsupported_type";
  if (file.size <= 0 || file.size > MAX_LISTING_IMAGE_BYTES) return "file_too_large";
  return null;
}

export function isAllowedListingImageUrl(raw: string): boolean {
  const canonical = canonicalListingImageSrc(raw);
  if (!canonical) return false;
  if (canonical.includes(SUPABASE_RENDER_PUBLIC)) return false;
  try {
    const url = new URL(canonical);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    if (url.username || url.password) return false;
    return true;
  } catch {
    return false;
  }
}

export function sanitizeListingImageUrls(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of input) {
    if (typeof item !== "string") continue;
    const canonical = canonicalListingImageSrc(item.trim());
    if (!isAllowedListingImageUrl(canonical)) continue;
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    out.push(canonical);
    if (out.length >= MAX_LISTING_IMAGES) break;
  }
  return out;
}

export function moveListingImage(images: string[], from: number, to: number): string[] {
  if (!Array.isArray(images) || images.length === 0) return [];
  if (!Number.isInteger(from) || !Number.isInteger(to)) return [...images];
  if (from < 0 || to < 0 || from >= images.length || to >= images.length) {
    return [...images];
  }
  if (from === to) return [...images];
  const next = [...images];
  const [picked] = next.splice(from, 1);
  next.splice(to, 0, picked);
  return next;
}

export function listingImageMagicLooksValid(bytes: Uint8Array): boolean {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return true;
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return true;
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return true;
  }
  return false;
}

export function canRemoveListingImage(images: string[], index: number): boolean {
  if (!Array.isArray(images) || images.length <= MIN_LISTING_IMAGES) return false;
  return Number.isInteger(index) && index >= 0 && index < images.length;
}

export function removeListingImageAt(images: string[], index: number): string[] {
  if (!canRemoveListingImage(images, index)) {
    return Array.isArray(images) ? [...images] : [];
  }
  return images.filter((_, i) => i !== index);
}

export type ListingImagesPatch = { images: string[] };

export function buildListingImagesPatch(
  input: unknown,
): ListingImagesPatch | { error: "empty" } {
  const images = sanitizeListingImageUrls(input);
  if (images.length < MIN_LISTING_IMAGES) return { error: "empty" };
  return { images };
}

export function listingImagesPatchKeys(patch: ListingImagesPatch): string[] {
  return Object.keys(patch);
}

export function listingImageStoragePath(userId: string, ext: string): string {
  const safeExt = ALLOWED_EXT.has(ext) ? (ext === "jpeg" ? "jpg" : ext) : "jpg";
  const fileName = `${Math.random().toString(36).substring(2, 15)}.${safeExt}`;
  return `${userId}/${fileName}`;
}

export type ListingStorageClient = {
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        file: File,
      ) => Promise<{ error: { message?: string } | null }>;
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
    };
  };
};

export async function uploadListingImageFile(
  supabase: ListingStorageClient,
  userId: string,
  file: File,
): Promise<{ ok: true; url: string } | { ok: false; error: ListingImageFileError | "upload_failed" }> {
  const ext = listingImageExtension(file);
  if (!ext) return { ok: false, error: "unsupported_type" };
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!listingImageMagicLooksValid(head)) return { ok: false, error: "unsupported_type" };
  const path = listingImageStoragePath(userId, ext);
  const { error } = await supabase.storage.from(LISTINGS_STORAGE_BUCKET).upload(path, file);
  if (error) return { ok: false, error: "upload_failed" };
  const { data } = supabase.storage.from(LISTINGS_STORAGE_BUCKET).getPublicUrl(path);
  const url = canonicalListingImageSrc(data.publicUrl);
  if (!isAllowedListingImageUrl(url)) return { ok: false, error: "upload_failed" };
  return { ok: true, url };
}
