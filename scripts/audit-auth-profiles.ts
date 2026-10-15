/**
 * Phase 1A — Staging/local auth.users ↔ profiles audit.
 *
 * Default: READ-ONLY report (counts + classifications, no PII).
 * Optional backfill: QE_AUTH_PROFILE_BACKFILL=1 inserts missing profiles only.
 *
 * Hard-refuses Production project ref.
 * Does NOT mutate KYC, ownership, or HQ.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const PRODUCTION_REF = "geywuzwbzecknokvnins";

type Class =
  | "MATCH"
  | "MISSING_PROFILE"
  | "ORPHAN_PROFILE"
  | "OTHER";

function fail(msg: string, code = 1): never {
  console.error(`FAIL ${msg}`);
  process.exit(code);
}

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 1) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

function projectRefFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    const m = host.match(/^([a-z0-9]+)\.supabase\.co$/i);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

async function main() {
  loadEnvFile(resolve(".env.staging.local"));
  loadEnvFile(resolve(".env.h4b0.local"));
  loadEnvFile(resolve(".env.local"));

  const url =
    process.env.QE_AUTH_AUDIT_SUPABASE_URL ||
    process.env.STAGING_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.H4B_SUPABASE_URL ||
    "";
  const serviceKey =
    process.env.QE_AUTH_AUDIT_SERVICE_ROLE_KEY ||
    process.env.STAGING_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.H4B_SERVICE_ROLE_KEY ||
    "";

  if (!url || !serviceKey) {
    console.log(
      JSON.stringify({
        status: "SKIPPED",
        reason: "missing_supabase_url_or_service_role",
        note: "Provide Staging credentials via .env.staging.local — no Production.",
      }),
    );
    return;
  }

  const ref = projectRefFromUrl(url);
  if (!ref) fail("could not parse supabase project ref", 2);
  if (ref === PRODUCTION_REF) fail("Production refused", 2);
  if (url.includes(PRODUCTION_REF)) fail("Production refused", 2);

  const doBackfill =
    process.env.QE_AUTH_PROFILE_BACKFILL === "1" ||
    process.env.QE_AUTH_PROFILE_BACKFILL === "true";

  const sb = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // auth.users via admin API (no email dump)
  const users: { id: string }[] = [];
  let page = 1;
  for (;;) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail(`listUsers: ${error.message}`, 2);
    const batch = data.users ?? [];
    for (const u of batch) users.push({ id: u.id });
    if (batch.length < 200) break;
    page += 1;
    if (page > 50) break;
  }

  const { data: profiles, error: pErr } = await sb.from("profiles").select("id");
  if (pErr) fail(`profiles select: ${pErr.message}`, 2);
  const profileIds = new Set((profiles ?? []).map((p) => p.id as string));
  const userIds = new Set(users.map((u) => u.id));

  let match = 0;
  let missing = 0;
  let orphan = 0;
  const missingIds: string[] = [];

  for (const id of userIds) {
    if (profileIds.has(id)) match += 1;
    else {
      missing += 1;
      missingIds.push(id);
    }
  }
  for (const id of profileIds) {
    if (!userIds.has(id)) orphan += 1;
  }

  // Identity count (no PII) — admin listUsers includes identities length when present
  let identityRows = 0;
  let multiIdentityUsers = 0;
  page = 1;
  for (;;) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    for (const u of data.users ?? []) {
      const n = Array.isArray(u.identities) ? u.identities.length : 0;
      identityRows += n;
      if (n > 1) multiIdentityUsers += 1;
    }
    if ((data.users ?? []).length < 200) break;
    page += 1;
    if (page > 50) break;
  }

  const classification: Record<Class, number> = {
    MATCH: match,
    MISSING_PROFILE: missing,
    ORPHAN_PROFILE: orphan,
    OTHER: 0,
  };

  let backfill = { attempted: false, inserted: 0, errors: 0 };
  if (doBackfill && missingIds.length > 0) {
    backfill.attempted = true;
    // Insert only id — never touch kyc_status / other columns
    const chunk = 50;
    for (let i = 0; i < missingIds.length; i += chunk) {
      const slice = missingIds.slice(i, i + chunk).map((id) => ({ id }));
      const { error } = await sb.from("profiles").insert(slice);
      if (error) {
        // retry one-by-one for partial success
        for (const row of slice) {
          const r = await sb.from("profiles").insert(row);
          if (r.error) backfill.errors += 1;
          else backfill.inserted += 1;
        }
      } else {
        backfill.inserted += slice.length;
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        status: "OK",
        mode: doBackfill ? "AUDIT_PLUS_BACKFILL" : "READ_ONLY",
        project_ref_suffix: ref.slice(-6),
        auth_users: users.length,
        profiles: profileIds.size,
        auth_identities_approx: identityRows,
        multi_identity_users: multiIdentityUsers,
        classification,
        backfill,
        note: "No emails/PII printed. Ownership remapping not performed.",
      },
      null,
      2,
    ),
  );
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e), 2));
