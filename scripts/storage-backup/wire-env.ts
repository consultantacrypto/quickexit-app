/**
 * Creates/updates gitignored .env.storage-backup.local
 * - Copies Production source URL + service role from .env.local (never prints values)
 * - Preserves any existing R2 destination values
 * - Does not invent R2 secrets
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const TARGET = resolve(".env.storage-backup.local");
const LOCAL = resolve(".env.local");

function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
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

function main() {
  if (!existsSync(LOCAL)) {
    console.error("FAIL .env.local missing");
    process.exit(1);
  }
  const local = parseEnv(readFileSync(LOCAL, "utf8"));
  const existing = existsSync(TARGET)
    ? parseEnv(readFileSync(TARGET, "utf8"))
    : {};

  const sourceUrl =
    existing.QE_STORAGE_SOURCE_URL ||
    (local.NEXT_PUBLIC_SUPABASE_URL?.includes("geywuzwbzecknokvnins")
      ? local.NEXT_PUBLIC_SUPABASE_URL
      : "https://geywuzwbzecknokvnins.supabase.co");
  const sourceKey =
    existing.QE_STORAGE_SOURCE_SERVICE_ROLE_KEY ||
    local.SUPABASE_SERVICE_ROLE_KEY ||
    "";

  if (!sourceKey) {
    console.error("FAIL Production service role missing in .env.local");
    process.exit(1);
  }

  const merged: Record<string, string> = {
    QE_STORAGE_SOURCE_URL: sourceUrl,
    QE_STORAGE_SOURCE_SERVICE_ROLE_KEY: sourceKey,
    QE_STORAGE_BACKUP_PROVIDER:
      existing.QE_STORAGE_BACKUP_PROVIDER || "cloudflare-r2",
    QE_STORAGE_BACKUP_ENDPOINT: existing.QE_STORAGE_BACKUP_ENDPOINT || "",
    QE_STORAGE_BACKUP_ACCESS_KEY_ID:
      existing.QE_STORAGE_BACKUP_ACCESS_KEY_ID || "",
    QE_STORAGE_BACKUP_SECRET_ACCESS_KEY:
      existing.QE_STORAGE_BACKUP_SECRET_ACCESS_KEY || "",
    QE_STORAGE_BACKUP_BUCKET:
      existing.QE_STORAGE_BACKUP_BUCKET || "quickexit-storage-backup",
    QE_STORAGE_BACKUP_REGION: existing.QE_STORAGE_BACKUP_REGION || "auto",
    QE_STORAGE_BACKUP_PREFIX: existing.QE_STORAGE_BACKUP_PREFIX || "listings",
    QE_STORAGE_BACKUP_FORCE_PATH_STYLE:
      existing.QE_STORAGE_BACKUP_FORCE_PATH_STYLE || "true",
    QE_STORAGE_BACKUP_ACCOUNT_ID: existing.QE_STORAGE_BACKUP_ACCOUNT_ID || "",
    QE_STORAGE_VERIFY_SAMPLE: existing.QE_STORAGE_VERIFY_SAMPLE || "12",
    QE_STORAGE_RESTORE_SAMPLE: existing.QE_STORAGE_RESTORE_SAMPLE || "12",
  };

  // Allow process env overrides without printing
  for (const k of Object.keys(merged)) {
    if (process.env[k] && String(process.env[k]).length > 0) {
      merged[k] = String(process.env[k]);
    }
  }

  // If endpoint empty but account id set, synthesize endpoint
  if (
    !merged.QE_STORAGE_BACKUP_ENDPOINT &&
    merged.QE_STORAGE_BACKUP_ACCOUNT_ID
  ) {
    merged.QE_STORAGE_BACKUP_ENDPOINT = `https://${merged.QE_STORAGE_BACKUP_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  }

  const body = `# Auto-wired by scripts/storage-backup/wire-env.ts — DO NOT COMMIT
# Gitignored via .env*

# --- Source (Production READ ONLY) ---
QE_STORAGE_SOURCE_URL=${merged.QE_STORAGE_SOURCE_URL}
QE_STORAGE_SOURCE_SERVICE_ROLE_KEY=${merged.QE_STORAGE_SOURCE_SERVICE_ROLE_KEY}

# --- Destination: Cloudflare R2 ---
QE_STORAGE_BACKUP_PROVIDER=${merged.QE_STORAGE_BACKUP_PROVIDER}
QE_STORAGE_BACKUP_ACCOUNT_ID=${merged.QE_STORAGE_BACKUP_ACCOUNT_ID}
QE_STORAGE_BACKUP_ENDPOINT=${merged.QE_STORAGE_BACKUP_ENDPOINT}
QE_STORAGE_BACKUP_ACCESS_KEY_ID=${merged.QE_STORAGE_BACKUP_ACCESS_KEY_ID}
QE_STORAGE_BACKUP_SECRET_ACCESS_KEY=${merged.QE_STORAGE_BACKUP_SECRET_ACCESS_KEY}
QE_STORAGE_BACKUP_BUCKET=${merged.QE_STORAGE_BACKUP_BUCKET}
QE_STORAGE_BACKUP_REGION=${merged.QE_STORAGE_BACKUP_REGION}
QE_STORAGE_BACKUP_PREFIX=${merged.QE_STORAGE_BACKUP_PREFIX}
QE_STORAGE_BACKUP_FORCE_PATH_STYLE=${merged.QE_STORAGE_BACKUP_FORCE_PATH_STYLE}

QE_STORAGE_VERIFY_SAMPLE=${merged.QE_STORAGE_VERIFY_SAMPLE}
QE_STORAGE_RESTORE_SAMPLE=${merged.QE_STORAGE_RESTORE_SAMPLE}
`;

  writeFileSync(TARGET, body, "utf8");

  const status = {
    target: ".env.storage-backup.local",
    gitignored: true,
    source_url_set: Boolean(merged.QE_STORAGE_SOURCE_URL),
    source_key_set: Boolean(merged.QE_STORAGE_SOURCE_SERVICE_ROLE_KEY),
    r2_endpoint_set: Boolean(merged.QE_STORAGE_BACKUP_ENDPOINT),
    r2_access_key_set: Boolean(merged.QE_STORAGE_BACKUP_ACCESS_KEY_ID),
    r2_secret_set: Boolean(merged.QE_STORAGE_BACKUP_SECRET_ACCESS_KEY),
    r2_bucket: merged.QE_STORAGE_BACKUP_BUCKET,
    r2_ready:
      Boolean(merged.QE_STORAGE_BACKUP_ENDPOINT) &&
      Boolean(merged.QE_STORAGE_BACKUP_ACCESS_KEY_ID) &&
      Boolean(merged.QE_STORAGE_BACKUP_SECRET_ACCESS_KEY) &&
      Boolean(merged.QE_STORAGE_BACKUP_BUCKET),
  };
  console.log(JSON.stringify(status, null, 2));
  if (!status.r2_ready) {
    console.error(
      "R2_KEYS_MISSING — set QE_STORAGE_BACKUP_ACCOUNT_ID (or ENDPOINT), ACCESS_KEY_ID, SECRET_ACCESS_KEY in .env.storage-backup.local or process env, then re-run wire-env / backup",
    );
    process.exit(2);
  }
  console.error("OK env wired; R2 destination ready (values not printed)");
}

main();
