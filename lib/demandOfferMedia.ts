/**
 * Demand-offer media helpers — private bucket model + legacy public dual-read.
 * DB must store stable object paths (or legacy public URLs), never signed URLs.
 */

export const DEMAND_OFFERS_STORAGE_BUCKET = "demand-offers";
export const LEGACY_LISTINGS_BUCKET = "listings";
export const MAX_DEMAND_OFFER_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_DEMAND_OFFER_IMAGES = 10;
export const DEMAND_OFFER_SIGNED_URL_TTL_SECONDS = 600; // 10 minutes
export const DEMAND_OFFER_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp"]);

/** Stable DB ref prefix for private objects (not a signed URL). */
export const PRIVATE_REF_PREFIX = "demand-offers/";

export type DemandOfferImageFileError =
  | "unsupported_type"
  | "file_too_large"
  | "limit_reached";

export type DemandOfferMediaKind = "private_path" | "legacy_public_url" | "unknown";

export function demandOfferImageExtension(file: {
  name: string;
  type?: string;
}): string | null {
  const fromName = file.name.split(".").pop()?.toLowerCase().trim() ?? "";
  if (ALLOWED_EXT.has(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return null;
}

export function validateDemandOfferImageFile(
  file: { name: string; type?: string; size: number },
  currentCount: number,
): DemandOfferImageFileError | null {
  if (currentCount >= MAX_DEMAND_OFFER_IMAGES) return "limit_reached";
  const ext = demandOfferImageExtension(file);
  if (!ext) return "unsupported_type";
  if (file.type && !ALLOWED_MIME.has(file.type)) return "unsupported_type";
  if (file.size <= 0 || file.size > MAX_DEMAND_OFFER_IMAGE_BYTES) {
    return "file_too_large";
  }
  return null;
}

/**
 * Path convention (private bucket):
 *   {uploader_user_id}/{demand_id}/{uuid}.{ext}
 * Authorization must verify DB relationships — path alone is not trust.
 */
export function buildDemandOfferObjectPath(input: {
  uploaderUserId: string;
  demandId: string;
  ext: string;
  objectId?: string;
}): string {
  const uploader = String(input.uploaderUserId).trim();
  const demandId = String(input.demandId).trim();
  const ext = String(input.ext).trim().toLowerCase().replace(/^\./, "");
  if (!uploader || !demandId || !ext) {
    throw new Error("invalid_path_components");
  }
  if (uploader.includes("..") || demandId.includes("..") || ext.includes("..")) {
    throw new Error("path_traversal");
  }
  if (!/^[0-9a-f-]{36}$/i.test(uploader) || !/^[0-9a-f-]{36}$/i.test(demandId)) {
    throw new Error("invalid_uuid_path");
  }
  if (!ALLOWED_EXT.has(ext === "jpeg" ? "jpeg" : ext)) {
    throw new Error("unsupported_type");
  }
  const normalizedExt = ext === "jpeg" ? "jpg" : ext;
  const objectId =
    input.objectId?.trim() ||
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  return `${uploader}/${demandId}/${objectId}.${normalizedExt}`;
}

export function toPrivateDbRef(objectPath: string): string {
  const p = objectPath.replace(/^\/+/, "");
  if (p.startsWith(PRIVATE_REF_PREFIX)) return p;
  return `${PRIVATE_REF_PREFIX}${p}`;
}

export function objectPathFromPrivateDbRef(ref: string): string | null {
  const raw = String(ref ?? "").trim();
  if (!raw || raw.startsWith("http://") || raw.startsWith("https://")) return null;
  if (raw.startsWith(PRIVATE_REF_PREFIX)) {
    return raw.slice(PRIVATE_REF_PREFIX.length);
  }
  // Bare object path under demand-offers bucket
  if (/^[0-9a-f-]{36}\/[0-9a-f-]{36}\//i.test(raw)) return raw;
  return null;
}

/** Legacy listings public URL → object path inside listings bucket. */
export function legacyListingsObjectPathFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const marker = "/storage/v1/object/public/listings/";
    const idx = u.pathname.indexOf(marker);
    if (idx < 0) return null;
    const path = decodeURIComponent(u.pathname.slice(idx + marker.length));
    if (!path || path.includes("..")) return null;
    return path;
  } catch {
    return null;
  }
}

/**
 * Map legacy listings path `{user}/demand-offers/{demand}/{file}`
 * → private path `{user}/{demand}/{file}`.
 */
export function legacyListingsPathToPrivatePath(
  listingsObjectPath: string,
): string | null {
  const parts = listingsObjectPath.split("/").filter(Boolean);
  if (parts.length < 4) return null;
  if (parts[1] !== "demand-offers") return null;
  const [userId, , demandId, ...rest] = parts;
  if (!userId || !demandId || rest.length === 0) return null;
  if (userId.includes("..") || demandId.includes("..")) return null;
  return `${userId}/${demandId}/${rest.join("/")}`;
}

export function classifyDemandOfferMediaRef(ref: string): DemandOfferMediaKind {
  const raw = String(ref ?? "").trim();
  if (!raw) return "unknown";
  if (objectPathFromPrivateDbRef(raw)) return "private_path";
  if (legacyListingsObjectPathFromUrl(raw)) return "legacy_public_url";
  return "unknown";
}

/** Dual-read: legacy public URLs usable as-is; private refs need signed URL. */
export function isLegacyPublicDemandOfferMediaUrl(ref: string): boolean {
  return classifyDemandOfferMediaRef(ref) === "legacy_public_url";
}

export function isPrivateDemandOfferMediaRef(ref: string): boolean {
  return classifyDemandOfferMediaRef(ref) === "private_path";
}

export function parseUploaderAndDemandFromObjectPath(
  objectPath: string,
): { uploaderUserId: string; demandId: string } | null {
  const parts = objectPath.split("/").filter(Boolean);
  if (parts.length < 3) return null;
  const [uploaderUserId, demandId] = parts;
  if (!/^[0-9a-f-]{36}$/i.test(uploaderUserId)) return null;
  if (!/^[0-9a-f-]{36}$/i.test(demandId)) return null;
  return { uploaderUserId, demandId };
}
