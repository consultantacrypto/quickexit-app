"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/src/i18n/navigation";
import DemandCard from "@/app/components/DemandCard";
import { getCapitalDisponibilUiCopy } from "@/lib/capitalDisponibilContent";
import {
  formatDemandBudget,
  summarizePublicDemandCapital,
  type PublicDemandRow,
} from "@/lib/publicDemands";
import type { PageLocale } from "@/lib/seo";
import { trackEvent } from "@/lib/analytics";

type CapitalDisponibilClientProps = {
  initialDemands: PublicDemandRow[];
  locale: PageLocale;
};

function formatEurTotal(amount: number, locale: PageLocale): string {
  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "ro-RO", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function CapitalDisponibilClient({
  initialDemands,
  locale,
}: CapitalDisponibilClientProps) {
  const copy = useMemo(() => getCapitalDisponibilUiCopy(locale), [locale]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Toate");
  const [demands] = useState<PublicDemandRow[]>(initialDemands);
  const summary = useMemo(() => summarizePublicDemandCapital(demands), [demands]);

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
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-[1.5rem] border-[3px] border-black bg-white p-5 shadow-[5px_5px_0_0_#FFD100]">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">
            {copy.totalCapitalLabel}
          </p>
          <p className="mt-2 break-words text-3xl font-black tracking-tight text-black md:text-4xl">
            {formatEurTotal(summary.totalBudgetEur, locale)}
          </p>
        </div>
        <div className="rounded-[1.5rem] border-[3px] border-black bg-black p-5 text-white shadow-[5px_5px_0_0_#FFD100]">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFD100]/90">
            {copy.activeBuyersLabel}
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
            {summary.activeCount}
          </p>
        </div>
      </div>

      <div className="bg-[#FFFCF4] p-6 md:p-7 rounded-[2rem] border-[3px] border-black shadow-[7px_7px_0_0_rgba(0,0,0,0.12)] mb-8 flex flex-col md:flex-row gap-4 items-center z-20 relative">
        <div className="w-full md:w-1/2 relative">
          <label className="sr-only" htmlFor="capital-search">
            {copy.searchPlaceholder}
          </label>
          <input
            id="capital-search"
            type="text"
            placeholder={copy.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border-[3px] border-black p-4 rounded-xl font-black text-sm italic uppercase focus:outline-none focus:border-[#FFD100] transition-colors"
          />
        </div>

        <div className="w-full md:w-1/2">
          <label className="sr-only" htmlFor="capital-category">
            {copy.allCategories}
          </label>
          <select
            id="capital-category"
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
      </div>

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <p className="max-w-3xl text-xs font-semibold leading-relaxed text-neutral-800 md:text-sm">
          {copy.safetyNote}
        </p>
        <p className="shrink-0 text-[11px] font-black uppercase tracking-widest text-black">
          {filteredBuyers.length} {copy.filterCountLabel}
        </p>
      </div>

      <section aria-label={copy.eyebrow}>
        {filteredBuyers.length > 0 ? (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 list-none p-0 m-0">
            {filteredBuyers.map((buyer) => (
              <li key={buyer.id}>
                <DemandCard
                  id={buyer.id}
                  targetAsset={buyer.target_asset}
                  category={buyer.category || ""}
                  budget={formatDemandBudget(buyer.budget_min, buyer.budget, locale)}
                  description={buyer.description ?? ""}
                  requirements={buyer.requirements}
                  buyerVerified={buyer.buyer_verified}
                  expiresAt={buyer.expires_at}
                  locale={locale}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-20 bg-white border-[3px] border-black rounded-[2rem] shadow-[7px_7px_0_0_rgba(0,0,0,0.12)]">
            <h2 className="text-2xl md:text-3xl font-black uppercase italic mb-3">
              {copy.emptyTitle}
            </h2>
            <p className="text-neutral-700 font-bold mb-8">{copy.emptyBody}</p>
            <Link
              href="/posteaza-cerere"
              className="inline-block w-full sm:w-auto bg-black text-[#FFD100] px-8 py-4 rounded-xl border-[3px] border-black font-black uppercase text-xs italic shadow-[4px_4px_0_0_#FFD100]"
            >
              {copy.emptyCta}
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
