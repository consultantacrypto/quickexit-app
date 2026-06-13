"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/src/i18n/navigation";
import { getCapitalDisponibilUiCopy } from "@/lib/capitalDisponibilContent";
import { formatDemandBudget, type PublicDemandRow } from "@/lib/publicDemands";
import type { PageLocale } from "@/lib/seo";
import { trackEvent } from "@/lib/analytics";

type CapitalDisponibilClientProps = {
  initialDemands: PublicDemandRow[];
  locale: PageLocale;
};

export default function CapitalDisponibilClient({
  initialDemands,
  locale,
}: CapitalDisponibilClientProps) {
  const copy = useMemo(() => getCapitalDisponibilUiCopy(locale), [locale]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Toate");
  const [demands] = useState<PublicDemandRow[]>(initialDemands);

  useEffect(() => {
    trackEvent("view_capital_disponibil", { page_path: `/${locale}/capital-disponibil` });
  }, [locale]);

  const filteredBuyers = demands.filter((buyer) => {
    const asset = buyer.target_asset || "";
    const desc = buyer.description || "";

    const matchesSearch =
      asset.toLowerCase().includes(searchTerm.toLowerCase()) ||
      desc.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "Toate" || buyer.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <div className="bg-[#FFFCF4] p-6 md:p-7 rounded-[2rem] border-[3px] border-black shadow-[7px_7px_0_0_rgba(255,209,0,1)] mb-8 flex flex-col md:flex-row gap-4 items-center z-20 relative">
        <div className="w-full md:w-1/2 relative">
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl" aria-hidden>
            🔍
          </span>
          <input
            type="text"
            placeholder={copy.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border-[3px] border-black p-4 pl-14 rounded-xl font-black text-sm italic uppercase focus:outline-none focus:bg-[#FFFCF4] focus:border-[#FFD100] transition-colors"
          />
        </div>

        <div className="w-full md:w-1/4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-white border-[3px] border-black p-4 rounded-xl font-black text-sm italic uppercase focus:outline-none focus:bg-[#FFFCF4] appearance-none cursor-pointer"
          >
            {copy.categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-1/4 bg-black text-[#FFD100] p-4 rounded-xl border-[3px] border-black flex flex-col justify-center items-center h-full shadow-[4px_4px_0_0_rgba(255,209,0,1)]">
          <span className="text-[11px] font-black uppercase tracking-widest text-white/80">
            {copy.filterResults}
          </span>
          <span className="text-2xl font-black italic leading-none">
            {filteredBuyers.length} {copy.filterCountLabel}
          </span>
        </div>
      </div>

      <p className="mb-6 max-w-3xl text-xs font-semibold leading-relaxed text-neutral-800 md:text-sm">
        {copy.safetyNote}
      </p>

      <section aria-label={copy.eyebrow}>
        {filteredBuyers.length > 0 ? (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 list-none p-0 m-0">
            {filteredBuyers.map((buyer) => (
              <li
                key={buyer.id}
                className="bg-white border-[3px] border-black rounded-[2rem] p-6 md:p-7 shadow-[6px_6px_0_0_rgba(255,209,0,1)] hover:-translate-y-1 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="mb-6">
                    <div className="flex justify-between items-start">
                      <span className="bg-[#FFD100] text-black px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest italic border-2 border-black">
                        {buyer.budget >= 100000
                          ? copy.budgetCommunicated
                          : copy.budgetDeclared}
                      </span>
                      <span className="text-2xl opacity-70 group-hover:opacity-100 transition-all" aria-hidden>
                        💰
                      </span>
                    </div>
                    <p className="mt-2 text-[10px] font-semibold leading-snug text-neutral-600">
                      {copy.budgetDisclaimer}
                    </p>
                  </div>

                  <h3 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight leading-none mb-3 text-black">
                    {buyer.target_asset}
                  </h3>

                  <div className="flex items-center gap-2 mb-6 flex-wrap">
                    <span className="text-[11px] font-black uppercase tracking-widest bg-[#F7F4EC] px-2 py-1 rounded border border-black/20">
                      {buyer.category || (locale === "en" ? "General" : "General")}
                    </span>
                    <span className="text-[11px] font-bold text-neutral-700 uppercase tracking-widest">
                      {locale === "en" ? "Status:" : "Status:"}{" "}
                      <span className="text-black">{copy.statusActive}</span>
                    </span>
                  </div>

                  {buyer.description ? (
                    <p className="text-sm font-bold text-neutral-700 italic line-clamp-3 leading-relaxed">
                      &quot;{buyer.description}&quot;
                    </p>
                  ) : null}
                </div>

                <div className="mt-8 pt-6 border-t-[3px] border-black/10">
                  <p className="text-[11px] font-black uppercase tracking-widest text-neutral-600 mb-1">
                    {copy.maxBudgetLabel}
                  </p>
                  <p className="text-4xl md:text-5xl font-black italic tracking-tighter text-black mb-8 break-words">
                    €{formatDemandBudget(buyer.budget, locale)}
                  </p>

                  <Link
                    href={`/trimite-oferta/${buyer.id}`}
                    onClick={() =>
                      trackEvent("click_send_demand_offer", {
                        demand_id: buyer.id,
                        category: buyer.category || "unknown",
                      })
                    }
                    aria-label={`${copy.sendOfferCta}: ${buyer.target_asset}`}
                    className="w-full bg-[#FFD100] border-[3px] border-black text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs italic hover:bg-black hover:text-[#FFD100] transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 block text-center"
                  >
                    {copy.sendOfferCta}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-20 bg-white border-[3px] border-black rounded-[2rem] shadow-[7px_7px_0_0_rgba(255,209,0,1)]">
            <span className="text-5xl mb-5 block" aria-hidden>
              🧭
            </span>
            <h2 className="text-2xl md:text-3xl font-black uppercase italic mb-3">
              {copy.emptyTitle}
            </h2>
            <p className="text-neutral-700 font-bold mb-8">{copy.emptyBody}</p>
            <Link
              href="/posteaza-cerere"
              className="inline-block w-full sm:w-auto bg-black text-[#FFD100] px-8 py-4 rounded-xl border-[3px] border-black font-black uppercase text-xs italic shadow-[4px_4px_0_0_rgba(255,209,0,1)]"
            >
              {copy.emptyCta}
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
