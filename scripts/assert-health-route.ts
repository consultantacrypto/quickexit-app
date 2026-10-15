/**
 * CI guard: Production uptime probe route must exist with expected contract.
 * Prevents git-auto-deploy from promoting a tree without /api/health.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROUTE = resolve("app/api/health/route.ts");

function fail(m: string): never {
  console.error(`FAIL ${m}`);
  process.exit(1);
}

if (!existsSync(ROUTE)) fail("missing app/api/health/route.ts");

const src = readFileSync(ROUTE, "utf8");
if (!/export\s+async\s+function\s+GET/.test(src)) fail("health route missing GET handler");
if (!/status:\s*["']ok["']/.test(src)) fail("health route must return status ok");
if (!/environment/.test(src)) fail("health route must include environment");
if (!/resolveObservabilityEnvironment/.test(src)) {
  fail("health route must use resolveObservabilityEnvironment");
}

console.log("OK assert-health-route");
