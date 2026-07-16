import type { ListingPriceAdvantage as ListingPriceAdvantageType } from "@/lib/listingPriceAdvantage";
import { formatEurAmount } from "@/lib/i18n/format";

type ListingPriceAdvantageProps = {
  data: ListingPriceAdvantageType | null;
  locale: string;
  labels: {
    title: string;
    quickExitPrice: string;
    marketReference: string;
    estimatedSavings: string;
    positionedCopy: string;
    disclaimer: string;
  };
};

export default function ListingPriceAdvantage({
  data,
  locale,
  labels,
}: ListingPriceAdvantageProps) {
  if (!data) return null;

  return (
    <div className="rounded-2xl border-[3px] border-black bg-[#FFF9E8] p-4 shadow-[5px_5px_0_0_rgba(0,0,0,0.18)]">
      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-700">
        {labels.title}
      </p>
      <div className="mt-3 space-y-1.5 text-sm font-semibold text-neutral-900">
        <p>
          {labels.quickExitPrice}:{" "}
          <span className="font-black">{formatEurAmount(data.exitPrice, locale)}</span>
        </p>
        <p>
          {labels.marketReference}:{" "}
          <span className="font-black">{formatEurAmount(data.marketPrice, locale)}</span>
        </p>
        <p>
          {labels.estimatedSavings}:{" "}
          <span className="font-black">
            {formatEurAmount(data.savings, locale)} ({data.savingsPercent}%)
          </span>
        </p>
      </div>
      <p className="mt-2 text-xs font-bold text-neutral-700">{labels.positionedCopy}</p>
      <p className="mt-2 text-[11px] font-medium leading-relaxed text-neutral-600">
        {labels.disclaimer}
      </p>
    </div>
  );
}
