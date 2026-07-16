import type { ListingPriceAdvantage as ListingPriceAdvantageType } from "@/lib/listingPriceAdvantage";
import { formatEurAmount } from "@/lib/i18n/format";

type ListingPriceAdvantageProps = {
  data: ListingPriceAdvantageType | null;
  locale: string;
  labels: {
    marketReference: string;
    disclaimer: string;
    savingsLabel: string;
  };
};

export default function ListingPriceAdvantage({
  data,
  locale,
  labels,
}: ListingPriceAdvantageProps) {
  if (!data) return null;

  return (
    <div className="mb-5 border-t border-black/10 pt-3">
      <p className="text-sm font-semibold leading-snug text-emerald-800/80">
        <span className="font-black text-emerald-900/90">
          {labels.savingsLabel} {formatEurAmount(data.savings, locale)} · {data.savingsPercent}%
        </span>
      </p>
      <p className="mt-1 text-[11px] font-medium leading-relaxed text-neutral-500">
        {labels.marketReference}:{" "}
        <span className="font-semibold text-neutral-600">
          {formatEurAmount(data.marketPrice, locale)}
        </span>
      </p>
      <p className="mt-1.5 text-[10px] font-medium leading-relaxed text-neutral-400">
        {labels.disclaimer}
      </p>
    </div>
  );
}
