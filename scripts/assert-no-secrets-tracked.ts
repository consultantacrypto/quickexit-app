/**
 * CI-safe: fail if sensitive files or secret-like patterns are tracked by git.
 * Scans the repo working tree only (git ls-files).
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const FORBIDDEN_PATH_REGEX =
  /(^|\/)\.env(\.|$)|\.env\.local$|\.env\.[^/]*\.local$|credentials\.json$/i;

/** Real credential shapes — not bare env var names in docs. */
const FORBIDDEN_CONTENT_REGEX: Array<{ name: string; re: RegExp }> = [
  { name: "supabase_service_role_jwt", re: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*["']?eyJ[A-Za-z0-9_-]{20,}\./ },
  // Ignore template interpolations / empty placeholders in wiring scripts
  {
    name: "r2_secret_access_key_assigned",
    re: /QE_STORAGE_BACKUP_SECRET_ACCESS_KEY\s*=\s*["']?(?!\$\{)(?!env\()(?!")[^\s"']{20,}/,
  },
  {
    name: "r2_access_key_assigned",
    re: /QE_STORAGE_BACKUP_ACCESS_KEY_ID\s*=\s*["']?(?!\$\{)(?!env\()(?!")[^\s"']{16,}/,
  },
  { name: "stripe_live_secret", re: /sk_live_[0-9a-zA-Z]{16,}/ },
  { name: "stripe_restricted_live", re: /rk_live_[0-9a-zA-Z]{16,}/ },
  { name: "stripe_webhook_secret", re: /whsec_[0-9a-zA-Z]{16,}/ },
  {
    name: "sentry_auth_token_assigned",
    re: /SENTRY_AUTH_TOKEN\s*=\s*["']?(?!\$\{)(?!")[^\s"']{20,}/,
  },
  // Local Supabase demo URL (postgres:postgres@127.0.0.1) is allowed
  {
    name: "postgres_url_with_password",
    re: /postgres(ql)?:\/\/(?!postgres:postgres@(?:127\.0\.0\.1|localhost)(?::\d+)?\/)[^:\s\/]+:[^@\s]+@/i,
  },
  { name: "private_key_block", re: /BEGIN (RSA |OPENSSH )?PRIVATE KEY/ },
];

function fail(msg: string): never {
  console.error(`FAIL ${msg}`);
  process.exit(1);
}

function trackedFiles(): string[] {
  const out = execSync("git ls-files -z", { encoding: "buffer" });
  return out
    .toString("utf8")
    .split("\0")
    .map((s) => s.trim())
    .filter(Boolean);
}

function main() {
  const files = trackedFiles();
  const badPaths = files.filter((f) => FORBIDDEN_PATH_REGEX.test(f.replace(/\\/g, "/")));
  if (badPaths.length) {
    fail(`forbidden tracked path(s): ${badPaths.join(", ")}`);
  }

  const contentHits: string[] = [];
  for (const f of files) {
    const norm = f.replace(/\\/g, "/");
    if (norm.includes("node_modules/") || norm.endsWith("package-lock.json")) continue;
    if (/\.example(\.|$)/i.test(norm) || norm.includes(".example.")) continue;
    if (!/\.(ts|tsx|js|jsx|mjs|cjs|json|md|yml|yaml|txt|toml|sql|env)$/i.test(norm)) continue;

    let text: string;
    try {
      text = readFileSync(f, "utf8");
    } catch {
      continue;
    }
    for (const { name, re } of FORBIDDEN_CONTENT_REGEX) {
      if (re.test(text)) {
        contentHits.push(`${norm} (${name})`);
        break;
      }
    }
  }

  if (contentHits.length) {
    fail(`secret-like content in tracked files:\n${contentHits.join("\n")}`);
  }

  console.log(
    JSON.stringify(
      {
        at: new Date().toISOString(),
        mode: "assert-no-secrets-tracked",
        tracked_files_scanned: files.length,
        ok: true,
      },
      null,
      2,
    ),
  );
  console.error("OK assert-no-secrets-tracked");
}

main();
