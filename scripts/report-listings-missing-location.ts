import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import {
  hasStructuredListingLocation,
  tryParseLegacyListingLocation,
} from "../lib/listingLocation";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: "D:/MEDIA/quickexit/.env.local" });
dotenv.config({ path: "D:/MEDIA/quickexit/.env" });

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const service = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

type Row = {
  id: string;
  title: string | null;
  category: string | null;
  status: string | null;
  is_seed: boolean | null;
  details: unknown;
};

async function main() {
  const outDir = path.resolve(process.cwd(), "docs/internal");
  const outFile = path.join(outDir, "listing-location-missing-report.md");

  if (!url || (!anon && !service)) {
    const body = [
      "# Active listings missing structured location",
      "",
      "Generated without a live Supabase connection (missing env in this worktree).",
      "",
      "Re-run after setting `NEXT_PUBLIC_SUPABASE_URL` and a key:",
      "",
      "```",
      "npx tsx scripts/report-listings-missing-location.ts",
      "```",
      "",
      "No locations were invented or written.",
    ].join("\n");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outFile, `${body}\n`, "utf8");
    console.log("Wrote offline report:", outFile);
    return;
  }

  const supabase = createClient(url, service || anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let data: unknown = null;
  try {
    const result = await supabase
      .from("listings")
      .select("id,title,category,status,is_seed,details")
      .eq("status", "active")
      .eq("is_seed", false)
      .order("created_at", { ascending: false })
      .limit(500);
    if (result.error) throw new Error(result.error.message);
    data = result.data;
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch failed";
    const body = [
      "# Active listings missing structured location",
      "",
      "Supabase inspection failed (network or credentials).",
      "",
      `\`${message}\``,
      "",
      "No locations were invented or written. Re-run:",
      "",
      "```",
      "npx tsx scripts/report-listings-missing-location.ts",
      "```",
    ].join("\n");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outFile, `${body}\n`, "utf8");
    console.error(message);
    return;
  }

  const rows = (data ?? []) as Row[];
  const missing: Row[] = [];
  const wouldBackfill: { id: string; title: string | null; category: string | null; label: string }[] = [];

  for (const row of rows) {
    if (hasStructuredListingLocation(row.details)) continue;
    const parsed = tryParseLegacyListingLocation(row.details);
    if (parsed) {
      wouldBackfill.push({
        id: row.id,
        title: row.title,
        category: row.category,
        label: `${parsed.county}, ${parsed.district || parsed.city}`,
      });
      continue;
    }
    missing.push(row);
  }

  const lines = [
    "# Active listings missing structured location",
    "",
    `Inspected active, non-seed listings: **${rows.length}**.`,
    `Deterministic catalog matches (not written): **${wouldBackfill.length}**.`,
    `Still missing a reliable structured location: **${missing.length}**.`,
    "",
    "No database writes were performed. No locations were invented.",
    "",
  ];

  if (wouldBackfill.length > 0) {
    lines.push("## Deterministic matches (dry-run only)", "");
    lines.push("| Listing ID | Title | Category | Parsed location |");
    lines.push("|---|---|---|---|");
    for (const row of wouldBackfill) {
      lines.push(
        `| ${row.id} | ${String(row.title ?? "").replace(/\|/g, "/")} | ${String(row.category ?? "")} | ${row.label} |`,
      );
    }
    lines.push("");
  }

  lines.push("## Missing structured location", "");
  if (missing.length === 0) {
    lines.push("None.");
  } else {
    lines.push("| Listing ID | Title | Category |");
    lines.push("|---|---|---|");
    for (const row of missing) {
      lines.push(
        `| ${row.id} | ${String(row.title ?? "").replace(/\|/g, "/")} | ${String(row.category ?? "")} |`,
      );
    }
  }
  lines.push("");

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, `${lines.join("\n")}\n`, "utf8");
  console.log("Wrote", outFile);
  for (const row of missing) {
    console.log(`${row.id}\t${row.category ?? ""}\t${row.title ?? ""}`);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
