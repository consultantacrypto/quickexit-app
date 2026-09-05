import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SELLER_PUBLIC_LISTING_IS_SEED,
  SELLER_PUBLIC_LISTING_STATUS,
} from "../lib/listingSeo";
import {
  publicSellerInitials,
  publicSellerNameLooksUnsafe,
  resolvePublicSellerDisplayName,
  resolveSellerActiveListingCount,
  sellerHasPublicVerificationBadge,
} from "../lib/sellerPublicProfile";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const listingSeo = readFileSync(join(root, "lib/listingSeo.ts"), "utf8");
const sellerCard = readFileSync(join(root, "app/[locale]/anunt/[id]/SellerAboutCard.tsx"), "utf8");
const premiumCard = readFileSync(join(root, "app/[locale]/anunt/[id]/PremiumSellerCard.tsx"), "utf8");
const anuntClient = readFileSync(join(root, "app/[locale]/anunt/[id]/AnuntClient.tsx"), "utf8");
const listingPremium = readFileSync(join(root, "lib/listingPremium.ts"), "utf8");
const ro = readFileSync(join(root, "messages/ro.json"), "utf8");
const en = readFileSync(join(root, "messages/en.json"), "utf8");

assert(SELLER_PUBLIC_LISTING_STATUS === "active", "public seller listings must be active");
assert(SELLER_PUBLIC_LISTING_IS_SEED === false, "public seller listings must exclude seed");
assert(listingSeo.includes('.eq("user_id", userId)'), "seller count is scoped to listing owner");
assert(listingSeo.includes("SELLER_PUBLIC_LISTING_STATUS"), "count uses active status constant");
assert(listingSeo.includes("SELLER_PUBLIC_LISTING_IS_SEED"), "count uses is_seed=false constant");
assert(!listingSeo.includes("service_role") && !listingSeo.includes("SERVICE_ROLE"), "seller context uses anon client only");

assert(resolvePublicSellerDisplayName(null, "Vânzător Quick Exit") === "Vânzător Quick Exit", "null profile uses fallback");
assert(
  resolvePublicSellerDisplayName({ full_name: "   " }, "Vânzător Quick Exit") === "Vânzător Quick Exit",
  "blank name uses fallback",
);
assert(resolvePublicSellerDisplayName({ full_name: "Ana Pop" }, "Vânzător Quick Exit") === "Ana Pop", "safe name is shown");
assert(
  resolvePublicSellerDisplayName({ full_name: "seller@example.com" }, "Vânzător Quick Exit") ===
    "Vânzător Quick Exit",
  "email name is rejected",
);
assert(
  resolvePublicSellerDisplayName({ full_name: "0731409099" }, "Quick Exit seller") === "Quick Exit seller",
  "phone name is rejected",
);
assert(
  resolvePublicSellerDisplayName(
    { full_name: "83da9725-68f3-4ded-9605-714b9094bf0e" },
    "Quick Exit seller",
  ) === "Quick Exit seller",
  "user id name is rejected",
);
assert(publicSellerNameLooksUnsafe("ana@quickexit.ro"), "email is unsafe");
assert(publicSellerInitials("Vânzător Quick Exit") === "VQ", "RO fallback initials");
assert(publicSellerInitials("Quick Exit seller") === "QE", "EN fallback initials");
assert(publicSellerInitials("Ana") === "AN", "single-word initials");

assert(sellerHasPublicVerificationBadge({ kyc_status: "verified" }), "verified badge when field is verified");
assert(!sellerHasPublicVerificationBadge({ kyc_status: "pending" }), "pending is not a public badge");
assert(!sellerHasPublicVerificationBadge(null), "missing profile is not a public badge");

assert(resolveSellerActiveListingCount({ counted: 1, otherPublicCount: 37 }) === 1, "exact seller count wins");
assert(resolveSellerActiveListingCount({ counted: 38, otherPublicCount: 0 }) === 38, "founder-sized seller count");
assert(resolveSellerActiveListingCount({ counted: null, otherPublicCount: 0 }) === 1, "null count falls back to current+others");
assert(resolveSellerActiveListingCount({ counted: -2, otherPublicCount: 2 }) === 3, "invalid count is not used");

assert(sellerCard.includes('t("title")'), "card uses about-the-seller title");
assert(sellerCard.includes("activeCount"), "card renders seller-scoped count");
assert(!sellerCard.includes("userType"), "card does not render role/user type");
assert(!sellerCard.includes("sellerProfile.id"), "card does not render user id");
assert(!sellerCard.includes("email"), "card has no email field");
assert(!sellerCard.includes("phone"), "card has no phone field");
assert(anuntClient.includes("SellerAboutCard"), "listing page uses the about-seller card");
assert(!anuntClient.includes('t("seller.role")'), "listing page no longer renders the Role row");
assert(anuntClient.includes("resolveSellerActiveListingCount"), "listing page uses scoped count helper");

assert(ro.includes("Despre vânzător"), "RO about-seller title");
assert(en.includes("About the seller"), "EN about-seller title");
assert(
  ro.includes("Datele de contact nu sunt afișate public. Trimite o ofertă pentru a iniția contactul."),
  "RO protected-contact copy",
);
assert(
  en.includes("Contact details are not displayed publicly. Submit an offer to start the conversation."),
  "EN protected-contact copy",
);
assert(ro.includes("Listare administrată de Quick Exit"), "RO managed-listing title");
assert(en.includes("Managed by Quick Exit"), "EN managed-listing title");
assert(premiumCard.includes('t("managedTitle")'), "premium card uses managed-listing title");
assert(premiumCard.includes("phoneHref"), "managed card keeps intentional operator phone");
assert(listingPremium.includes("premium_seller_enabled"), "premium path requires listing opt-in, not founder-only");
assert(!listingSeo.includes('.select("*")'), "public listing detail no longer uses select *");
assert(listingSeo.includes("LISTING_DETAIL_FIELDS"), "public listing detail uses explicit projection");
assert(listingSeo.includes("negotiation_rooms"), "user_id retention is documented");

console.log("OK seller-profile");
