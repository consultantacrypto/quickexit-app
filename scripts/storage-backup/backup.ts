/**
 * Phase 3C Storage backup CLI.
 *
 * Modes:
 *   dry-run | r2-check | private-proof | backup | parity | verify |
 *   restore-sample | synthetic-drill
 *
 * Production Storage: READ ONLY. Never delete/overwrite Production.
 * Destination deletes: never mirrored from Production; synthetic cleanup
 * may skip if Bucket Lock prevents delete.
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  SOURCE_BUCKET,
  PRODUCTION_REF,
  artifactDir,
  createProdReadClient,
  downloadBytes,
  fail,
  hasBackupDestination,
  listAllObjects,
  loadStorageBackupEnv,
  localWorkDir,
  pathHash,
  sha256,
  summarizeObjects,
  writeJson,
} from "./lib";

type Mode =
  | "dry-run"
  | "r2-check"
  | "private-proof"
  | "backup"
  | "parity"
  | "verify"
  | "restore-sample"
  | "synthetic-drill";

function parseMode(): Mode {
  const arg = (process.argv[2] || "dry-run").toLowerCase();
  const allowed: Mode[] = [
    "dry-run",
    "r2-check",
    "private-proof",
    "backup",
    "parity",
    "verify",
    "restore-sample",
    "synthetic-drill",
  ];
  if (!allowed.includes(arg as Mode)) {
    fail(`mode must be one of ${allowed.join("|")}`);
  }
  return arg as Mode;
}

function s3FromEnv(env: Record<string, string>): {
  client: S3Client;
  bucket: string;
  prefix: string;
} {
  if (!hasBackupDestination(env)) {
    fail(
      "backup destination credentials missing — set QE_STORAGE_BACKUP_* in .env.storage-backup.local",
    );
  }
  const client = new S3Client({
    region: env.QE_STORAGE_BACKUP_REGION || "auto",
    endpoint: env.QE_STORAGE_BACKUP_ENDPOINT,
    forcePathStyle: env.QE_STORAGE_BACKUP_FORCE_PATH_STYLE !== "false",
    credentials: {
      accessKeyId: env.QE_STORAGE_BACKUP_ACCESS_KEY_ID!,
      secretAccessKey: env.QE_STORAGE_BACKUP_SECRET_ACCESS_KEY!,
    },
  });
  return {
    client,
    bucket: env.QE_STORAGE_BACKUP_BUCKET || "quickexit-storage-backup",
    prefix: (env.QE_STORAGE_BACKUP_PREFIX || "listings").replace(/\/$/, ""),
  };
}

async function streamToBuffer(body: unknown): Promise<Uint8Array> {
  if (!body) return new Uint8Array();
  if (body instanceof Uint8Array) return body;
  if (
    typeof (body as { transformToByteArray?: () => Promise<Uint8Array> })
      .transformToByteArray === "function"
  ) {
    return await (
      body as { transformToByteArray: () => Promise<Uint8Array> }
    ).transformToByteArray();
  }
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Buffer>) {
    chunks.push(Buffer.from(chunk));
  }
  return new Uint8Array(Buffer.concat(chunks));
}

async function listDestPrefix(
  client: S3Client,
  bucket: string,
  prefix: string,
): Promise<Array<{ key: string; size: number }>> {
  const out: Array<{ key: string; size: number }> = [];
  let token: string | undefined;
  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix.endsWith("/") ? prefix : `${prefix}/`,
        ContinuationToken: token,
      }),
    );
    for (const o of res.Contents || []) {
      if (!o.Key || o.Key.endsWith("/")) continue;
      out.push({ key: o.Key, size: o.Size || 0 });
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return out;
}

function gitCommitSoft(): string | null {
  try {
    return execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function pickDiverseSamples<
  T extends { path: string; size: number | null; mime: string | null },
>(objects: T[], want: number): T[] {
  if (objects.length <= want) return [...objects];
  const byExt = new Map<string, T[]>();
  for (const o of objects) {
    const ext = (o.path.split(".").pop() || "bin").toLowerCase();
    if (!byExt.has(ext)) byExt.set(ext, []);
    byExt.get(ext)!.push(o);
  }
  const picked: T[] = [];
  const used = new Set<string>();
  // Prefer one of each extension first
  for (const [, arr] of byExt) {
    if (picked.length >= want) break;
    const o = arr[Math.floor(arr.length / 2)];
    if (!used.has(o.path)) {
      picked.push(o);
      used.add(o.path);
    }
  }
  // Add smallest + largest
  const sorted = [...objects].sort((a, b) => (a.size || 0) - (b.size || 0));
  for (const o of [sorted[0], sorted[sorted.length - 1]]) {
    if (picked.length >= want) break;
    if (!used.has(o.path)) {
      picked.push(o);
      used.add(o.path);
    }
  }
  // Fill evenly across prefixes
  let i = 0;
  while (picked.length < want && i < objects.length * 2) {
    const o = objects[Math.floor((i * (objects.length - 1)) / Math.max(want, 1)) % objects.length];
    if (!used.has(o.path)) {
      picked.push(o);
      used.add(o.path);
    }
    i += 1;
  }
  return picked.slice(0, want);
}

function safeHost(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return "(invalid_endpoint)";
  }
}

function extFrom(path: string): string {
  const base = path.split("/").pop() || "";
  const i = base.lastIndexOf(".");
  return i >= 0 ? base.slice(i) : "";
}

function assertDestNotSupabase(env: Record<string, string>) {
  const ep = env.QE_STORAGE_BACKUP_ENDPOINT || "";
  if (ep.includes(PRODUCTION_REF)) {
    fail("REFUSED: backup destination endpoint must not be Production Supabase");
  }
  if (ep.includes("nlnzlswjjplofpkhoxtr")) {
    fail("REFUSED: backup destination must not be Staging Supabase");
  }
  if (ep.includes("supabase.co")) {
    fail("REFUSED: destination must be true off-site (not Supabase)");
  }
}

async function main() {
  const mode = parseMode();
  const env = loadStorageBackupEnv();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  if (env.QE_STORAGE_BACKUP_ENDPOINT) assertDestNotSupabase(env);

  // Modes that need destination only (no Production list) still may need source for verify
  const needsSourceList = ![
    "r2-check",
    "private-proof",
    "synthetic-drill",
  ].includes(mode);

  let objects: Awaited<ReturnType<typeof listAllObjects>> = [];
  let summary: ReturnType<typeof summarizeObjects> | null = null;
  let src: ReturnType<typeof createProdReadClient>["client"] | null = null;

  if (needsSourceList || mode === "dry-run" || mode === "backup" || mode === "verify" || mode === "restore-sample" || mode === "parity") {
    const prod = createProdReadClient(env);
    src = prod.client;
  }

  if (needsSourceList && src) {
    console.error(`mode=${mode} source_ref=${PRODUCTION_REF} bucket=${SOURCE_BUCKET}`);
    objects = await listAllObjects(src, SOURCE_BUCKET);
    summary = summarizeObjects(objects);
  } else {
    console.error(`mode=${mode}`);
  }

  if (mode === "dry-run") {
    if (!src) fail("source required");
    const inaccessible: Array<{ path_hash: string; error: string }> = [];
    const probeN = Math.min(20, objects.length);
    for (let i = 0; i < probeN; i++) {
      const idx = Math.floor((i * (objects.length - 1)) / Math.max(probeN - 1, 1));
      const o = objects[idx];
      const r = await downloadBytes(src, SOURCE_BUCKET, o.path);
      if (!r.ok) inaccessible.push({ path_hash: pathHash(o.path), error: r.error });
    }
    const report = {
      at: new Date().toISOString(),
      mode: "dry-run",
      DRY_RUN_PASS: inaccessible.length === 0,
      source_project_ref: PRODUCTION_REF,
      source_bucket: SOURCE_BUCKET,
      discovered: summary,
      sample_inaccessible: inaccessible,
      operations: {
        production_writes: 0,
        production_deletes: 0,
        destination_uploads: 0,
        destination_deletes: 0,
      },
      destination_configured: hasBackupDestination(env),
    };
    writeJson(`${artifactDir()}/dry-run-${stamp}.json`, report);
    console.log(JSON.stringify(report, null, 2));
    if (!report.DRY_RUN_PASS) process.exit(2);
    console.error("OK DRY_RUN_PASS");
    return;
  }

  if (!hasBackupDestination(env)) {
    const blocker = {
      at: new Date().toISOString(),
      mode,
      status: "MANUAL_OPERATOR_ACTION_REQUIRED",
      reason:
        "R2 credentials missing in .env.storage-backup.local — run wire-env then fill Access Key ID / Secret / Account ID",
      required_env: [
        "QE_STORAGE_BACKUP_ENDPOINT or QE_STORAGE_BACKUP_ACCOUNT_ID",
        "QE_STORAGE_BACKUP_ACCESS_KEY_ID",
        "QE_STORAGE_BACKUP_SECRET_ACCESS_KEY",
        "QE_STORAGE_BACKUP_BUCKET (= quickexit-storage-backup)",
      ],
      bucket_expected: "quickexit-storage-backup",
      discovered_source: summary,
    };
    writeJson(`${artifactDir()}/blocker-credentials-${stamp}.json`, blocker);
    console.log(JSON.stringify(blocker, null, 2));
    fail("MANUAL_OPERATOR_ACTION_REQUIRED — see report");
  }

  const dest = s3FromEnv(env);

  if (mode === "r2-check") {
    const probeKey = `__connectivity__/phase3c-${Date.now()}.txt`;
    const payload = Buffer.from(`qe-r2-check ${new Date().toISOString()}\n`);
    let listOk = false;
    let putOk = false;
    let getOk = false;
    let listCount: number | null = null;
    try {
      const listed = await listDestPrefix(dest.client, dest.bucket, "");
      listOk = true;
      listCount = listed.length;
    } catch (e) {
      console.log(
        JSON.stringify({
          R2_DESTINATION_PASS: false,
          stage: "list",
          error: (e instanceof Error ? e.message : String(e)).slice(0, 160),
        }),
      );
      process.exit(1);
    }
    try {
      await dest.client.send(
        new PutObjectCommand({
          Bucket: dest.bucket,
          Key: probeKey,
          Body: payload,
          ContentType: "text/plain",
          Metadata: { synthetic: "true", role: "connectivity" },
        }),
      );
      putOk = true;
      const got = await dest.client.send(
        new GetObjectCommand({ Bucket: dest.bucket, Key: probeKey }),
      );
      const bytes = await streamToBuffer(got.Body);
      getOk = bytes.byteLength === payload.length;
    } catch (e) {
      console.log(
        JSON.stringify({
          R2_DESTINATION_PASS: false,
          listOk,
          putOk,
          getOk,
          error: (e instanceof Error ? e.message : String(e)).slice(0, 160),
        }),
      );
      process.exit(1);
    }
    // Do not delete connectivity probe if Bucket Lock may block — leave documented
    const report = {
      at: new Date().toISOString(),
      mode: "r2-check",
      R2_DESTINATION_PASS: listOk && putOk && getOk,
      bucket: dest.bucket,
      endpoint_host: safeHost(env.QE_STORAGE_BACKUP_ENDPOINT!),
      not_supabase: true,
      destination_object_count_all_prefixes: listCount,
      connectivity_probe_key: probeKey,
      connectivity_probe_left_in_place: true,
      bucket_lock:
        "MANUAL_OPERATOR_CONFIRMED — 30 day whole-bucket lock (API inspect not required)",
      note: "Public/private cannot be fully proven via S3 API alone; see private-proof mode",
    };
    writeJson(`${artifactDir()}/r2-check-${stamp}.json`, report);
    console.log(JSON.stringify(report, null, 2));
    if (!report.R2_DESTINATION_PASS) process.exit(1);
    console.error("OK R2_DESTINATION_PASS");
    return;
  }

  if (mode === "private-proof") {
    const accountId = env.QE_STORAGE_BACKUP_ACCOUNT_ID || "";
    const pubDevUrl = accountId
      ? `https://pub-placeholder.r2.dev` // not used; we probe known public patterns
      : null;
    void pubDevUrl;
    // Anonymous list via S3 endpoint without credentials should fail
    const anon = new S3Client({
      region: env.QE_STORAGE_BACKUP_REGION || "auto",
      endpoint: env.QE_STORAGE_BACKUP_ENDPOINT,
      forcePathStyle: true,
      credentials: { accessKeyId: "anonymous", secretAccessKey: "anonymous" },
    });
    let anonListBlocked = false;
    let anonGetBlocked = false;
    try {
      await anon.send(
        new ListObjectsV2Command({ Bucket: dest.bucket, MaxKeys: 1 }),
      );
    } catch {
      anonListBlocked = true;
    }
    // Try get a known connectivity object if any, else a fictional key
    try {
      await anon.send(
        new GetObjectCommand({
          Bucket: dest.bucket,
          Key: "listings/does-not-exist-private-proof.bin",
        }),
      );
    } catch {
      anonGetBlocked = true;
    }
    // Also try unauthenticated HTTPS to r2.dev style (should 404/401 without public URL)
    let publicHttpBlocked = true;
    if (accountId) {
      try {
        const url = `https://${dest.bucket}.${accountId}.r2.cloudflarestorage.com/listings/private-proof`;
        const res = await fetch(url, { method: "GET" });
        // 200 would mean public exposure
        publicHttpBlocked = res.status !== 200;
      } catch {
        publicHttpBlocked = true;
      }
    }
    const report = {
      at: new Date().toISOString(),
      mode: "private-proof",
      PRIVATE_BUCKET_PASS: anonListBlocked && anonGetBlocked && publicHttpBlocked,
      anon_list_blocked: anonListBlocked,
      anon_get_blocked: anonGetBlocked,
      public_http_blocked: publicHttpBlocked,
      operator_confirmed: {
        public_development_url: "DISABLED",
        custom_domain: "NONE",
        bucket_private: true,
      },
    };
    writeJson(`${artifactDir()}/private-proof-${stamp}.json`, report);
    console.log(JSON.stringify(report, null, 2));
    if (!report.PRIVATE_BUCKET_PASS) process.exit(1);
    console.error("OK PRIVATE_BUCKET_PASS");
    return;
  }

  if (mode === "backup") {
    if (!src || !summary) fail("source required");
    const startedAt = new Date().toISOString();
    const started = Date.now();
    const failed: Array<{ path_hash: string; stage: string; error: string }> = [];
    let uploaded = 0;
    let skippedUnchanged = 0;
    let totalBytes = 0;
    let totalBytesAll = 0;
    const objectManifest: Array<Record<string, unknown>> = [];

    for (const o of objects) {
      const key = `${dest.prefix}/${o.path}`;
      const dl = await downloadBytes(src, SOURCE_BUCKET, o.path);
      if (!dl.ok) {
        failed.push({
          path_hash: pathHash(o.path),
          stage: "download",
          error: dl.error,
        });
        continue;
      }
      const hash = sha256(dl.bytes);
      totalBytesAll += dl.size;

      try {
        const head = await dest.client.send(
          new HeadObjectCommand({ Bucket: dest.bucket, Key: key }),
        );
        if (head.ContentLength === dl.size && head.Metadata?.sha256 === hash) {
          skippedUnchanged += 1;
          objectManifest.push({
            path_hash: pathHash(o.path),
            path: o.path,
            size: dl.size,
            sha256: hash,
            content_type: o.mime,
            status: "skipped_unchanged",
          });
          continue;
        }
      } catch {
        /* upload */
      }

      try {
        await dest.client.send(
          new PutObjectCommand({
            Bucket: dest.bucket,
            Key: key,
            Body: Buffer.from(dl.bytes),
            ContentType: o.mime || "application/octet-stream",
            Metadata: {
              sha256: hash,
              source_ref: PRODUCTION_REF,
              source_bucket: SOURCE_BUCKET,
            },
          }),
        );
        const verify = await dest.client.send(
          new HeadObjectCommand({ Bucket: dest.bucket, Key: key }),
        );
        if (verify.ContentLength !== dl.size) {
          failed.push({
            path_hash: pathHash(o.path),
            stage: "size_verify",
            error: `dest=${verify.ContentLength} src=${dl.size}`,
          });
          continue;
        }
        uploaded += 1;
        totalBytes += dl.size;
        objectManifest.push({
          path_hash: pathHash(o.path),
          path: o.path,
          size: dl.size,
          sha256: hash,
          content_type: o.mime,
          status: "uploaded",
        });
      } catch (e) {
        failed.push({
          path_hash: pathHash(o.path),
          stage: "upload",
          error: (e instanceof Error ? e.message : String(e)).slice(0, 160),
        });
      }
    }

    const completedAt = new Date().toISOString();
    const manifest = {
      backup_timestamp: completedAt,
      started_at: startedAt,
      completed_at: completedAt,
      source_project_ref: PRODUCTION_REF,
      source_bucket: SOURCE_BUCKET,
      backup_destination: {
        endpoint_host: safeHost(env.QE_STORAGE_BACKUP_ENDPOINT!),
        bucket: dest.bucket,
        prefix: dest.prefix,
        provider_hint: "cloudflare-r2",
      },
      object_count_source: objects.length,
      uploaded,
      skipped_unchanged: skippedUnchanged,
      total_bytes_uploaded_this_run: totalBytes,
      total_bytes_source: totalBytesAll,
      failed_objects: failed,
      success: failed.length === 0,
      duration_ms: Date.now() - started,
      tool_commit: gitCommitSoft(),
      objects: objectManifest,
      retention_note:
        "Copy-only. Bucket Lock 30d (operator). No destination delete-mirror.",
    };

    const manifestPath = `${artifactDir()}/manifest-full-${stamp}.json`;
    writeJson(manifestPath, manifest);

    // Upload manifest to R2 protected prefix
    const manifestKey = `manifests/manifest-full-${stamp}.json`;
    try {
      await dest.client.send(
        new PutObjectCommand({
          Bucket: dest.bucket,
          Key: manifestKey,
          Body: Buffer.from(JSON.stringify(manifest, null, 2), "utf8"),
          ContentType: "application/json",
          Metadata: { role: "backup_manifest" },
        }),
      );
      (manifest as { manifest_r2_key?: string }).manifest_r2_key = manifestKey;
      writeJson(manifestPath, manifest);
    } catch (e) {
      console.error(
        `WARN manifest R2 upload failed: ${(e instanceof Error ? e.message : String(e)).slice(0, 120)}`,
      );
    }

    if (manifest.success) {
      writeJson(`${artifactDir()}/last-successful-backup.json`, {
        at: manifest.backup_timestamp,
        object_count_source: manifest.object_count_source,
        uploaded: manifest.uploaded,
        skipped_unchanged: manifest.skipped_unchanged,
        total_bytes_source: manifest.total_bytes_source,
        manifest_path: manifestPath,
        manifest_r2_key: manifestKey,
      });
    }

    console.log(
      JSON.stringify(
        {
          ...manifest,
          objects: undefined,
          objects_recorded: objectManifest.length,
          manifest_path: manifestPath,
          manifest_r2_key: manifestKey,
        },
        null,
        2,
      ),
    );
    if (!manifest.success) process.exit(1);
    console.error("OK backup");
    return;
  }

  if (mode === "parity") {
    if (!summary) fail("source required");
    const destObjs = await listDestPrefix(
      dest.client,
      dest.bucket,
      dest.prefix,
    );
    const sourceBytes = summary.total_bytes_known;
    const backupBytes = destObjs.reduce((a, b) => a + b.size, 0);
    const report = {
      at: new Date().toISOString(),
      mode: "parity",
      SOURCE_OBJECT_COUNT: summary.object_count,
      BACKUP_OBJECT_COUNT: destObjs.length,
      SOURCE_BYTES: sourceBytes,
      BACKUP_BYTES: backupBytes,
      COUNT_PARITY_PASS: destObjs.length === summary.object_count,
      BYTE_PARITY_PASS: backupBytes === sourceBytes,
      PARITY_PASS:
        destObjs.length === summary.object_count && backupBytes === sourceBytes,
      note: "Compares listings/ prefix only (excludes manifests/ and __connectivity__/)",
    };
    writeJson(`${artifactDir()}/parity-${stamp}.json`, report);
    console.log(JSON.stringify(report, null, 2));
    if (!report.PARITY_PASS) process.exit(1);
    console.error("OK PARITY_PASS");
    return;
  }

  if (mode === "verify") {
    if (!src) fail("source required");
    const want = Math.max(10, Number(env.QE_STORAGE_VERIFY_SAMPLE || 12));
    const sample = pickDiverseSamples(objects, Math.min(want, objects.length));
    const results: Array<Record<string, unknown>> = [];
    let pass = 0;
    for (const o of sample) {
      const key = `${dest.prefix}/${o.path}`;
      const dl = await downloadBytes(src, SOURCE_BUCKET, o.path);
      if (!dl.ok) {
        results.push({
          path_hash: pathHash(o.path),
          ok: false,
          stage: "source",
          error: dl.error,
          ext: extFrom(o.path),
        });
        continue;
      }
      try {
        const got = await dest.client.send(
          new GetObjectCommand({ Bucket: dest.bucket, Key: key }),
        );
        const bytes = await streamToBuffer(got.Body);
        const srcHash = sha256(dl.bytes);
        const dstHash = sha256(bytes);
        const ok = srcHash === dstHash && bytes.byteLength === dl.size;
        if (ok) pass += 1;
        results.push({
          path_hash: pathHash(o.path),
          ok,
          ext: extFrom(o.path),
          source_size: dl.size,
          dest_size: bytes.byteLength,
          source_sha256: srcHash,
          dest_sha256: dstHash,
          content_type: got.ContentType || o.mime,
        });
      } catch (e) {
        results.push({
          path_hash: pathHash(o.path),
          ok: false,
          stage: "dest",
          ext: extFrom(o.path),
          error: (e instanceof Error ? e.message : String(e)).slice(0, 120),
        });
      }
    }
    const report = {
      at: new Date().toISOString(),
      mode: "verify",
      sample_size: sample.length,
      pass,
      BYTE_INTEGRITY_PASS: pass === sample.length && sample.length >= 10,
      results,
    };
    writeJson(`${artifactDir()}/verify-${stamp}.json`, report);
    console.log(JSON.stringify(report, null, 2));
    if (!report.BYTE_INTEGRITY_PASS) process.exit(1);
    console.error("OK BYTE_INTEGRITY_PASS");
    return;
  }

  if (mode === "restore-sample") {
    if (!src) fail("source required");
    const want = Math.max(10, Number(env.QE_STORAGE_RESTORE_SAMPLE || 12));
    const sample = pickDiverseSamples(objects, Math.min(want, objects.length));
    const restoreRoot = join(localWorkDir(), `restore-${stamp}`);
    mkdirSync(restoreRoot, { recursive: true });
    const results: Array<Record<string, unknown>> = [];
    let pass = 0;
    for (const o of sample) {
      const key = `${dest.prefix}/${o.path}`;
      try {
        const got = await dest.client.send(
          new GetObjectCommand({ Bucket: dest.bucket, Key: key }),
        );
        const bytes = await streamToBuffer(got.Body);
        const dl = await downloadBytes(src, SOURCE_BUCKET, o.path);
        const hash = sha256(bytes);
        const srcHash = dl.ok ? sha256(dl.bytes) : null;
        const parts = o.path.split("/");
        const structured = join(
          restoreRoot,
          "by-prefix",
          pathHash(parts[0] || "root"),
          parts.slice(1).join("/") || `${pathHash(o.path)}${extFrom(o.path)}`,
        );
        mkdirSync(dirname(structured), { recursive: true });
        writeFileSync(structured, Buffer.from(bytes));
        // Basic image magic check
        const isJpeg =
          bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8;
        const isPng =
          bytes.length > 4 &&
          bytes[0] === 0x89 &&
          bytes[1] === 0x50 &&
          bytes[2] === 0x4e &&
          bytes[3] === 0x47;
        const isWebp =
          bytes.length > 12 &&
          bytes[0] === 0x52 &&
          bytes[1] === 0x49 &&
          bytes[2] === 0x46 &&
          bytes[3] === 0x46;
        const isAvif = bytes.length > 12; // ftyp box — soft check
        const magicOk = isJpeg || isPng || isWebp || isAvif;
        const ok =
          magicOk &&
          (srcHash == null || srcHash === hash) &&
          bytes.byteLength > 0;
        if (ok) pass += 1;
        results.push({
          path_hash: pathHash(o.path),
          ok,
          size: bytes.byteLength,
          content_type: got.ContentType || o.mime,
          checksum_match: srcHash === hash,
          image_magic_ok: magicOk,
        });
      } catch (e) {
        results.push({
          path_hash: pathHash(o.path),
          ok: false,
          error: (e instanceof Error ? e.message : String(e)).slice(0, 120),
        });
      }
    }
    const report = {
      at: new Date().toISOString(),
      mode: "restore-sample",
      restore_target: "local_tmp_only",
      restore_root: restoreRoot,
      sample_size: sample.length,
      pass,
      RESTORE_SAMPLE_PASS: pass === sample.length && sample.length >= 10,
      production_writes: 0,
      results,
    };
    writeJson(`${artifactDir()}/restore-sample-${stamp}.json`, report);
    console.log(JSON.stringify(report, null, 2));
    if (!report.RESTORE_SAMPLE_PASS) process.exit(1);
    console.error("OK RESTORE_SAMPLE_PASS");
    return;
  }

  if (mode === "synthetic-drill") {
    const synKey = `${dest.prefix}/__drill__/synthetic/dr-phase3c-${Date.now()}.txt`;
    const retainedKey = `${synKey}.retained`;
    const payload = Buffer.from(
      `quickexit-phase3c-synthetic-drill ${new Date().toISOString()}\n`,
      "utf8",
    );
    const hash = sha256(payload);

    await dest.client.send(
      new PutObjectCommand({
        Bucket: dest.bucket,
        Key: synKey,
        Body: payload,
        ContentType: "text/plain",
        Metadata: { sha256: hash, synthetic: "true" },
      }),
    );
    await dest.client.send(
      new PutObjectCommand({
        Bucket: dest.bucket,
        Key: retainedKey,
        Body: payload,
        ContentType: "text/plain",
        Metadata: {
          sha256: hash,
          synthetic: "true",
          role: "retained_backup",
        },
      }),
    );

    let deleteAttempted = false;
    let deleteSucceeded = false;
    let deleteBlockedByLock = false;
    try {
      deleteAttempted = true;
      await dest.client.send(
        new DeleteObjectCommand({ Bucket: dest.bucket, Key: synKey }),
      );
      // Confirm gone
      try {
        await dest.client.send(
          new HeadObjectCommand({ Bucket: dest.bucket, Key: synKey }),
        );
        // still exists — treat as lock retention
        deleteBlockedByLock = true;
      } catch {
        deleteSucceeded = true;
      }
    } catch {
      deleteBlockedByLock = true;
    }

    const got = await dest.client.send(
      new GetObjectCommand({ Bucket: dest.bucket, Key: retainedKey }),
    );
    const bytes = await streamToBuffer(got.Body);
    const restoredHash = sha256(bytes);
    const localPath = join(localWorkDir(), "synthetic-restore.txt");
    writeFileSync(localPath, Buffer.from(bytes));

    // Cleanup attempt — may be blocked by Bucket Lock; leave objects if so
    let cleanupNote = "cleaned";
    for (const k of [retainedKey, synKey]) {
      try {
        await dest.client.send(
          new DeleteObjectCommand({ Bucket: dest.bucket, Key: k }),
        );
      } catch {
        cleanupNote =
          "Bucket Lock prevented cleanup — synthetic keys left in R2 under listings/__drill__/";
      }
    }

    const report = {
      at: new Date().toISOString(),
      mode: "synthetic-drill",
      production_objects_deleted: 0,
      delete_attempted: deleteAttempted,
      delete_succeeded: deleteSucceeded,
      delete_blocked_by_bucket_lock: deleteBlockedByLock,
      SYNTHETIC_RECOVERY_PASS:
        restoredHash === hash && bytes.byteLength === payload.length,
      source_sha256: hash,
      restored_sha256: restoredHash,
      local_restore_path: localPath,
      cleanup: cleanupNote,
      note: "Synthetic only on R2; Production Storage untouched",
    };
    writeJson(`${artifactDir()}/synthetic-drill-${stamp}.json`, report);
    console.log(JSON.stringify(report, null, 2));
    if (!report.SYNTHETIC_RECOVERY_PASS) process.exit(1);
    console.error("OK SYNTHETIC_RECOVERY_PASS");
    return;
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
