"use client";

import AdCard from "@/app/components/AdCard";
import { trackEvent } from "@/lib/analytics";
import type { PublicListingRow } from "@/lib/listingSeo";
import { getFutureMobilityDetails } from "@/lib/futureMobility";
import { formatEurAmount } from "@/lib/i18n/format";
import { normalizeSaleType } from "@/utils/normalizeSaleType";
import { useLocale, useTranslations } from "next-intl";

type FutureMobilityListingGridProps = {
  listings: PublicListingRow[];
};

export default function FutureMobilityListingGrid({
  listings,
}: FutureMobilityListingGridProps) {
  const locale = useLocale();
  const t = useTranslations("FutureMobility");

  const badgeLabels = {
    FUTURE_COLLECTION: t("badges.futureCollection"),
    IMPORT_PREMIUM: t("badges.importPremium"),
    EV_PREMIUM: t("badges.evPremium"),
    CONFIGURABIL: t("badges.configurable"),
  } as const;

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-10">
      {listings.map((item, index) => {
        const fm = getFutureMobilityDetails(item.details);
        const extraBadges = fm?.badges
          ?.map((badge) => badgeLabels[badge])
          .filter((label): label is string => Boolean(label));

        return (
          <div
            key={item.id}
            onClick={() => {
              trackEvent("click_future_mobility_model", {
                listing_id: item.id,
                ...(fm?.model_slug ? { model_slug: fm.model_slug } : {}),
                ...(fm?.availability_type
                  ? { availability_type: fm.availability_type }
                  : {}),
              });
            }}
            onKeyDown={() => {}}
            role="presentation"
          >
            <AdCard
              id={item.id}
              title={item.title || ""}
              image={
                item.images?.[0] ||
                "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"
              }
              marketPrice={formatEurAmount(Number(item.market_price ?? 0), locale)}
              exitPrice={formatEurAmount(Number(item.exit_price ?? 0), locale)}
              discount={item.discount?.toString() || "0"}
              score={item.deal_score ? item.deal_score / 10 : 9.0}
              type={normalizeSaleType(item.sale_strategy)}
              priority={index === 0}
              extraBadges={extraBadges}
            />
          </div>
        );
      })}
    </div>
  );
}
