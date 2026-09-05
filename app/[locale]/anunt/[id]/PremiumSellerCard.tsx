"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { trackEvent } from "@/lib/analytics";
import { premiumSellerConfig } from "@/lib/premiumSeller";
import { showVehicleReviewedBadge } from "@/lib/listingPremium";
import type { SellerProfileRow } from "@/lib/listingSeo";

type PremiumSellerCardProps = {
  listingId: string;
  sellerProfile: SellerProfileRow | null;
  activeListingCount: number;
  sellerMemberSince: string | null;
  category: string | null;
  details: unknown;
};

export default function PremiumSellerCard({
  listingId,
  sellerProfile,
  activeListingCount,
  sellerMemberSince,
  category,
  details,
}: PremiumSellerCardProps) {
  const t = useTranslations("ListingDetail.premiumSeller");
  const locale = useLocale();
  const config = premiumSellerConfig;

  const role = locale === "en" ? config.roleEn : config.roleRo;
  const bio = locale === "en" ? config.bioEn : config.bioRo;
  const isKycVerified = sellerProfile?.kyc_status === "verified";
  const showVehicleBadge = showVehicleReviewedBadge(details, category);

  const trackPhone = () => {
    trackEvent("click_premium_seller_phone", {
      listing_id: listingId,
      source: "sidebar",
    });
  };

  const trackWhatsApp = () => {
    trackEvent("click_premium_seller_whatsapp", {
      listing_id: listingId,
      source: "sidebar",
    });
  };

  const trackTikTok = () => {
    trackEvent("click_premium_seller_tiktok", {
      listing_id: listingId,
      source: "sidebar",
    });
  };

  return (
    <section
      aria-labelledby="managed-listing-heading"
      className="rounded-[2rem] border-[3px] border-black bg-white p-5 shadow-[8px_8px_0_0_rgba(0,0,0,0.85)] sm:p-6"
    >
      <h3
        id="managed-listing-heading"
        className="text-sm font-black uppercase italic tracking-tight text-black md:text-base"
      >
        {t("managedTitle")}
      </h3>

      <div className="mt-4 flex items-center gap-3 sm:gap-4">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border-[3px] border-black bg-[#F7F4EC] sm:h-14 sm:w-14">
          <Image
            src={config.avatarSrc}
            alt={config.name}
            width={72}
            height={72}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <p className="text-base font-black italic leading-snug tracking-tight text-black sm:text-lg">
            {config.name}
          </p>
          <p className="mt-1 text-[11px] font-bold leading-snug text-neutral-700">{role}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {isKycVerified ? (
              <span className="inline-flex items-center gap-1 rounded-lg border-2 border-black bg-[#FFD100] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-black">
                <span aria-hidden>★</span>
                {t("verifiedProfile")}
              </span>
            ) : null}
            {showVehicleBadge ? (
              <span className="inline-flex items-center rounded-lg border-2 border-black bg-black px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#FFD100]">
                {t("vehicleReviewedBadge")}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs font-medium leading-relaxed text-neutral-700 sm:text-sm">{bio}</p>

      <ul className="mt-5 space-y-3 border-t border-neutral-200 pt-4 text-sm font-medium text-neutral-800">
        {sellerMemberSince ? (
          <li>
            <span className="block text-[10px] font-black uppercase tracking-widest text-neutral-500">
              {t("memberSince")}
            </span>
            <span className="mt-1 block font-bold capitalize text-black">{sellerMemberSince}</span>
          </li>
        ) : null}
        <li>
          <span className="block text-[10px] font-black uppercase tracking-widest text-neutral-500">
            {t("activeListings")}
          </span>
          <span className="mt-1 block font-bold text-black">{activeListingCount}</span>
        </li>
      </ul>

      <p className="mt-5 border-t border-neutral-200 pt-4 text-xs font-medium leading-relaxed text-neutral-600 sm:text-sm">
        {t("managedContactHint")}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <a
          href={config.phoneHref}
          onClick={trackPhone}
          className="inline-flex items-center justify-center rounded-xl border-[3px] border-black bg-black px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-[#FFD100] transition hover:brightness-110"
        >
          {t("call")}
        </a>
        <a
          href={config.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={trackWhatsApp}
          className="inline-flex items-center justify-center rounded-xl border-[3px] border-black bg-white px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-black transition hover:bg-[#FFD100]/60"
        >
          {t("whatsapp")}
        </a>
        <a
          href={config.tiktokUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={trackTikTok}
          className="inline-flex items-center justify-center rounded-xl border-[3px] border-black bg-[#FDFCF8] px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-black transition hover:bg-white sm:col-span-1"
        >
          {t("followTikTok")}
        </a>
      </div>
    </section>
  );
}
