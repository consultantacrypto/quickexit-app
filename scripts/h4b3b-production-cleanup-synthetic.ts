/**
 * Cleanup leftover H4B.3b Phase 1 synthetic @h4b3b.quickexit.test users/profiles.
 * Does NOT touch orphan listings media.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 1) continue;
    process.env[line.slice(0, i)] = line.slice(i + 1);
  }
}

async function main() {
  loadEnvFile(join(tmpdir(), "qe-prod-h4b3b-matrix.env"));
  if (process.env.QE_PRODUCTION_MATRIX !== "1") {
    console.error("FAIL QE_PRODUCTION_MATRIX=1 required");
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url.includes("geywuzwbzecknokvnins")) {
    console.error("FAIL not production");
    process.exit(1);
  }
  const s = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const listed = await s.auth.admin.listUsers({ perPage: 200 });
  const syn = (listed.data?.users || []).filter(
    (u) =>
      String(u.email || "").includes("@h4b3b.quickexit.test") ||
      u.user_metadata?.h4b3b_phase1 === true,
  );
  console.log(`synthetic_users_found=${syn.length}`);
  for (const u of syn) {
    await s.from("demand_offers").delete().eq("seller_user_id", u.id);
    await s.from("demands").delete().eq("buyer_id", u.id);
    await s.from("profiles").delete().eq("id", u.id);
    await s.auth.admin.deleteUser(u.id);
    console.log("deleted_synthetic_user");
  }
  console.log("OK cleanup");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
