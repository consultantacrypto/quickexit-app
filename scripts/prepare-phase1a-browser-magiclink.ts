import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { STAGING_REF, assertStagingSupabaseWriteTarget } from "./assert-staging-supabase-target";

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
  const SITE = "https://quickexit-staging.vercel.app";
  const stamp = Date.now();
  const email = `phase1a.browser.${stamp}@staging.quickexit.test`;
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: `Br-${stamp}-Aa1!`,
  });
  if (created.error || !created.data.user?.id) throw created.error;
  const userId = created.data.user.id;
  await new Promise((r) => setTimeout(r, 400));
  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${SITE}/ro/auth/callback?next=/ro/dashboard` },
  });
  if (link.error || !link.data.properties?.action_link) throw link.error;
  const action = link.data.properties.action_link;
  writeFileSync(join(tmpdir(), "qe-phase1a-magiclink.url"), action, "utf8");
  writeFileSync(
    resolve("docs/internal/auth/phase1a-browser-magiclink-meta.json"),
    `${JSON.stringify(
      {
        user_id_suffix: userId.slice(-8),
        user_id: userId,
        email_domain: "staging.quickexit.test",
        action_host: new URL(action).host,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    JSON.stringify({
      ok: true,
      user_id_suffix: userId.slice(-8),
      url_file: join(tmpdir(), "qe-phase1a-magiclink.url"),
    }),
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
});
