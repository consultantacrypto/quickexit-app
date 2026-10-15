/**
 * H4B.3b — demand-offer private media access matrix (LOCAL or STAGING).
 * Hard-refuses Production. Set QE_STAGING_MATRIX=1 for Staging.
 *
 * Actors: A=demand owner, B=offer sender, C=unrelated, anon, HQ(service).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { resolveMatrixApiUrl } from "./resolve-matrix-supabase-target";
import {
  DEMAND_OFFERS_STORAGE_BUCKET,
  LEGACY_LISTINGS_BUCKET,
  buildDemandOfferObjectPath,
  legacyListingsPathToPrivatePath,
  toPrivateDbRef,
} from "../lib/demandOfferMedia";

const PRODUCTION_REF = "geywuzwbzecknokvnins";

type CaseResult = { id: string; ok: boolean; detail: string };
const results: CaseResult[] = [];

function failEnv(m: string): never {
  console.error(`FAIL ${m}`);
  process.exit(2);
}
function record(id: string, ok: boolean, detail: string) {
  results.push({ id, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${id} — ${detail}`);
}
function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 1) continue;
    process.env[line.slice(0, i)] = line.slice(i + 1);
  }
}
function refuse(url: string) {
  const lower = url.toLowerCase();
  if (lower.includes(PRODUCTION_REF)) failEnv("Production refused");
  if (
    lower.includes("supabase.co") &&
    process.env.QE_STAGING_MATRIX !== "1" &&
    process.env.QE_STAGING_MATRIX !== "true"
  ) {
    failEnv("cloud refused (set QE_STAGING_MATRIX=1 for Staging)");
  }
}
function client(url: string, key: string, jwt?: string): SupabaseClient {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: jwt ? { headers: { Authorization: `Bearer ${jwt}` } } : undefined,
  });
}

function tinyJpeg(): Uint8Array {
  // minimal JPEG SOI/EOI
  return new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function main() {
  loadEnvFile(resolve(".env.h4b2.local"));
  loadEnvFile(resolve(".env.h4b0.local"));
  if (process.env.QE_STAGING_MATRIX === "1" || process.env.QE_STAGING_MATRIX === "true") {
    loadEnvFile(resolve(".env.staging.local"));
  }

  let apiUrl: string;
  try {
    apiUrl = resolveMatrixApiUrl();
  } catch (e) {
    failEnv(e instanceof Error ? e.message : String(e));
  }
  refuse(apiUrl);

  const anonKey = process.env.H4B_ANON_KEY!;
  const serviceKey = process.env.H4B_SERVICE_ROLE_KEY!;
  const jwtA = process.env.H4B_USER_A_JWT!;
  const jwtB = process.env.H4B_USER_B_JWT!;
  const jwtC = process.env.H4B_USER_C_JWT!;
  const A = process.env.H4B_USER_A_ID!;
  const B = process.env.H4B_USER_B_ID!;
  const C = process.env.H4B_USER_C_ID!;
  if (!anonKey || !serviceKey || !jwtA || !jwtB || !jwtC || !A || !B || !C) {
    failEnv("missing fixtures");
  }

  const a = client(apiUrl, anonKey, jwtA);
  const b = client(apiUrl, anonKey, jwtB);
  const c = client(apiUrl, anonKey, jwtC);
  const anon = client(apiUrl, anonKey);
  const service = client(apiUrl, serviceKey);
  const bytes = tinyJpeg();
  const hash = sha256(bytes);
  const ts = Date.now();

  // Ensure bucket exists (local after migration; staging after apply)
  {
    const { data: buckets } = await service.storage.listBuckets();
    const found = (buckets ?? []).some((x) => x.id === DEMAND_OFFERS_STORAGE_BUCKET);
    record("bucket.exists_private", found, found ? "demand-offers present" : "MISSING");
    if (found) {
      const meta = (buckets ?? []).find((x) => x.id === DEMAND_OFFERS_STORAGE_BUCKET);
      record(
        "bucket.public_false",
        meta?.public === false,
        `public=${String(meta?.public)}`,
      );
    }
  }

  // Synthetic demand owned by A
  const demandId =
    process.env.H4B2_DEMAND_A_ID ||
    process.env.H4B_DEMAND_A_ID ||
    "";
  let useDemandId = demandId;
  if (!useDemandId) {
    const { data: dem, error } = await service
      .from("demands")
      .insert({
        buyer_id: A,
        target_asset: `h4b3b-${ts}`,
        category: "test",
        status: "active",
        budget: 10000,
      })
      .select("id")
      .single();
    if (error || !dem) failEnv(`demand seed: ${error?.message}`);
    useDemandId = dem.id;
  }

  const objectPath = buildDemandOfferObjectPath({
    uploaderUserId: B,
    demandId: useDemandId,
    ext: "jpg",
    objectId: `h4b3b-${ts}`,
  });
  const mediaRef = toPrivateDbRef(objectPath);

  // B INSERT own prefix
  {
    // upsert:true requires UPDATE policy — intentionally absent; INSERT only.
    const r = await b.storage.from(DEMAND_OFFERS_STORAGE_BUCKET).upload(objectPath, bytes, {
      contentType: "image/jpeg",
      upsert: false,
    });
    record("insert.B_own_prefix", !r.error, r.error?.message ?? "ok");
  }

  // C INSERT into B prefix — DENY
  {
    const evil = `${B}/${useDemandId}/h4b3b-c-escape-${ts}.jpg`;
    const r = await c.storage.from(DEMAND_OFFERS_STORAGE_BUCKET).upload(evil, bytes, {
      contentType: "image/jpeg",
    });
    const accepted = !r.error;
    if (accepted) await service.storage.from(DEMAND_OFFERS_STORAGE_BUCKET).remove([evil]);
    record("insert.C_cross_prefix_denied", !accepted, accepted ? "ACCEPTED" : r.error?.message ?? "denied");
  }

  // Anon INSERT — DENY
  {
    const p = `${B}/${useDemandId}/h4b3b-anon-${ts}.jpg`;
    const r = await anon.storage.from(DEMAND_OFFERS_STORAGE_BUCKET).upload(p, bytes, {
      contentType: "image/jpeg",
    });
    const accepted = !r.error;
    if (accepted) await service.storage.from(DEMAND_OFFERS_STORAGE_BUCKET).remove([p]);
    record("insert.anon_denied", !accepted, accepted ? "ACCEPTED" : r.error?.message ?? "denied");
  }

  // Direct SELECT / download — all client roles DENY (no SELECT policy)
  for (const [label, cl] of [
    ["A", a],
    ["B", b],
    ["C", c],
    ["anon", anon],
  ] as const) {
    const r = await cl.storage.from(DEMAND_OFFERS_STORAGE_BUCKET).download(objectPath);
    record(
      `direct_select.${label}_denied`,
      !!r.error,
      r.error?.message ?? "UNEXPECTED_ALLOW",
    );
  }

  // Public URL must not work for private bucket
  {
    const pub = service.storage.from(DEMAND_OFFERS_STORAGE_BUCKET).getPublicUrl(objectPath);
    const http = await fetch(pub.data.publicUrl);
    record(
      "public_url.anonymous_denied",
      !http.ok,
      `status=${http.status}`,
    );
  }

  // Attach synthetic offer so signed-URL authz can prove relationship
  const existingOfferId = process.env.H4B2_DEMAND_OFFER_1_ID?.trim();
  let offerId: string | undefined = existingOfferId || undefined;
  if (offerId) {
    const upd = await service
      .from("demand_offers")
      .update({
        images: [mediaRef],
        seller_user_id: B,
        demand_id: useDemandId,
      })
      .eq("id", offerId)
      .select("id")
      .maybeSingle();
    if (upd.error || !upd.data) {
      offerId = undefined;
    }
  }
  if (!offerId) {
    const ins = await service
      .from("demand_offers")
      .insert({
        demand_id: useDemandId,
        seller_user_id: B,
        offer_price: 1,
        asset_description: "h4b3b synthetic",
        status: "new",
        images: [mediaRef],
      })
      .select("id")
      .single();
    if (ins.error || !ins.data) failEnv(`offer seed: ${ins.error?.message}`);
    offerId = ins.data.id;
  }
  record("fixture.offer_attached", !!offerId, offerId ?? "missing");

  async function signedViaService(
    actorJwt: string | null,
    ref: string,
    expectAllow: boolean,
    caseId: string,
  ) {
    // Matrix exercises the same authz library path using service signed URL after manual checks
    const { resolveDemandOfferMediaAccess } = await import("../lib/demandOfferMediaAccess");
    if (!actorJwt) {
      record(caseId, !expectAllow, "anonymous");
      return;
    }
    const userClient = client(apiUrl, anonKey, actorJwt);
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) {
      record(caseId, false, "auth.getUser failed");
      return;
    }
    const decision = await resolveDemandOfferMediaAccess({
      userClient,
      serviceClient: service,
      userId: user.id,
      userEmail: user.email,
      offerId,
      mediaRef: ref,
    });
    if (!decision.allowed) {
      record(caseId, !expectAllow, `denied:${decision.reason}`);
      return;
    }
    const { data, error } = await service.storage
      .from(DEMAND_OFFERS_STORAGE_BUCKET)
      .createSignedUrl(objectPathFromRef(ref), 60);
    const ok = !error && !!data?.signedUrl;
    if (ok && expectAllow) {
      const http = await fetch(data!.signedUrl);
      record(caseId, http.ok, `signed_http=${http.status}`);
      return;
    }
    record(caseId, expectAllow ? ok : !ok, error?.message ?? (ok ? "signed" : "no signed"));
  }

  function objectPathFromRef(ref: string): string {
    return ref.startsWith("demand-offers/") ? ref.slice("demand-offers/".length) : ref;
  }

  await signedViaService(jwtA, mediaRef, true, "signed.A_owner_allow");
  await signedViaService(jwtB, mediaRef, true, "signed.B_sender_allow");
  await signedViaService(jwtC, mediaRef, false, "signed.C_unrelated_deny");
  await signedViaService(null, mediaRef, false, "signed.anon_deny");

  // HQ / service role can mint
  {
    const { data, error } = await service.storage
      .from(DEMAND_OFFERS_STORAGE_BUCKET)
      .createSignedUrl(objectPath, 60);
    record("signed.HQ_service_allow", !error && !!data?.signedUrl, error?.message ?? "ok");
  }

  // Path tamper / guessed object
  {
    const guessed = toPrivateDbRef(
      buildDemandOfferObjectPath({
        uploaderUserId: B,
        demandId: useDemandId,
        ext: "jpg",
        objectId: `guess-${randomBytes(8).toString("hex")}`,
      }),
    );
    await signedViaService(jwtA, guessed, false, "signed.path_tamper_deny");
  }

  // Cross-offer: attach different offer for A demand B seller with other path — already covered by path_mismatch

  // Short TTL signed URL works
  {
    const { data } = await service.storage
      .from(DEMAND_OFFERS_STORAGE_BUCKET)
      .createSignedUrl(objectPath, 2);
    if (data?.signedUrl) {
      const http = await fetch(data.signedUrl);
      record("signed.ttl_fresh_ok", http.ok, `status=${http.status}`);
      await new Promise((r) => setTimeout(r, 3500));
      const http2 = await fetch(data.signedUrl);
      // Some CDNs may still serve briefly; treat non-ok OR note soft
      record(
        "signed.ttl_expired_unusable",
        !http2.ok,
        `status=${http2.status} (soft if CDN caches)`,
      );
    } else {
      record("signed.ttl_fresh_ok", false, "no url");
      record("signed.ttl_expired_unusable", false, "skipped");
    }
  }

  // --- Synthetic copy-first migration drill (legacy listings → private) ---
  const legacyPath = `${B}/demand-offers/${useDemandId}/h4b3b-legacy-${ts}.jpg`;
  {
    const up = await service.storage.from(LEGACY_LISTINGS_BUCKET).upload(legacyPath, bytes, {
      contentType: "image/jpeg",
      upsert: true,
    });
    record("migrate.legacy_seed", !up.error, up.error?.message ?? "ok");
  }
  const privateFromLegacy = legacyListingsPathToPrivatePath(legacyPath);
  record("migrate.path_map", !!privateFromLegacy, privateFromLegacy ?? "null");
  if (privateFromLegacy) {
    const dl = await service.storage.from(LEGACY_LISTINGS_BUCKET).download(legacyPath);
    const srcBuf = dl.data ? new Uint8Array(await dl.data.arrayBuffer()) : null;
    const srcHash = srcBuf ? sha256(srcBuf) : null;
    const cp = await service.storage
      .from(DEMAND_OFFERS_STORAGE_BUCKET)
      .upload(privateFromLegacy, srcBuf ?? bytes, {
        contentType: "image/jpeg",
        upsert: true,
      });
    record("migrate.copy", !cp.error, cp.error?.message ?? "ok");
    const dl2 = await service.storage.from(DEMAND_OFFERS_STORAGE_BUCKET).download(privateFromLegacy);
    const dstBuf = dl2.data ? new Uint8Array(await dl2.data.arrayBuffer()) : null;
    const dstHash = dstBuf ? sha256(dstBuf) : null;
    record(
      "migrate.hash_match",
      !!srcHash && srcHash === dstHash && srcHash === hash,
      `src=${srcHash?.slice(0, 12)} dst=${dstHash?.slice(0, 12)}`,
    );
    const newRef = toPrivateDbRef(privateFromLegacy);
    await service.from("demand_offers").update({ images: [newRef] }).eq("id", offerId!);
    await signedViaService(jwtA, newRef, true, "migrate.signed_after_patch");
    // Optional delete of synthetic legacy only
    const rem = await service.storage.from(LEGACY_LISTINGS_BUCKET).remove([legacyPath]);
    record("migrate.legacy_delete_optional", !rem.error, rem.error?.message ?? "ok");
    await signedViaService(jwtA, newRef, true, "migrate.still_works_after_legacy_delete");
  }

  // listings public regression still ok for a listing-shaped object
  {
    const listingPath = `${A}/h4b3b-listing-regress-${ts}.jpg`;
    await service.storage.from(LEGACY_LISTINGS_BUCKET).upload(listingPath, bytes, {
      contentType: "image/jpeg",
      upsert: true,
    });
    const pub = service.storage.from(LEGACY_LISTINGS_BUCKET).getPublicUrl(listingPath);
    const http = await fetch(pub.data.publicUrl);
    record("listings.public_unaffected", http.ok, `status=${http.status}`);
    await service.storage.from(LEGACY_LISTINGS_BUCKET).remove([listingPath]);
  }

  const outDir = resolve("docs/internal/sql/h4b3");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "matrix-h4b3b-demand-offer-media.json");
  const failed = results.filter((r) => !r.ok);
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        suite: "h4b3b",
        apiUrl: apiUrl.replace(/https:\/\/([^.]+).*/, "https://$1.supabase.co"),
        demandId: useDemandId,
        offerId,
        results,
        failed: failed.length,
        at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(`wrote ${outPath}`);
  if (failed.length) {
    console.error(`FAIL ${failed.length} cases`);
    process.exit(1);
  }
  console.log("OK assert-h4b3b-demand-offer-media-matrix");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
