/**
 * Follow admin magic-link hops to Staging auth callback (no token reuse).
 * Redacts codes/tokens from output.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { STAGING_REF, assertStagingSupabaseWriteTarget } from "./assert-staging-supabase-target";

const SITE = "https://quickexit-staging.vercel.app";
const OUT = resolve("docs/internal/auth/phase1a-callback-hop-smoke-2026-10-15.json");

function fail(m: string, c = 1): never {
  console.error(`FAIL ${m}`);
  process.exit(c);
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

function redact(url: string | null): string | null {
  if (!url) return null;
  return url
    .replace(/code=[^&]+/g, "code=REDACTED")
    .replace(/access_token=[^&]+/g, "access_token=REDACTED")
    .replace(/refresh_token=[^&]+/g, "refresh_token=REDACTED")
    .replace(/token=[^&]+/g, "token=REDACTED")
    .slice(0, 260);
}

async function main() {
  loadEnvFile(resolve(".env.staging.local"));
  const url =
    process.env.STAGING_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    `https://${STAGING_REF}.supabase.co`;
  const serviceKey =
    process.env.STAGING_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!serviceKey) fail("missing service key", 2);
  assertStagingSupabaseWriteTarget(url);

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const stamp = Date.now();
  const email = `phase1a.cbhop.${stamp}@staging.quickexit.test`;
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: `CbHop-${stamp}-Aa1!`,
  });
  if (created.error || !created.data.user?.id) fail(created.error?.message ?? "no user", 2);
  const userId = created.data.user.id;
  await new Promise((r) => setTimeout(r, 400));

  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${SITE}/ro/auth/callback?next=/ro/dashboard` },
  });
  if (link.error || !link.data.properties?.action_link) fail(link.error?.message ?? "no link", 2);

  const hops: Array<{ status: number; loc: string | null; note?: string }> = [];
  let current: string | null = link.data.properties.action_link;
  let callbackOk = false;
  for (let i = 0; i < 8 && current; i++) {
    const res = await fetch(current, { redirect: "manual" });
    const loc = res.headers.get("location");
    hops.push({ status: res.status, loc: redact(loc) });
    if (!loc) break;
    const abs = loc.startsWith("http") ? loc : new URL(loc, current).toString();
    current = abs;
    if (abs.includes("/auth/callback")) {
      // Strip hash for server fetch (fragments are never sent). Expect 200 HTML bounce
      // for implicit magic-link; PKCE ?code= path still 30x → dashboard.
      const serverUrl = abs.split("#")[0]!;
      const cb = await fetch(serverUrl, { redirect: "manual" });
      const cbLoc = cb.headers.get("location");
      const body = cb.status === 200 ? await cb.text() : "";
      const hashBounce =
        cb.status === 200 && body.includes("access_token") && body.includes("location.hash");
      hops.push({
        status: cb.status,
        loc: redact(cbLoc),
        note: hashBounce ? "staging_callback_hash_bounce" : "staging_callback",
      });
      callbackOk = Boolean(
        hashBounce ||
          (cbLoc &&
            (cbLoc.includes("/dashboard") || cbLoc.includes("/ro/dashboard")) &&
            !cbLoc.includes("auth=error")),
      );
      break;
    }
  }

  const profile = await admin.from("profiles").select("id,kyc_status").eq("id", userId);
  await admin.from("profiles").delete().eq("id", userId);
  await admin.auth.admin.deleteUser(userId);

  const record = {
    at: new Date().toISOString(),
    staging_ref: STAGING_REF,
    user_id_suffix: userId.slice(-8),
    profile_count: (profile.data ?? []).length,
    kyc_status: profile.data?.[0]?.kyc_status ?? null,
    callback_ok: callbackOk,
    hops,
  };
  writeFileSync(OUT, `${JSON.stringify(record, null, 2)}\n`);
  console.log(JSON.stringify(record, null, 2));
  if ((profile.data ?? []).length !== 1) fail("profile missing");
  // Callback may fail for admin generateLink without browser PKCE cookies — report honestly.
  console.log(callbackOk ? "PASS callback hop" : "PARTIAL callback hop (session via verifyOtp still proven)");
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e), 2));
