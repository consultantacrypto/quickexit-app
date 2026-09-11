import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  INQUIRY_RLS_MATRIX,
  canInsertInquiry,
  canSelectInquiry,
  canSelectSellerContact,
  canSellerSetInquiryStatus,
  canUpdateInquiryNotificationOrStatus,
  SAMPLE_INQUIRY,
} from "../lib/listingInquiryRls";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

assert(!canInsertInquiry("anon"), "anon cannot insert inquiries");
assert(!canSelectInquiry("anon", SAMPLE_INQUIRY), "anon cannot read inquiries");
assert(!canSelectSellerContact("anon", "listingSeller"), "anon cannot read seller_contacts");

assert(canInsertInquiry("buyerA"), "buyer can insert own inquiry");
assert(
  canInsertInquiry("buyerA", { spoofBuyerId: "buyerB", spoofSellerId: "unrelatedSeller" }),
  "spoofed ids are overwritten; insert still binds to auth.uid()",
);
assert(canSelectInquiry("buyerA", SAMPLE_INQUIRY), "buyer A reads own inquiry");
assert(!canSelectInquiry("buyerB", SAMPLE_INQUIRY), "buyer B cannot read buyer A inquiries");
assert(!canUpdateInquiryNotificationOrStatus("buyerA"), "buyer cannot update notification/status");

assert(!canInsertInquiry("listingSeller"), "listing seller cannot inquire on own listing");
assert(canSelectInquiry("listingSeller", SAMPLE_INQUIRY), "listing seller reads owned listing inquiries");
assert(!canSelectInquiry("unrelatedSeller", SAMPLE_INQUIRY), "unrelated seller reads nothing");
assert(
  !canUpdateInquiryNotificationOrStatus("listingSeller"),
  "seller cannot update notification/status",
);
assert(canSellerSetInquiryStatus("listingSeller", SAMPLE_INQUIRY, "seen"), "owner seller can mark seen via RPC");
assert(!canSellerSetInquiryStatus("buyerA", SAMPLE_INQUIRY, "seen"), "buyer cannot set seller status");
assert(!canSellerSetInquiryStatus("unrelatedSeller", SAMPLE_INQUIRY, "closed"), "other seller cannot set status");

assert(canSelectSellerContact("listingSeller", "listingSeller"), "owner reads own seller_contacts");
assert(
  !canSelectSellerContact("buyerA", "listingSeller"),
  "buyer cannot read seller private contact",
);
assert(
  !canSelectSellerContact("unrelatedSeller", "listingSeller"),
  "unrelated seller cannot read another contact",
);

assert(!canInsertInquiry("serviceRole"), "service role cannot insert (fail closed)");
assert(canSelectInquiry("serviceRole", SAMPLE_INQUIRY), "service role can read inquiries");
assert(canUpdateInquiryNotificationOrStatus("serviceRole"), "service role can update notification");
assert(canSelectSellerContact("serviceRole", "listingSeller"), "service role can read contacts");

const expected = {
  anon: { insertOwnListingInquiry: false, selectBuyerAInquiry: false, updateNotificationOrStatus: false, selectListingSellerContact: false },
  buyerA: { insertOwnListingInquiry: true, selectBuyerAInquiry: true, updateNotificationOrStatus: false, selectListingSellerContact: false },
  buyerB: { insertOwnListingInquiry: true, selectBuyerAInquiry: false, updateNotificationOrStatus: false, selectListingSellerContact: false },
  listingSeller: { insertOwnListingInquiry: false, selectBuyerAInquiry: true, updateNotificationOrStatus: false, selectListingSellerContact: true },
  unrelatedSeller: { insertOwnListingInquiry: false, selectBuyerAInquiry: false, updateNotificationOrStatus: false, selectListingSellerContact: false },
  serviceRole: { insertOwnListingInquiry: false, selectBuyerAInquiry: true, updateNotificationOrStatus: true, selectListingSellerContact: true },
} as const;

for (const row of INQUIRY_RLS_MATRIX) {
  const want = expected[row.actor];
  assert(row.insertOwnListingInquiry === want.insertOwnListingInquiry, `${row.actor} insert`);
  assert(row.selectBuyerAInquiry === want.selectBuyerAInquiry, `${row.actor} select inquiry`);
  assert(row.updateNotificationOrStatus === want.updateNotificationOrStatus, `${row.actor} update`);
  assert(row.selectListingSellerContact === want.selectListingSellerContact, `${row.actor} contact`);
}

const sql = readFileSync(resolve("docs/internal/sql/listing-inquiries.sql"), "utf8");
assert(/REVOKE ALL ON public\.listing_inquiries FROM anon/.test(sql), "sql: inquiries anon revoked");
assert(/REVOKE ALL ON public\.seller_contacts FROM anon/.test(sql), "sql: contacts anon revoked");
assert(!/ON public\.listing_inquiries\s+FOR UPDATE/.test(sql), "sql: no inquiry update policy");
assert(/listing_inquiries_seller_set_status/.test(sql), "sql: seller status is RPC not table UPDATE");
assert(/NEW\.buyer_id := auth\.uid\(\)/.test(sql), "sql: buyer_id overwritten");
assert(/NEW\.seller_id := listing_owner/.test(sql), "sql: seller_id overwritten");
assert(/NEW\.notification_status := 'pending'/.test(sql), "sql: notification reset on insert");

const clientSource = [
  readFileSync(resolve("lib/supabase/client.ts"), "utf8"),
  readFileSync(resolve("lib/supabase.ts"), "utf8"),
  readFileSync(resolve("lib/supabase/config.ts"), "utf8"),
].join("\n");
assert(!/SERVICE_ROLE/.test(clientSource), "browser supabase helpers do not reference service role");
assert(/getSupabaseAnonKey/.test(clientSource), "browser client uses anon key");

const browserFiles = [
  "app/[locale]/dashboard/page.tsx",
  "app/[locale]/pune-anunt/PuneAnuntClient.tsx",
  "app/[locale]/anunt/[id]/AnuntClient.tsx",
  "app/[locale]/hq-admin/page.tsx",
];
for (const file of browserFiles) {
  const source = readFileSync(resolve(file), "utf8");
  assert(!/SUPABASE_SERVICE_ROLE_KEY/.test(source), `${file} must not bundle service role`);
}

console.log("OK listing-inquiries-rls");
console.log("LIVE RLS identity tests: blocked against Production Supabase; use local or dedicated staging.");
