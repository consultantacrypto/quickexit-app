"use client";

import { useTranslations } from "next-intl";
import type { SellerProfileRow } from "@/lib/listingSeo";
import {
  publicSellerInitials,
  resolvePublicSellerDisplayName,
  sellerHasPublicVerificationBadge,
} from "@/lib/sellerPublicProfile";

type SellerAboutCardProps = {
  sellerProfile: SellerProfileRow | null;
  displayNameFallback: string;
  activeListingCount: number;
  memberSince: string | null;
};

export default function SellerAboutCard({
  sellerProfile,
  displayNameFallback,
  activeListingCount,
  memberSince,
}: SellerAboutCardProps) {
  const t = useTranslations("ListingDetail.seller");
  const displayName = resolvePublicSellerDisplayName(sellerProfile, displayNameFallback);
  const initials = publicSellerInitials(displayName);
  const verified = sellerHasPublicVerificationBadge(sellerProfile);

  return (
    <section
      aria-labelledby="seller-about-heading"
      className="rounded-[2rem] border-[3px] border-black bg-white p-5 shadow-[8px_8px_0_0_rgba(0,0,0,0.85)] sm:p-6"
    >
      <h3
        id="seller-about-heading"
        className="text-sm font-black uppercase italic tracking-tight text-black md:text-base"
      >
        {t("title")}
      </h3>

      <div className="mt-4 flex items-center gap-3 sm:gap-4">
        <div
          aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-[3px] border-black bg-[#FFD100] text-sm font-black tracking-tight text-black shadow-[3px_3px_0_0_#000] sm:h-14 sm:w-14 sm:text-base"
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-base font-black italic leading-snug tracking-tight text-black sm:text-lg">
            {displayName}
          </p>
          {verified ? (
            <p className="mt-1 inline-flex items-center rounded-lg border-2 border-black bg-[#FFD100] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-black">
              {t("verifiedBadge")}
            </p>
          ) : null}
        </div>
      </div>

      <ul className="mt-5 space-y-3 border-t border-neutral-200 pt-4 text-sm font-medium text-neutral-800">
        <li>
          <span className="block text-[10px] font-black uppercase tracking-widest text-neutral-500">
            {t("activeListings")}
          </span>
          <span className="mt-1 block font-bold text-black">{t("activeCount", { count: activeListingCount })}</span>
        </li>
        {memberSince ? (
          <li>
            <span className="block text-[10px] font-black uppercase tracking-widest text-neutral-500">
              {t("memberSince")}
            </span>
            <span className="mt-1 block font-bold capitalize text-black">{memberSince}</span>
          </li>
        ) : null}
      </ul>

      <p className="mt-5 border-t border-neutral-200 pt-4 text-xs font-medium leading-relaxed text-neutral-600 sm:text-sm">
        {t("contactHint")}
      </p>
    </section>
  );
}
