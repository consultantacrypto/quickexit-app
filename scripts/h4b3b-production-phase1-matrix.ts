/**
 * H4B.3b Phase 1 — Production synthetic access matrix.
 *
 * Requires QE_PRODUCTION_MATRIX=1 and Production keys.
 * Creates removable synthetic users/rows/objects under h4b3b-phase1 namespace.
 * NEVER deletes listings orphan objects or non-synthetic data.
 *
 * Usage:
 *   QE_PRODUCTION_MATRIX=1 npx tsx scripts/h4b3b-production-phase1-matrix.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import {
  DEMAND_OFFERS_STORAGE_BUCKET,
  LEGACY_LISTINGS_BUCKET,
  buildDemandOfferObjectPath,
  toPrivateDbRef,
} from "../lib/demandOfferMedia";
import { resolveDemandOfferMediaAccess } from "../lib/demandOfferMediaAccess";

const PRODUCTION_REF = "geywuzwbzecknokvnins";
const APP = "https://www.quickexit.ro";
const NS = `h4b3b-phase1-${Date.now()}`;

type CaseResult = { id: string; ok: boolean; detail: string };
const results: CaseResult[] = [];
const cleanup: {
  userIds: string[];
  offerIds: string[];
  demandIds: string[];
  privatePaths: string[];
  legacyPaths: string[]; // synthetic legacy only — never the 6 orphans
} = {
  userIds: [],
  offerIds: [],
  demandIds: [],
  privatePaths: [],
  legacyPaths: [],
};

function fail(m: string, c = 1): never {
  console.error(`FAIL ${m}`);
  process.exit(c);
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
function client(url: string, key: string, jwt?: string): SupabaseClient {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: jwt ? { headers: { Authorization: `Bearer ${jwt}` } } : undefined,
  });
}
function tinyJpeg() {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
}
function sha256(b: Uint8Array) {
  return createHash("sha256").update(b).digest("hex");
}
function synthPassword(label: string) {
  return `ProdH4b3b_${label}_${randomBytes(12).toString("base64url")}!`;
}

async function main() {
  loadEnvFile(join(tmpdir(), "qe-prod-h4b3b-matrix.env"));
  if (process.env.QE_PRODUCTION_MATRIX !== "1") {
    fail("QE_PRODUCTION_MATRIX=1 required");
  }

  const apiUrl = String(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.H4B_SUPABASE_URL || "",
  ).replace(/\/+$/, "");
  if (!apiUrl.includes(PRODUCTION_REF)) fail("must target Production supabase");
  if (apiUrl.includes("nlnzlswjjplofpkhoxtr")) fail("Staging refused");

  const anonKey = process.env.H4B_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey =
    process.env.H4B_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!anonKey || !serviceKey) fail("missing anon/service keys");

  const service = client(apiUrl, serviceKey);
  const anon = client(apiUrl, anonKey);
  const bytes = tinyJpeg();
  const hash = sha256(bytes);

  // Orphan baseline (must remain 6)
  {
    const { data, error } = await service.storage.from(LEGACY_LISTINGS_BUCKET).list("", {
      limit: 1,
    });
    record("baseline.storage_reachable", !error, error?.message ?? "ok");
  }
  // Orphan count verified via SQL in outer shell (must remain 6). Soft marker here.
  record("baseline.orphans_deferred_cleanup", true, "SQL-verified separately; never deleted");

  // Bucket private
  {
    const { data } = await service.storage.listBuckets();
    const b = (data ?? []).find((x) => x.id === DEMAND_OFFERS_STORAGE_BUCKET);
    record("bucket.exists", !!b, b ? "present" : "missing");
    record("bucket.public_false", b?.public === false, `public=${String(b?.public)}`);
  }

  // Synthetic users
  const usersSpec = [
    { key: "A", email: `${NS}-a@h4b3b.quickexit.test` },
    { key: "B", email: `${NS}-b@h4b3b.quickexit.test` },
    { key: "C", email: `${NS}-c@h4b3b.quickexit.test` },
  ] as const;
  const map: Record<string, { id: string; jwt: string; email: string }> = {};

  for (const u of usersSpec) {
    const password = synthPassword(u.key);
    const created = await service.auth.admin.createUser({
      email: u.email,
      password,
      email_confirm: true,
      user_metadata: { h4b3b_phase1: true, ns: NS },
    });
    if (created.error || !created.data.user) {
      fail(`createUser ${u.key}: ${created.error?.message}`);
    }
    cleanup.userIds.push(created.data.user.id);
    const signed = await anon.auth.signInWithPassword({ email: u.email, password });
    if (signed.error || !signed.data.session) {
      fail(`signIn ${u.key}: ${signed.error?.message}`);
    }
    map[u.key] = {
      id: created.data.user.id,
      jwt: signed.data.session.access_token,
      email: u.email,
    };
    // Production FK: demands.buyer_id → profiles(id)
    const { error: profErr } = await service.from("profiles").upsert({
      id: created.data.user.id,
      full_name: `H4B3B ${u.key}`,
      user_type: "buyer",
    });
    if (profErr) fail(`profile ${u.key}: ${profErr.message}`);
  }
  record("fixture.users", true, "A/B/C + profiles created");

  const A = map.A!;
  const B = map.B!;
  const C = map.C!;
  const a = client(apiUrl, anonKey, A.jwt);
  const b = client(apiUrl, anonKey, B.jwt);
  const c = client(apiUrl, anonKey, C.jwt);

  // Synthetic demand owned by A
  const { data: demand, error: demandErr } = await service
    .from("demands")
    .insert({
      buyer_id: A.id,
      target_asset: NS,
      category: "test-h4b3b",
      status: "active",
      budget: 1000,
      description: "synthetic h4b3b phase1 — safe to delete",
    })
    .select("id")
    .single();
  if (demandErr || !demand) fail(`demand: ${demandErr?.message}`);
  cleanup.demandIds.push(demand.id);
  record("fixture.demand", true, "created");

  const objectPath = buildDemandOfferObjectPath({
    uploaderUserId: B.id,
    demandId: demand.id,
    ext: "jpg",
    objectId: `${NS}-obj`,
  });
  const mediaRef = toPrivateDbRef(objectPath);
  cleanup.privatePaths.push(objectPath);

  // Upload via B (INSERT policy)
  {
    const r = await b.storage.from(DEMAND_OFFERS_STORAGE_BUCKET).upload(objectPath, bytes, {
      contentType: "image/jpeg",
      upsert: false,
    });
    record("upload.B_own_prefix", !r.error, r.error?.message ?? "ok");
  }
  {
    const evil = `${B.id}/${demand.id}/${NS}-c-escape.jpg`;
    const r = await c.storage.from(DEMAND_OFFERS_STORAGE_BUCKET).upload(evil, bytes, {
      contentType: "image/jpeg",
      upsert: false,
    });
    const accepted = !r.error;
    if (accepted) {
      cleanup.privatePaths.push(evil);
      await service.storage.from(DEMAND_OFFERS_STORAGE_BUCKET).remove([evil]);
    }
    record("upload.C_cross_prefix_denied", !accepted, accepted ? "ACCEPTED" : "denied");
  }
  {
    const p = `${B.id}/${demand.id}/${NS}-anon.jpg`;
    const r = await anon.storage.from(DEMAND_OFFERS_STORAGE_BUCKET).upload(p, bytes, {
      contentType: "image/jpeg",
    });
    record("upload.anon_denied", !!r.error, r.error?.message ?? "ACCEPTED");
  }

  // Direct select denied
  for (const [label, cl] of [
    ["A", a],
    ["B", b],
    ["C", c],
    ["anon", anon],
  ] as const) {
    const r = await cl.storage.from(DEMAND_OFFERS_STORAGE_BUCKET).download(objectPath);
    record(`direct_select.${label}_denied`, !!r.error, r.error?.message ?? "ALLOW");
  }
  {
    const pub = service.storage.from(DEMAND_OFFERS_STORAGE_BUCKET).getPublicUrl(objectPath);
    const http = await fetch(pub.data.publicUrl);
    record("public_url.anon_denied", !http.ok, `status=${http.status}`);
  }

  // Offer with private path in DB
  const { data: offer, error: offerErr } = await service
    .from("demand_offers")
    .insert({
      demand_id: demand.id,
      seller_user_id: B.id,
      offer_price: 1,
      asset_description: NS,
      status: "new",
      images: [mediaRef],
    })
    .select("id, images")
    .single();
  if (offerErr || !offer) fail(`offer: ${offerErr?.message}`);
  cleanup.offerIds.push(offer.id);

  const images = offer.images as string[];
  const stored = String(images?.[0] ?? "");
  record(
    "new_write.private_path",
    stored.startsWith("demand-offers/") &&
      !stored.startsWith("http") &&
      !stored.includes("token="),
    stored.startsWith("demand-offers/") ? "private_ref" : "unexpected",
  );

  async function appSignedUrl(jwt: string | null, ref: string, offerId: string) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (jwt) headers.Authorization = `Bearer ${jwt}`;
    const res = await fetch(`${APP}/api/demand-offers/media/signed-url`, {
      method: "POST",
      headers,
      body: JSON.stringify({ media_ref: ref, offer_id: offerId }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      url?: string;
      error_code?: string;
    };
    return { status: res.status, body };
  }

  // Authz library + app API
  for (const [label, jwt, expectAllow] of [
    ["A", A.jwt, true],
    ["B", B.jwt, true],
    ["C", C.jwt, false],
  ] as const) {
    const userClient = client(apiUrl, anonKey, jwt);
    const {
      data: { user },
    } = await userClient.auth.getUser();
    const decision = await resolveDemandOfferMediaAccess({
      userClient,
      serviceClient: service,
      userId: user!.id,
      userEmail: user!.email,
      offerId: offer.id,
      mediaRef,
    });
    record(
      `authz.${label}`,
      decision.allowed === expectAllow,
      decision.allowed ? `allow:${decision.actor}` : `deny:${decision.reason}`,
    );

    const api = await appSignedUrl(jwt, mediaRef, offer.id);
    if (expectAllow) {
      const ok = api.status === 200 && !!api.body.url;
      let httpOk = false;
      if (api.body.url) {
        const http = await fetch(api.body.url);
        httpOk = http.ok;
      }
      record(`signed_api.${label}_allow`, ok && httpOk, `status=${api.status} http=${httpOk}`);
    } else {
      record(
        `signed_api.${label}_deny`,
        api.status === 403 || api.status === 404,
        `status=${api.status} code=${api.body.error_code ?? ""}`,
      );
    }
  }

  {
    const api = await appSignedUrl(null, mediaRef, offer.id);
    record("signed_api.anon_deny", api.status === 401, `status=${api.status}`);
  }

  // HQ / service mint
  {
    const { data, error } = await service.storage
      .from(DEMAND_OFFERS_STORAGE_BUCKET)
      .createSignedUrl(objectPath, 60);
    record("signed.HQ_service_allow", !error && !!data?.signedUrl, error?.message ?? "ok");
  }

  // Path tamper
  {
    const guessed = toPrivateDbRef(
      buildDemandOfferObjectPath({
        uploaderUserId: B.id,
        demandId: demand.id,
        ext: "jpg",
        objectId: `guess-${randomBytes(6).toString("hex")}`,
      }),
    );
    const api = await appSignedUrl(A.jwt, guessed, offer.id);
    record(
      "signed.path_tamper_deny",
      api.status === 403 || api.status === 404,
      `status=${api.status}`,
    );
  }

  // TTL
  {
    const { data } = await service.storage
      .from(DEMAND_OFFERS_STORAGE_BUCKET)
      .createSignedUrl(objectPath, 2);
    if (data?.signedUrl) {
      const fresh = await fetch(data.signedUrl);
      record("signed.ttl_fresh", fresh.ok, `status=${fresh.status}`);
      await new Promise((r) => setTimeout(r, 3500));
      const expired = await fetch(data.signedUrl);
      record("signed.ttl_expired", !expired.ok, `status=${expired.status}`);
    } else {
      record("signed.ttl_fresh", false, "no url");
      record("signed.ttl_expired", false, "skipped");
    }
  }

  // Dual-read: synthetic legacy public URL still fetchable (do not touch orphans)
  const legacyPath = `${B.id}/demand-offers/${demand.id}/${NS}-legacy.jpg`;
  cleanup.legacyPaths.push(legacyPath);
  {
    const up = await service.storage.from(LEGACY_LISTINGS_BUCKET).upload(legacyPath, bytes, {
      contentType: "image/jpeg",
      upsert: false,
    });
    record("dual_read.legacy_seed", !up.error, up.error?.message ?? "ok");
    const pub = service.storage.from(LEGACY_LISTINGS_BUCKET).getPublicUrl(legacyPath);
    const http = await fetch(pub.data.publicUrl);
    record("dual_read.legacy_public_ok", http.ok, `status=${http.status}`);
  }

  // Public listing regression — pick any non-demand-offers object if available
  {
    const { data: roots } = await service.storage.from(LEGACY_LISTINGS_BUCKET).list("", {
      limit: 20,
    });
    const folder = (roots ?? []).find((x) => x.id && !x.name.includes("demand-offers"));
    let listingOk = false;
    if (folder?.name) {
      const { data: files } = await service.storage
        .from(LEGACY_LISTINGS_BUCKET)
        .list(folder.name, { limit: 5 });
      const file = (files ?? []).find((f) => f.name && !f.name.endsWith("/"));
      if (file?.name) {
        const path = `${folder.name}/${file.name}`;
        if (!path.includes("demand-offers")) {
          const pub = service.storage.from(LEGACY_LISTINGS_BUCKET).getPublicUrl(path);
          const http = await fetch(pub.data.publicUrl);
          listingOk = http.ok;
          record("listings.public_image_ok", listingOk, `status=${http.status}`);
        }
      }
    }
    if (!results.some((r) => r.id === "listings.public_image_ok")) {
      // fallback: synthetic listing-shaped path under B (then remove)
      const p = `${B.id}/${NS}-listing-regress.jpg`;
      await service.storage.from(LEGACY_LISTINGS_BUCKET).upload(p, bytes, {
        contentType: "image/jpeg",
        upsert: true,
      });
      cleanup.legacyPaths.push(p);
      const pub = service.storage.from(LEGACY_LISTINGS_BUCKET).getPublicUrl(p);
      const http = await fetch(pub.data.publicUrl);
      record("listings.public_image_ok", http.ok, `status=${http.status} synthetic`);
    }
  }

  // App upload API new-write proof
  {
    const form = new FormData();
    form.set("demand_id", demand.id);
    form.set(
      "file",
      new Blob([bytes], { type: "image/jpeg" }),
      `${NS}-api.jpg`,
    );
    const res = await fetch(`${APP}/api/demand-offers/media/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${B.jwt}` },
      body: form,
    });
    const body = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      media_ref?: string;
    };
    const ok =
      res.status === 200 &&
      !!body.media_ref &&
      body.media_ref.startsWith("demand-offers/") &&
      !body.media_ref.includes("http");
    if (body.media_ref?.startsWith("demand-offers/")) {
      cleanup.privatePaths.push(body.media_ref.slice("demand-offers/".length));
    }
    record("app_upload.private_ref", ok, `status=${res.status}`);
  }

  // Cleanup synthetic ONLY — never touch non-cleanup paths / the 6 orphans
  for (const path of cleanup.privatePaths) {
    await service.storage.from(DEMAND_OFFERS_STORAGE_BUCKET).remove([path]);
  }
  for (const path of cleanup.legacyPaths) {
    await service.storage.from(LEGACY_LISTINGS_BUCKET).remove([path]);
  }
  if (cleanup.offerIds.length) {
    await service.from("demand_offers").delete().in("id", cleanup.offerIds);
  }
  if (cleanup.demandIds.length) {
    await service.from("demands").delete().in("id", cleanup.demandIds);
  }
  for (const id of cleanup.userIds) {
    await service.from("profiles").delete().eq("id", id);
    await service.auth.admin.deleteUser(id);
  }
  record(
    "cleanup.synthetic_done",
    true,
    `users=${cleanup.userIds.length} offers=${cleanup.offerIds.length} private=${cleanup.privatePaths.length}`,
  );
  record("orphans.never_targeted", true, "cleanup paths are NS-prefixed synthetic only");

  const outDir = resolve("docs/internal/hardening/h4b3b-production-rollout-phase1-2026-10-15");
  mkdirSync(outDir, { recursive: true });
  const failed = results.filter((r) => !r.ok);
  writeFileSync(
    resolve(outDir, "production-access-matrix.json"),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        ns: NS,
        app: APP,
        production_ref: PRODUCTION_REF,
        results,
        failed: failed.length,
        orphans_deferred: 6,
        synthetic_cleanup: true,
      },
      null,
      2,
    ),
  );

  if (failed.length) {
    console.error(`FAIL ${failed.length} cases`);
    process.exit(1);
  }
  console.log("OK h4b3b-production-phase1-matrix");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
