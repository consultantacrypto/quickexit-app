"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { trackEvent } from "@/lib/analytics";
import { premiumSellerConfig } from "@/lib/premiumSeller";
import { showVehicleReviewedBadge } from "@/lib/listingPremium";
import type { SellerProfileRow } from "@/lib/listingSeo";
import { labelBase } from "./listingModalShared";

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
    <div className="rounded-[2rem] border-[3px] border-black bg-white p-6 shadow-[8px_8px_0_0_rgba(0,0,0,0.85)]">
      <div className="flex items-start gap-4">
        <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl border-[3px] border-black bg-[#F7F4EC]">
          <Image
            src={config.avatarSrc}
            alt={config.name}
            width={72}
            height={72}
            className="h-[72px] w-[72px] object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black uppercase italic tracking-tight text-black">
            {config.name}
          </h3>
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

      <p className="mt-4 text-xs font-medium leading-relaxed text-neutral-700">{bio}</p>

      <ul className="mt-4 space-y-2 border-t border-neutral-200 pt-4 text-sm font-medium text-neutral-800">
        {sellerMemberSince ? (
          <li>
            <span className={labelBase}>{t("memberSince")}</span>
            <span className="mt-0.5 block font-bold capitalize text-black">{sellerMemberSince}</span>
          </li>
        ) : null}
        <li>
          <span className={labelBase}>{t("activeListings")}</span>
          <span className="mt-0.5 block font-bold text-black">{activeListingCount}</span>
        </li>
      </ul>

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
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
    </div>
  );
}
