import type { ListingFact, ListingFactKey } from "@/lib/listingKeyFacts";
import {
  Battery,
  Calendar,
  Car,
  CircleGauge,
  Fuel,
  Gauge,
  MapPin,
  MessagesSquare,
  Settings2,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type ListingKeyFactsStripProps = {
  facts: ListingFact[];
  title: string;
  compactSummaryLabel: string;
};

const FACT_ICONS: Partial<Record<ListingFactKey, LucideIcon>> = {
  power: Zap,
  mileage: Gauge,
  year: Calendar,
  fuel: Fuel,
  transmission: Settings2,
  bodyType: Car,
  drivetrain: CircleGauge,
  range: CircleGauge,
  battery: Battery,
  surface: MapPin,
  landSurface: MapPin,
  location: MapPin,
  offers: MessagesSquare,
};

export default function ListingKeyFactsStrip({
  facts,
  title,
  compactSummaryLabel,
}: ListingKeyFactsStripProps) {
  if (facts.length < 3) {
    if (facts.length === 0) return null;
    return (
      <section aria-label={compactSummaryLabel} className="border-y border-black/10 py-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">
          {compactSummaryLabel}
        </p>
        <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm font-semibold text-neutral-800">
          {facts.map((fact) => (
            <li key={fact.key}>
              <span className="text-neutral-500">{fact.label}:</span> {fact.value}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section aria-label={title} className="border-y border-black/10 py-3 md:py-3.5">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">
        {title}
      </p>
      <div
        className={[
          "-mx-1 flex snap-x snap-mandatory gap-0 overflow-x-auto px-1 pb-2",
          "md:mx-0 md:grid md:snap-none md:grid-cols-6 md:overflow-visible md:px-0 md:pb-0",
          "[scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.22)_transparent]",
          "[&::-webkit-scrollbar]:h-1.5",
          "[&::-webkit-scrollbar-track]:bg-transparent",
          "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-black/20",
          "motion-safe:scroll-smooth",
        ].join(" ")}
      >
        {facts.map((fact, index) => {
          const Icon = FACT_ICONS[fact.key];
          return (
            <div
              key={fact.key}
              className={[
                "min-w-[7.25rem] shrink-0 snap-start px-3 py-1 md:min-w-0 md:px-2.5",
                index > 0 ? "border-l border-black/10" : "",
                "transition-colors duration-150 motion-safe:hover:bg-black/[0.02]",
              ].join(" ")}
            >
              <div className="flex items-center gap-1.5">
                {Icon ? (
                  <Icon
                    className="h-3 w-3 shrink-0 text-neutral-400"
                    strokeWidth={2}
                    aria-hidden
                  />
                ) : null}
                <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                  {fact.label}
                </p>
              </div>
              <p className="mt-1 break-words text-[15px] font-black leading-snug tracking-tight text-black md:text-base">
                {fact.value}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
