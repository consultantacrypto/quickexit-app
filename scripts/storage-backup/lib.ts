/**
 * Shared helpers for Phase 3C Storage backup tooling.
 * Production Storage is READ-ONLY. Never delete/overwrite Production objects.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";

export const PRODUCTION_REF = "geywuzwbzecknokvnins";
export const STAGING_REF = "nlnzlswjjplofpkhoxtr";
export const SOURCE_BUCKET = "listings";

export type StorageObjectMeta = {
  name: string;
  id: string | null;
  bucket_id: string;
  owner: string | null;
  created_at: string | null;
  updated_at: string | null;
  last_accessed_at: string | null;
  metadata: Record<string, unknown> | null;
  path_tokens: string[] | null;
  version: string | null;
};

export function fail(msg: string): never {
  console.error(`FAIL ${msg}`);
  process.exit(1);
}

export function loadEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 1) continue;
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[line.slice(0, i).trim()] = v;
  }
  return out;
}

export function loadStorageBackupEnv(): Record<string, string> {
  // Dedicated secrets file preferred; never commit.
  if (existsSync(resolve(".env.storage-backup.local"))) {
    loadDotenv({ path: resolve(".env.storage-backup.local"), override: true });
  }
  if (existsSync(resolve(".env.local"))) {
    loadDotenv({ path: resolve(".env.local"), override: false });
  }
  const env: Record<string, string> = {
    ...loadEnvFile(resolve(".env.local")),
    ...loadEnvFile(resolve(".env.storage-backup.local")),
    ...Object.fromEntries(
      Object.entries(process.env).filter(([, v]) => typeof v === "string") as [
        string,
        string,
      ][],
    ),
  };
  // Synthesize R2 endpoint from account id when endpoint blank
  if (
    !env.QE_STORAGE_BACKUP_ENDPOINT &&
    env.QE_STORAGE_BACKUP_ACCOUNT_ID
  ) {
    env.QE_STORAGE_BACKUP_ENDPOINT = `https://${env.QE_STORAGE_BACKUP_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  }
  if (!env.QE_STORAGE_BACKUP_BUCKET) {
    env.QE_STORAGE_BACKUP_BUCKET = "quickexit-storage-backup";
  }
  return env;
}

export function urlRef(url: string): string | null {
  const m = url.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  return m?.[1] ?? null;
}

export function assertProdReadOnlySource(url: string) {
  const ref = urlRef(url);
  if (ref !== PRODUCTION_REF) {
    fail(`source URL must be Production ref ${PRODUCTION_REF}, got ${ref}`);
  }
}

export function pathHash(path: string): string {
  return createHash("sha256").update(path).digest("hex").slice(0, 16);
}

export function prefixOf(path: string): string {
  const i = path.indexOf("/");
  return i === -1 ? "(root)" : path.slice(0, Math.min(i, 8)) + "…";
}

export function extOf(path: string): string {
  const base = path.split("/").pop() || path;
  const i = base.lastIndexOf(".");
  return i >= 0 ? base.slice(i + 1).toLowerCase() : "(none)";
}

export function mimeFamily(mime: string | null | undefined): string {
  if (!mime) return "unknown";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("application/pdf")) return "pdf";
  if (mime.startsWith("text/")) return "text";
  return mime.split(";")[0] || "other";
}

export function createProdReadClient(env: Record<string, string>): {
  url: string;
  client: SupabaseClient;
} {
  const url =
    env.QE_STORAGE_SOURCE_URL ||
    (env.NEXT_PUBLIC_SUPABASE_URL?.includes(PRODUCTION_REF)
      ? env.NEXT_PUBLIC_SUPABASE_URL
      : `https://${PRODUCTION_REF}.supabase.co`);
  assertProdReadOnlySource(url);
  const key =
    env.QE_STORAGE_SOURCE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) fail("missing Production service role (QE_STORAGE_SOURCE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY)");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { url, client };
}

export function hasBackupDestination(env: Record<string, string>): boolean {
  return Boolean(
    env.QE_STORAGE_BACKUP_ENDPOINT &&
      env.QE_STORAGE_BACKUP_ACCESS_KEY_ID &&
      env.QE_STORAGE_BACKUP_SECRET_ACCESS_KEY &&
      env.QE_STORAGE_BACKUP_BUCKET,
  );
}

export function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function artifactDir(): string {
  const d = resolve("docs/internal/disaster-recovery/storage-backup");
  mkdirSync(d, { recursive: true });
  return d;
}

export function localWorkDir(): string {
  const d = resolve(".tmp/storage-backup");
  mkdirSync(d, { recursive: true });
  return d;
}

/** Paginate Storage list recursively without printing full paths. */
export async function listAllObjects(
  client: SupabaseClient,
  bucket: string,
): Promise<
  Array<{
    path: string;
    size: number | null;
    mime: string | null;
    updated_at: string | null;
    created_at: string | null;
  }>
