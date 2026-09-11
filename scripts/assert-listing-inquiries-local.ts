/**
 * Live identity tests against a disposable local Supabase only.
 * Fails closed unless API and DB URLs are proven loopback.
 * Never logs tokens, emails, phones, or provider credentials.
 */
import { execFileSync, execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  LISTING_INQUIRY_CONSENT_VERSION,
  extractInquiryDbErrorCode,
  isSameOriginMutationRequest,
  mapInquiryWriteError,
  parseHqInquiryListQuery,
} from "../lib/listingInquiry";
import { notifySellerOfInquiry } from "../lib/notifySeller";
import {
  assertLocalSupabaseTargets,
} from "./assert-local-supabase-target";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

function must<T>(value: T | null | undefined, message: string): T {
  if (value == null) fail(message);
  return value;
}

function qex(error: { message?: string | null; code?: string | null } | null): string | null {
  return extractInquiryDbErrorCode(error);
}

type Actor = {
  id: string;
  accessToken: string;
};

const PROJECT_DIR =
  process.env.LOCAL_SUPABASE_PROJECT_DIR?.trim() ||
  "D:\\MEDIA\\quickexit-lead-contact-local-supabase";
const DB_CONTAINER =
  process.env.LOCAL_SUPABASE_DB_CONTAINER?.trim() ||
  "supabase_db_qex-leads-inquiries-20260911";

function loadCliEnv(): { apiUrl: string; anonKey: string; serviceKey: string } {
  const proven = assertLocalSupabaseTargets({
    ...process.env,
    LOCAL_SUPABASE_URL: process.env.LOCAL_SUPABASE_URL ?? "http://127.0.0.1:54321",
    LOCAL_SUPABASE_DB_URL:
      process.env.LOCAL_SUPABASE_DB_URL ??
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  });
  const raw = execFileSync(
    "npx",
    ["--yes", "supabase@2.117.0", "status", "-o", "env"],
    { cwd: PROJECT_DIR, encoding: "utf8", shell: true },
  );
  const bag: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    bag[line.slice(0, eq)] = line.slice(eq + 1).replace(/^"|"$/g, "").trim();
  }
  const apiUrl = (bag.API_URL || proven.apiUrl).replace(/\/+$/, "");
  assertLocalSupabaseTargets({
    LOCAL_SUPABASE_URL: apiUrl,
    LOCAL_SUPABASE_DB_URL:
      bag.DB_URL ||
      process.env.LOCAL_SUPABASE_DB_URL ||
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  });
  if (!bag.ANON_KEY || !bag.SERVICE_ROLE_KEY) fail("local CLI did not return keys");
  if (/supabase\.co|quickexit\.ro/i.test(apiUrl)) fail("refusing non-local API url");
  return { apiUrl, anonKey: bag.ANON_KEY, serviceKey: bag.SERVICE_ROLE_KEY };
}

