import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const PRODUCTION_SUPABASE_HOST = "geywuzwbzecknokvnins.supabase.co";

if (existsSync(resolve(".env.local"))) {
  loadDotenv({ path: resolve(".env.local") });
}

const nextConfig = readFileSync(resolve("next.config.ts"), "utf8");
assert(
  nextConfig.includes(PRODUCTION_SUPABASE_HOST),
  "next.config images host is the Production Supabase project",
);

const layout = readFileSync(resolve("app/[locale]/layout.tsx"), "utf8");
assert(
  layout.includes(`https://${PRODUCTION_SUPABASE_HOST}`),
  "app layout preconnects to the Production Supabase project",
);

const envUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
let envPointsAtProduction = false;
if (envUrl) {
  try {
    envPointsAtProduction = new URL(envUrl).host === PRODUCTION_SUPABASE_HOST;
  } catch {
    envPointsAtProduction = envUrl.includes(PRODUCTION_SUPABASE_HOST);
  }
}

assert(
  envPointsAtProduction,
  "local NEXT_PUBLIC_SUPABASE_URL host is the Production Supabase project",
);

console.log("OK preview-supabase-boundary");
console.log(`production_supabase_host=${PRODUCTION_SUPABASE_HOST}`);
console.log("env_url_configured=yes");
console.log("env_points_at_production=yes");
console.log(
  "Vercel Preview builds the same next.config image host. There is no staging Supabase ref in the repo.",
);
console.log(
  "Authenticated Preview or local inquiry testing against this host would write Production and must not be performed.",
);
console.log(
  "Use local Supabase for full RLS testing, or a dedicated staging project. Do not configure one in this Gate.",
);
