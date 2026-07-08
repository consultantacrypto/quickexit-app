"use client";

import { useTranslations } from "next-intl";
import { trackEvent } from "@/lib/analytics";
import { premiumSellerConfig } from "@/lib/premiumSeller";

type StickyContactBarProps = {
  listingId: string;
};

export default function StickyContactBar({ listingId }: StickyContactBarProps) {
  const t = useTranslations("ListingDetail.premiumSeller");
  const config = premiumSellerConfig;

  const trackPhone = () => {
    trackEvent("click_premium_seller_phone", {
      listing_id: listingId,
      source: "sticky_bar",
    });
  };

  const trackWhatsApp = () => {
    trackEvent("click_premium_seller_whatsapp", {
      listing_id: listingId,
      source: "sticky_bar",
    });
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t-[3px] border-black bg-white px-3 pt-2 md:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-[1400px] gap-2">
        <a
          href={config.phoneHref}
          onClick={trackPhone}
          className="flex flex-1 items-center justify-center rounded-xl border-[3px] border-black bg-black py-3 text-[10px] font-black uppercase tracking-wider text-[#FFD100] transition active:scale-[0.98]"
        >
          {t("call")}
        </a>
        <a
          href={config.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={trackWhatsApp}
          className="flex flex-1 items-center justify-center rounded-xl border-[3px] border-black bg-[#FFD100] py-3 text-[10px] font-black uppercase tracking-wider text-black transition active:scale-[0.98]"
        >
          {t("whatsapp")}
        </a>
      </div>
    </div>
  );
}
