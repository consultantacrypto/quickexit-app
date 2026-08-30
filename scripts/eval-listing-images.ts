/**
 * Read-only public listing image probe. Masks IDs. Never writes to the database.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { canonicalListingImageSrc, listingObjectFit } from "../lib/listingMedia";

function maskId(id: string): string {
  const clean = id.trim();
  if (clean.length < 12) return "********";
  return `${clean.slice(0, 8)}…${clean.slice(-4)}`;
}

function env(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : null;
}

async function probeDimensions(url: string): Promise<{ w: number; h: number; ar: number } | null> {
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2;
      while (i < buf.length - 8) {
        if (buf[i] !== 0xff) {
          i += 1;
          continue;
        }
        const marker = buf[i + 1];
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
          const h = buf.readUInt16BE(i + 5);
          const w = buf.readUInt16BE(i + 7);
          return { w, h, ar: Number((w / h).toFixed(3)) };
        }
        const len = buf.readUInt16BE(i + 2);
        i += 2 + len;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function main() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !key) {
    console.log("SKIP eval-listing-images: missing public Supabase env");
    return;
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("listings")
    .select("id,title,category,images,status,is_seed,created_at")
    .eq("status", "active")
    .eq("is_seed", false)
    .order("created_at", { ascending: false })
    .limit(80);

  if (error || !data) {
    console.warn("eval-listing-images query failed", { code: error?.code ?? null });
    return;
  }

  type PublicImageRow = {
    id: string;
    title: string | null;
    category: string | null;
    images: unknown;
    status: string | null;
    is_seed: boolean | null;
    created_at: string | null;
  };
  const rows = (data ?? []) as PublicImageRow[];

  const cadillac = rows.find((row) =>
    String(row.title ?? "").toLowerCase().includes("cadillac"),
  );
  const watches = rows.filter((row) => {
    const title = String(row.title ?? "").toLowerCase();
    const category = String(row.category ?? "").toLowerCase();
    return (
      category.includes("lux") ||
      title.includes("rolex") ||
      title.includes("watch") ||
      title.includes("ceas") ||
      title.includes("omega") ||
      title.includes("patek")
    );
  });
  const newestWatch = watches[0] ?? null;

  async function describe(row: PublicImageRow | undefined, label: string) {
    if (!row) return { label, found: false };
    const images = Array.isArray(row.images)
      ? row.images.filter((x: unknown): x is string => typeof x === "string")
      : [];
    const cover = images[0] ?? null;
    const original = cover ? await probeDimensions(canonicalListingImageSrc(cover)) : null;
    const leftoverRender =
      cover && cover.includes("/render/image/")
        ? await probeDimensions(cover)
        : null;
    return {
      label,
      found: true,
      maskedId: maskId(String(row.id)),
      title: row.title,
      category: row.category,
      imageCount: images.length,
      coverIsIndex0: true,
      original,
      leftoverRender,
      canonicalWouldUse: original
        ? listingObjectFit(original.ar, 4 / 3)
        : "contain",
    };
  }

  const report = {
    generatedAt: new Date().toISOString(),
    cadillac: await describe(cadillac, "cadillac"),
    newestWatch: await describe(newestWatch, "newest_watch"),
  };

  const outDir = join(process.cwd(), "qa", "phase2a");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "image-eval.json"), JSON.stringify(report, null, 2));
  console.log("OK eval-listing-images wrote qa/phase2a/image-eval.json");
}

void main();
