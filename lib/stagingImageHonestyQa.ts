/**
 * Staging-only Image Honesty QA helpers.
 * Hard-locks to Staging Supabase host + non-Production Vercel context.
 * Does not create Production-active listings or touch Stripe.
 */
import { deflateSync } from "node:zlib";

export const STAGING_SUPABASE_HOST = "nlnzlswjjplofpkhoxtr.supabase.co";
export const PRODUCTION_SUPABASE_HOST = "geywuzwbzecknokvnins.supabase.co";

export const IMAGE_HONESTY_QA_TITLE_PREFIX = "[STAGING_TEST] IMAGE_HONESTY_QA";
export const IMAGE_HONESTY_QA_MARKER = "image_honesty_pra_v1";

export type StagingImageHonestyPlaneOk = {
  ok: true;
  supabaseUrl: string;
  hostname: string;
  vercelEnv: string;
};

export type StagingImageHonestyPlaneFail = {
  ok: false;
  error: string;
};

export type StagingImageHonestyPlane =
  | StagingImageHonestyPlaneOk
  | StagingImageHonestyPlaneFail;

/** Fail-closed Staging plane for Image Honesty QA mutations. */
export function assertStagingImageHonestyPlane(
  env: NodeJS.ProcessEnv = process.env,
): StagingImageHonestyPlane {
  const vercelEnv = String(env.VERCEL_ENV ?? "")
    .trim()
    .toLowerCase();
  if (vercelEnv === "production") {
    return { ok: false, error: "refused_vercel_production" };
  }
  // Require an explicit non-Production Vercel classification (or local development).
  if (vercelEnv !== "preview" && vercelEnv !== "development" && env.NODE_ENV !== "development") {
    return { ok: false, error: "refused_unknown_deploy_context" };
  }

  const rawUrl = String(env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  if (!rawUrl) {
    return { ok: false, error: "missing_supabase_url" };
  }
  if (rawUrl.toLowerCase().includes(PRODUCTION_SUPABASE_HOST)) {
    return { ok: false, error: "refused_production_supabase_host" };
  }

  let hostname = "";
  try {
    hostname = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return { ok: false, error: "invalid_supabase_url" };
  }

  if (hostname !== STAGING_SUPABASE_HOST) {
    return { ok: false, error: "refused_non_staging_supabase_host" };
  }

  return {
    ok: true,
    supabaseUrl: rawUrl.replace(/\/+$/, ""),
    hostname,
    vercelEnv: vercelEnv || "development",
  };
}

export function buildImageHonestyQaTitle(suffix?: string): string {
  const tag = suffix?.trim() || new Date().toISOString().slice(0, 19);
  return `${IMAGE_HONESTY_QA_TITLE_PREFIX} ${tag}`;
}

function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]!;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return ~c >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/** Tiny solid-color PNG for Staging Storage QA (no external deps). */
export function solidPngBytes(
  width: number,
  height: number,
  rgb: [number, number, number],
): Buffer {
  const [r, g, b] = rgb;
  const stride = 1 + width * 3;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const row = y * stride;
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const i = row + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

export const IMAGE_HONESTY_QA_PNG_COLORS: Array<[number, number, number]> = [
  [255, 209, 0],
  [20, 20, 20],
];
