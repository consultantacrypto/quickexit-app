/**
 * Phase 3C — READ-ONLY Production Storage inventory for `listings`.
 * Never mutates Production. Paths hashed in artifacts; no secrets printed.
 */
import {
  SOURCE_BUCKET,
  PRODUCTION_REF,
  artifactDir,
  createProdReadClient,
  downloadBytes,
  loadStorageBackupEnv,
  listAllObjects,
  pathHash,
  summarizeObjects,
  writeJson,
} from "./lib";

async function main() {
  const env = loadStorageBackupEnv();
  const { url, client } = createProdReadClient(env);

  const { data: buckets, error: bErr } = await client.storage.listBuckets();
  if (bErr) throw new Error(bErr.message);
  const listings = (buckets || []).find((b) => b.name === SOURCE_BUCKET || b.id === SOURCE_BUCKET);

  const objects = await listAllObjects(client, SOURCE_BUCKET);
  const summary = summarizeObjects(objects);

  // Sample byte-fetch probe (up to 15) — READ ONLY downloads, no uploads
  const sampleIndexes = pickSampleIndexes(objects.length, 15);
  const byteProbes: Array<Record<string, unknown>> = [];
  let byteFail = 0;
  let byteOk = 0;
  for (const idx of sampleIndexes) {
    const o = objects[idx];
    const r = await downloadBytes(client, SOURCE_BUCKET, o.path);
    if (r.ok) {
      byteOk += 1;
      byteProbes.push({
        path_hash: pathHash(o.path),
        meta_size: o.size,
        byte_size: r.size,
        size_match: o.size == null || o.size === r.size,
        mime: o.mime,
        ok: true,
      });
    } else {
      byteFail += 1;
      byteProbes.push({
        path_hash: pathHash(o.path),
        meta_size: o.size,
        ok: false,
        error_class: r.error,
      });
    }
  }

  const report = {
    at: new Date().toISOString(),
    mode: "phase3c_storage_inventory_readonly",
    source_project_ref: PRODUCTION_REF,
    source_url_ref_ok: url.includes(PRODUCTION_REF),
    bucket: {
      name: SOURCE_BUCKET,
      found: Boolean(listings),
      public: listings?.public ?? null,
      id: listings?.id ?? null,
      file_size_limit: listings?.file_size_limit ?? null,
      allowed_mime_types: listings?.allowed_mime_types ?? null,
    },
    inventory: summary,
    byte_probe_sample: {
      sampled: byteProbes.length,
      ok: byteOk,
      failed: byteFail,
      note: "Metadata-present but byte-fetch-fail objects are listed by path_hash only",
      probes: byteProbes,
    },
    safety: {
      production_mutations: "NONE",
      deletes: "NONE",
      overwrites: "NONE",
      policy_changes: "NONE",
    },
  };

  const outPath = `${artifactDir()}/inventory-production-listings-2026-10-14.json`;
  writeJson(outPath, report);
  console.log(JSON.stringify(report, null, 2));
  console.log(`OK wrote ${outPath}`);
}

function pickSampleIndexes(n: number, want: number): number[] {
  if (n <= 0) return [];
  if (n <= want) return [...Array(n).keys()];
  const out = new Set<number>();
  out.add(0);
  out.add(n - 1);
  for (let i = 1; i < want - 1; i++) {
    out.add(Math.floor((i * (n - 1)) / (want - 1)));
  }
  return [...out].sort((a, b) => a - b);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
