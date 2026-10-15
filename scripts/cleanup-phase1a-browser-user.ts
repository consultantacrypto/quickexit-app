import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertStagingSupabaseWriteTarget } from "./assert-staging-supabase-target";

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

async function main() {
  loadEnvFile(resolve(".env.staging.local"));
  const url = process.env.STAGING_SUPABASE_URL!;
  const service = process.env.STAGING_SERVICE_ROLE_KEY!;
  assertStagingSupabaseWriteTarget(url);
  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const meta = JSON.parse(
    readFileSync(resolve("docs/internal/auth/phase1a-browser-magiclink-meta.json"), "utf8"),
  ) as { user_id: string };
  await admin.from("profiles").delete().eq("id", meta.user_id);
  await admin.auth.admin.deleteUser(meta.user_id);
  const users = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const profiles = await admin.from("profiles").select("id");
  console.log(
    JSON.stringify({
      cleaned_suffix: meta.user_id.slice(-8),
      auth_users: users.data.users?.length ?? null,
      profiles: profiles.data?.length ?? null,
    }),
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
});