> {
  const out: Array<{
    path: string;
    size: number | null;
    mime: string | null;
    updated_at: string | null;
    created_at: string | null;
  }> = [];

  async function walk(prefix: string) {
    let offset = 0;
    const limit = 100;
    for (;;) {
      const { data, error } = await client.storage.from(bucket).list(prefix, {
        limit,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) fail(`list ${prefix || "/"}: ${error.message.slice(0, 120)}`);
      const entries = data ?? [];
      for (const e of entries) {
        const path = prefix ? `${prefix}/${e.name}` : e.name;
        // Folders typically have id null and no metadata.size
        const isFolder =
          e.id === null &&
          (e.metadata == null || Object.keys(e.metadata as object).length === 0);
        if (isFolder) {
          await walk(path);
        } else {
          const meta = (e.metadata || {}) as Record<string, unknown>;
          out.push({
            path,
            size:
              typeof meta.size === "number"
                ? meta.size
                : typeof e.metadata === "object" &&
                    e.metadata &&
                    "size" in (e.metadata as object)
                  ? Number((e.metadata as { size?: number }).size)
                  : null,
            mime:
              typeof meta.mimetype === "string"
                ? meta.mimetype
                : typeof meta.contentType === "string"
                  ? meta.contentType
                  : null,
            updated_at: e.updated_at ?? null,
            created_at: e.created_at ?? null,
          });
        }
      }
      if (entries.length < limit) break;
      offset += limit;
    }
  }

  await walk("");
  return out;
}

export function summarizeObjects(
  objects: Array<{
    path: string;
    size: number | null;
    mime: string | null;
    updated_at: string | null;
    created_at: string | null;
  }>,
) {
  const byPrefix: Record<string, number> = {};
  const byExt: Record<string, number> = {};
  const byMimeFamily: Record<string, number> = {};
  let totalBytes = 0;
  let sized = 0;
  let unsized = 0;
  const nameCounts = new Map<string, number>();

  for (const o of objects) {
    const pref = o.path.includes("/")
      ? "user_prefix"
      : "root_file";
    byPrefix[pref] = (byPrefix[pref] || 0) + 1;
    // Depth-1 prefix count without exposing UUID
    const depth1 = o.path.split("/")[0] ? "depth1_folder_or_file" : "empty";
    void depth1;
    const top = o.path.split("/")[0] || "(root)";
    const topKey = `prefix_hash_${pathHash(top)}`;
    byPrefix[topKey] = (byPrefix[topKey] || 0) + 1;

    const ext = extOf(o.path);
    byExt[ext] = (byExt[ext] || 0) + 1;
    const fam = mimeFamily(o.mime);
    byMimeFamily[fam] = (byMimeFamily[fam] || 0) + 1;

    if (typeof o.size === "number" && Number.isFinite(o.size)) {
      totalBytes += o.size;
      sized += 1;
    } else {
      unsized += 1;
    }

    const base = o.path.split("/").pop() || o.path;
    nameCounts.set(base, (nameCounts.get(base) || 0) + 1);
  }

  const duplicateBasenames = [...nameCounts.entries()]
    .filter(([, n]) => n > 1)
    .length;

  const uniqueTopPrefixes = Object.keys(byPrefix).filter((k) =>
    k.startsWith("prefix_hash_"),
  ).length;

  const dates = objects
    .map((o) => o.created_at || o.updated_at)
    .filter(Boolean)
    .sort() as string[];

  return {
    object_count: objects.length,
    total_bytes_known: totalBytes,
    objects_with_size: sized,
    objects_without_size: unsized,
    unique_top_prefix_hashes: uniqueTopPrefixes,
    extension_distribution: byExt,
    mime_family_distribution: byMimeFamily,
    duplicate_basename_groups: duplicateBasenames,
    oldest_object_at: dates[0] ?? null,
    newest_object_at: dates[dates.length - 1] ?? null,
  };
}

export async function downloadBytes(
  client: SupabaseClient,
  bucket: string,
  path: string,
): Promise<{ ok: true; bytes: Uint8Array; size: number } | { ok: false; error: string }> {
  const { data, error } = await client.storage.from(bucket).download(path);
  if (error || !data) {
    return { ok: false, error: (error?.message || "download_failed").slice(0, 120) };
  }
  const buf = new Uint8Array(await data.arrayBuffer());
  return { ok: true, bytes: buf, size: buf.byteLength };
}

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function defaultManifestPath(stamp: string): string {
  return join(artifactDir(), `manifest-${stamp}.json`);
}