function asUser(apiUrl: string, anonKey: string, token: string): SupabaseClient {
  return createClient(apiUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

async function createConfirmedUser(
  apiUrl: string,
  anonKey: string,
  admin: SupabaseClient,
  email: string,
  password: string,
): Promise<Actor> {
  const anon = createClient(apiUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const existing = await anon.auth.signInWithPassword({ email, password });
  if (existing.data.session?.access_token && existing.data.user?.id) {
    return { id: existing.data.user.id, accessToken: existing.data.session.access_token };
  }
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user?.id) {
    fail(`createUser failed (${created.error?.status ?? "no-status"})`);
  }
  const signed = await anon.auth.signInWithPassword({ email, password });
  if (signed.error || !signed.data.session?.access_token) {
    fail("signIn failed");
  }
  return { id: created.data.user.id, accessToken: signed.data.session.access_token };
}

function psql(sql: string) {
  execSync(`docker exec -i ${DB_CONTAINER} psql -U postgres -d postgres -v ON_ERROR_STOP=1`, {
    input: sql,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function psqlScalar(sql: string): string {
  const out = execSync(
    `docker exec -i ${DB_CONTAINER} psql -U postgres -d postgres -t -A -c "${sql.replace(/"/g, '\\"')}"`,
    { encoding: "utf8" },
  );
  return out.trim();
}

async function main() {
  const { apiUrl, anonKey, serviceKey } = loadCliEnv();

  const admin = createClient(apiUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient(apiUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  psql("DELETE FROM public.listing_inquiries; DELETE FROM public.seller_contacts;");

  const password = "LocalOnly.Pass-9x!";
  const sellerA = await createConfirmedUser(apiUrl, anonKey, admin, "seller-a.local@example.test", password);
  const sellerB = await createConfirmedUser(apiUrl, anonKey, admin, "seller-b.local@example.test", password);
  const buyerA = await createConfirmedUser(apiUrl, anonKey, admin, "buyer-a.local@example.test", password);
  const buyerB = await createConfirmedUser(apiUrl, anonKey, admin, "buyer-b.local@example.test", password);

  const insertListing = async (row: {
    user_id: string;
    title: string;
    status: string;
    is_seed: boolean;
    expires_at: string | null;
  }) => {
    const { data, error } = await admin.from("listings").insert(row).select("id").single();
    if (error || !data?.id) fail(`listing fixture insert failed (${error?.code ?? "no-code"})`);
    return String(data.id);
  };

  const listingA1 = await insertListing({
    user_id: sellerA.id,
    title: "Local fixture A1",
    status: "active",
    is_seed: false,
    expires_at: null,
  });
  const listingA2 = await insertListing({
    user_id: sellerA.id,
    title: "Local fixture A2",
    status: "active",
    is_seed: false,
    expires_at: null,
  });
  const listingA3 = await insertListing({
    user_id: sellerA.id,
    title: "Local fixture A3",
    status: "active",
    is_seed: false,
    expires_at: null,
  });
  const listingA4 = await insertListing({
    user_id: sellerA.id,
    title: "Local fixture A4",
    status: "active",
    is_seed: false,
    expires_at: null,
  });
  const listingA5 = await insertListing({
    user_id: sellerA.id,
    title: "Local fixture A5",
    status: "active",
    is_seed: false,
    expires_at: null,
  });
  const listingA6 = await insertListing({
    user_id: sellerA.id,
    title: "Local fixture A6",
    status: "active",
    is_seed: false,
    expires_at: null,
  });
  const listingConcurrent = await insertListing({
    user_id: sellerA.id,
    title: "Local fixture concurrent",
    status: "active",
    is_seed: false,
    expires_at: null,
  });
  const listingB1 = await insertListing({
    user_id: sellerB.id,
    title: "Local fixture B1",
    status: "active",
    is_seed: false,
    expires_at: null,
  });
  const listingExpired = await insertListing({
    user_id: sellerA.id,
    title: "Local fixture expired",
    status: "active",
    is_seed: false,
    expires_at: new Date(Date.now() - 60_000).toISOString(),
  });
  const listingSeed = await insertListing({
    user_id: sellerA.id,
    title: "Local fixture seed",
    status: "active",
    is_seed: true,
    expires_at: null,
  });
  const listingDraft = await insertListing({
    user_id: sellerA.id,
    title: "Local fixture draft",
    status: "draft",
    is_seed: false,
    expires_at: null,
  });
  const listingInactive = await insertListing({
    user_id: sellerA.id,
    title: "Local fixture inactive",
    status: "inactive",
    is_seed: false,
    expires_at: null,
  });
  const listingSuspended = await insertListing({
    user_id: sellerA.id,
    title: "Local fixture suspended",
    status: "suspended",
    is_seed: false,
    expires_at: null,
  });

  const buyerADb = asUser(apiUrl, anonKey, buyerA.accessToken);
  const buyerBDb = asUser(apiUrl, anonKey, buyerB.accessToken);
  const sellerADb = asUser(apiUrl, anonKey, sellerA.accessToken);
  const sellerBDb = asUser(apiUrl, anonKey, sellerB.accessToken);

  const inquire = (
    client: SupabaseClient,
    listingId: string,
    extra: Record<string, unknown> = {},
  ) =>
    client
      .from("listing_inquiries")
      .insert({
        listing_id: listingId,
        buyer_phone: "+15551110001",
        message: "local fixture",
        consent_version: "attacker-version",
        ...extra,
      })
      .select("id, buyer_id, seller_id, consent_version, listing_id, status")
      .single();

  // A. Anonymous
  const anonInsert = await anon.from("listing_inquiries").insert({
    listing_id: listingA1,
    buyer_phone: "+15551110001",
    message: "anon",
  });
  assert(Boolean(anonInsert.error), "A anon cannot insert inquiry");
  const anonSelect = await anon.from("listing_inquiries").select("id");
  assert((anonSelect.data ?? []).length === 0, "A anon cannot select inquiries");
  const anonContacts = await anon.from("seller_contacts").select("user_id");
  assert((anonContacts.data ?? []).length === 0, "A anon cannot read seller_contacts");
  const anonRpc = await anon.rpc("listing_inquiries_seller_set_status", {
    inquiry_id: "00000000-0000-4000-8000-000000000001",
    next_status: "seen",
  });
  assert(Boolean(anonRpc.error), "A anon cannot call seller status RPC");

  // B. Buyer A ownership and eligibility
  const spoof = await inquire(buyerADb, listingA1, {
    buyer_id: buyerB.id,
    seller_id: sellerB.id,
  });
  assert(!spoof.error && spoof.data, "B buyer A can inquire on valid listing");
  const owned = must(spoof.data, "B buyer A insert returned no row");
  assert(owned.buyer_id === buyerA.id, "B stored buyer_id is auth.uid()");
  assert(owned.seller_id === sellerA.id, "B stored seller_id is listing owner");
  assert(owned.consent_version === LISTING_INQUIRY_CONSENT_VERSION, "B consent_version is server-owned");

  const own = await inquire(sellerADb, listingA1);
  assert(qex(own.error) === "own_listing" || Boolean(own.error), "B cannot inquire on own listing");

  for (const [id, label] of [
    [listingSeed, "seed"],
    [listingExpired, "expired"],
    [listingDraft, "draft"],
    [listingInactive, "inactive"],
    [listingSuspended, "suspended"],
  ] as const) {
    const res = await inquire(buyerADb, id);
    assert(qex(res.error) === "listing_unavailable", `B cannot inquire on ${label} listing`);
  }

  const otherBuyerRead = await buyerBDb
    .from("listing_inquiries")
    .select("id")
    .eq("id", owned.id);
  assert((otherBuyerRead.data ?? []).length === 0, "B buyer B cannot read buyer A inquiry");

  const arbitraryUpdate = await buyerADb
    .from("listing_inquiries")
    .update({ buyer_phone: "+15559999999" })
    .eq("id", owned.id)
    .select("id");
  assert(Boolean(arbitraryUpdate.error) || (arbitraryUpdate.data ?? []).length === 0, "B buyer cannot update inquiry columns");

  const buyerStatus = await buyerADb.rpc("listing_inquiries_seller_set_status", {
    inquiry_id: owned.id,
    next_status: "seen",
  });
  assert(Boolean(buyerStatus.error), "B buyer cannot call seller status RPC");

  // C / later seller tests need a dedicated inquiry on listingB and listingA2
  const inquiryForSellerA = owned;
  const inquiryForSellerB = await inquire(buyerADb, listingB1);
  assert(!inquiryForSellerB.error && inquiryForSellerB.data, "seed inquiry on seller B listing");
  const sellerBInquiry = must(inquiryForSellerB.data, "seed inquiry on seller B listing");

  const sellerARows = await sellerADb.from("listing_inquiries").select("id, listing_id");
  assert(
    (sellerARows.data ?? []).some((row) => row.id === inquiryForSellerA.id),
    "C seller A reads own listing inquiries",
  );
  assert(
    !(sellerARows.data ?? []).some((row) => row.id === sellerBInquiry.id),
    "C seller A cannot read seller B inquiries",
  );

  const stealPhone = await sellerADb
    .from("listing_inquiries")
    .update({ buyer_phone: "+15550000000", message: "tamper", buyer_id: sellerA.id })
    .eq("id", inquiryForSellerA.id)
    .select("id");
  assert(Boolean(stealPhone.error) || (stealPhone.data ?? []).length === 0, "C seller cannot alter buyer fields");

  const seen = await sellerADb.rpc("listing_inquiries_seller_set_status", {
    inquiry_id: inquiryForSellerA.id,
    next_status: "seen",
  });
  assert(!seen.error, "C new → seen");
  const closed = await sellerADb.rpc("listing_inquiries_seller_set_status", {
    inquiry_id: inquiryForSellerA.id,
    next_status: "closed",
  });
  assert(!closed.error, "C seen → closed");
  const reopen = await sellerADb.rpc("listing_inquiries_seller_set_status", {
    inquiry_id: inquiryForSellerA.id,
    next_status: "seen",
  });
  assert(qex(reopen.error) === "invalid_status", "C cannot reopen closed");
  const invalid = await sellerADb.rpc("listing_inquiries_seller_set_status", {
    inquiry_id: inquiryForSellerA.id,
    next_status: "hq_handling",
  });
  assert(Boolean(invalid.error), "C cannot use invalid status");
  const cross = await sellerADb.rpc("listing_inquiries_seller_set_status", {
    inquiry_id: sellerBInquiry.id,
    next_status: "seen",
  });
  assert(qex(cross.error) === "forbidden", "C cannot update seller B inquiry");

  const fromNewToClosed = await inquire(buyerBDb, listingA2);
  const newToClosed = must(fromNewToClosed.data, "fixture inquiry for new→closed");
  const closeDirect = await sellerADb.rpc("listing_inquiries_seller_set_status", {
    inquiry_id: newToClosed.id,
    next_status: "closed",
  });
  assert(!closeDirect.error, "C new → closed");

  // D. Seller contacts
  const contactA = await sellerADb
    .from("seller_contacts")
    .upsert({ phone: "+15552220001" }, { onConflict: "user_id" })
    .select("user_id")
    .single();
  assert(!contactA.error && contactA.data?.user_id === sellerA.id, "D seller A upserts own contact");
  const readOwn = await sellerADb.from("seller_contacts").select("user_id, phone");
  assert((readOwn.data ?? []).every((row) => row.user_id === sellerA.id), "D seller A reads only own contact");
  const contactB = await sellerBDb.from("seller_contacts").upsert({ phone: "+15552220002" }).select("user_id");
  assert(!contactB.error, "D seller B can insert own contact");
  const stealContact = await sellerADb
    .from("seller_contacts")
    .select("user_id")
    .eq("user_id", sellerB.id);
  assert((stealContact.data ?? []).length === 0, "D seller A cannot read seller B contact");
  const buyerContact = await buyerADb.from("seller_contacts").select("user_id");
  assert((buyerContact.data ?? []).length === 0, "D buyer cannot enumerate contacts");
  const anonContactList = await anon.from("seller_contacts").select("phone");
  assert((anonContactList.data ?? []).length === 0, "D contacts are not public");

  // E. Concurrency, rolling duplicate, hourly cap
  const [c1, c2] = await Promise.all([
    inquire(buyerBDb, listingConcurrent),
    inquire(buyerBDb, listingConcurrent),
  ]);
  const concurrentOk = [c1, c2].filter((row) => !row.error && row.data?.id);
  assert(concurrentOk.length === 1, "E concurrent inserts yield exactly one success");
  const concurrentFail = [c1, c2].find((row) => row.error);
  assert(qex(concurrentFail?.error ?? null) === "duplicate_inquiry", "E loser maps to duplicate_inquiry");

  const dup = await inquire(buyerBDb, listingConcurrent);
  assert(qex(dup.error) === "duplicate_inquiry", "E rolling 15-minute duplicate rejected");

  const winnerId = concurrentOk[0]?.data?.id as string;
  psql(
    `UPDATE public.listing_inquiries SET created_at = now() - interval '14 minutes' WHERE id = '${winnerId}';`,
  );
  const stillRolling = await inquire(buyerBDb, listingConcurrent);
  assert(qex(stillRolling.error) === "duplicate_inquiry", "E 14-minute-old row still inside rolling window");
  const mappedDup = mapInquiryWriteError(stillRolling.error);
  assert(mappedDup.error_code === "duplicate_inquiry", "E API maps duplicate_inquiry");

  psql(
    `UPDATE public.listing_inquiries SET created_at = now() - interval '16 minutes' WHERE id = '${winnerId}';`,
  );
  const afterWindow = await inquire(buyerBDb, listingConcurrent);
  assert(!afterWindow.error && afterWindow.data, "E rolling window allows insert after 16 minutes");

  const { count: buyerAHourCount } = await admin
    .from("listing_inquiries")
    .select("id", { count: "exact", head: true })
    .eq("buyer_id", buyerA.id);
  let accepted = buyerAHourCount ?? 0;
  for (const listingId of [listingA3, listingA4, listingA5, listingA6]) {
    if (accepted >= 5) break;
    const res = await inquire(buyerADb, listingId);
    if (!res.error) accepted += 1;
  }
  assert(accepted === 5, "E buyer A accepted 5 inquiries in the hour across listings");
  const sixth = await inquire(buyerADb, listingA2);
  assert(qex(sixth.error) === "rate_limited", "E sixth inquiry in the hour is rate_limited");
  assert(mapInquiryWriteError(sixth.error).error_code === "rate_limited", "E API maps rate_limited");

  const buyerBExtra = await inquire(buyerBDb, listingA3);
  assert(!buyerBExtra.error, "E buyer B is unaffected by buyer A quota");

  // F. Service-role insert without auth.uid()
  const serviceInsert = await admin.from("listing_inquiries").insert({
    listing_id: listingA1,
    buyer_phone: "+15551110009",
    message: "service",
  });
  assert(qex(serviceInsert.error) === "auth_required", "F service-role insert without auth.uid fails closed");

  // Persist survives mocked notification failure
  const persistedId = afterWindow.data?.id;
  assert(persistedId, "persisted inquiry id");
  let mockCalls = 0;
  const notify = await notifySellerOfInquiry(
    {
      sellerEmail: "seller-a.local@example.test",
      listingTitle: "Local fixture",
      listingId: listingConcurrent,
      locale: "ro",
    },
    {
      env: {
        RESEND_API_KEY: "re_test",
        RESEND_FROM: "QuickExit <alerts@example.test>",
        QUICKEXIT_ENABLE_SELLER_EMAIL: "1",
      },
      fetchImpl: async (url) => {
        mockCalls += 1;
        if (!String(url).includes("api.resend.com")) {
          fail("notification mock received an unexpected URL");
        }
        return new Response("nope", { status: 500 });
      },
    },
  );
  assert(!notify.ok && notify.reason === "send_failed", "notification mock failure");
  assert(mockCalls === 1, "notification used the mock fetch once");
  const stillThere = await admin.from("listing_inquiries").select("id").eq("id", persistedId).maybeSingle();
  assert(Boolean(stillThere.data?.id), "notification failure does not delete persisted inquiry");

  // API / CSRF / HQ (pure + source)
  assert(
    isSameOriginMutationRequest(
      new Headers({ origin: "http://127.0.0.1:3000", host: "127.0.0.1:3000" }),
    ),
    "same-origin POST accepted",
  );
  assert(
    !isSameOriginMutationRequest(
      new Headers({
        origin: "https://evil.example",
        host: "127.0.0.1:3000",
      }),
    ),
    "cross-origin rejected",
  );
  assert(
    !isSameOriginMutationRequest(new Headers({ host: "127.0.0.1:3000" })),
    "missing origin rejected",
  );
  const hqDefault = parseHqInquiryListQuery(new URLSearchParams());
  assert(hqDefault.ok && hqDefault.view === "fallback" && hqDefault.limit === 50, "HQ default fallback bounded");
  assert(!parseHqInquiryListQuery(new URLSearchParams("limit=500")).ok, "HQ oversize page rejected");

  const dashboard = readFileSync(resolve("app/[locale]/dashboard/page.tsx"), "utf8");
  assert(dashboard.includes("if (!response.ok)"), "failed seller PATCH does not update UI first");
  const hqUi = readFileSync(resolve("app/[locale]/hq-admin/page.tsx"), "utf8");
  assert(hqUi.includes("if (!res.ok)"), "failed HQ PATCH does not update UI first");
  const inquiryRoute = readFileSync(resolve("app/api/listings/[id]/inquiry/route.ts"), "utf8");
  assert(inquiryRoute.includes("{ success: true, persisted: true }"), "public success omits notification status");

  console.log("OK listing-inquiries-local identity-matrix");

  // Rollback documented SQL, keep listings + auth users
  const listingCountBefore = psqlScalar("SELECT count(*) FROM public.listings");
  const userCountBefore = psqlScalar("SELECT count(*) FROM auth.users");
  psql(`
    BEGIN;
    DROP FUNCTION IF EXISTS public.listing_inquiries_seller_set_status(uuid, text);
    DROP TABLE IF EXISTS public.listing_inquiries CASCADE;
    DROP TABLE IF EXISTS public.seller_contacts CASCADE;
    DROP FUNCTION IF EXISTS public.listing_inquiries_set_updated_at();
    DROP FUNCTION IF EXISTS public.listing_inquiries_assign_ownership();
    DROP FUNCTION IF EXISTS public.seller_contacts_set_updated_at();
    COMMIT;
  `);
  assert(psqlScalar("SELECT to_regclass('public.listing_inquiries')") === "", "rollback removed listing_inquiries");
  assert(psqlScalar("SELECT to_regclass('public.seller_contacts')") === "", "rollback removed seller_contacts");
  assert(psqlScalar("SELECT count(*) FROM public.listings") === listingCountBefore, "rollback left listings fixture");
  assert(psqlScalar("SELECT count(*) FROM auth.users") === userCountBefore, "rollback left Auth users");

  const sql = readFileSync(resolve("docs/internal/sql/listing-inquiries.sql"), "utf8");
  psql(sql);
  assert(psqlScalar("SELECT to_regclass('public.listing_inquiries')") === "listing_inquiries", "reapply created listing_inquiries");

  const relog = await createClient(apiUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).auth.signInWithPassword({ email: "buyer-a.local@example.test", password });
  if (!relog.data.session?.access_token) fail("re-login after reapply failed");
  const buyerA2 = asUser(apiUrl, anonKey, relog.data.session.access_token);
  const sellerRelog = await createClient(apiUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).auth.signInWithPassword({ email: "seller-a.local@example.test", password });
  if (!sellerRelog.data.session?.access_token) fail("seller re-login failed");
  const sellerA2 = asUser(apiUrl, anonKey, sellerRelog.data.session.access_token);

  const again = await inquire(buyerA2, listingA1);
  const againRow = must(again.data, "critical matrix: buyer insert after reapply");
  assert(againRow.buyer_id === buyerA.id, "critical matrix: buyer_id after reapply");
  assert(againRow.seller_id === sellerA.id, "critical matrix: seller_id derived after reapply");
  const sellerRead = await sellerA2.from("listing_inquiries").select("id").eq("id", againRow.id);
  assert((sellerRead.data ?? []).length === 1, "critical matrix: seller select after reapply");
  const dup2 = await inquire(buyerA2, listingA1);
  assert(qex(dup2.error) === "duplicate_inquiry", "critical matrix: duplicate after reapply");

  console.log("OK listing-inquiries-local rollback-reapply");
}

void main().catch((error) => {
  fail(error instanceof Error ? error.message : "local inquiry tests threw");
});
