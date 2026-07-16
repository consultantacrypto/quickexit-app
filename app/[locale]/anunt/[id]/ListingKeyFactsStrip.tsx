import type { ListingFact } from "@/lib/listingKeyFacts";

type ListingKeyFactsStripProps = {
  facts: ListingFact[];
  title: string;
  compactSummaryLabel: string;
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
        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-neutral-500">
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
    <section aria-label={title} className="border-y border-black/10 py-3 md:py-4">
      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-neutral-500 md:mb-3">
        {title}
      </p>
      <div className="-mx-1 flex gap-0 overflow-x-auto pb-1 md:mx-0 md:grid md:grid-cols-6 md:overflow-visible md:pb-0">
        {facts.map((fact, index) => (
          <div
            key={fact.key}
            className={`min-w-[7.5rem] shrink-0 px-3 md:min-w-0 md:px-2 ${
              index > 0 ? "border-l border-black/10" : ""
            }`}
          >
            <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">
              {fact.label}
            </p>
            <p className="mt-1 break-words text-sm font-black leading-tight text-black md:text-[15px]">
              {fact.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
