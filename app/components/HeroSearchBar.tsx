"use client";

import { FormEvent, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";
import { trackEvent } from "@/lib/analytics";
import { ROMANIA_COUNTIES } from "@/lib/romaniaLocations";

type HeroSearchBarProps = {
  initialQuery?: string;
  initialCounty?: string;
  source?: string;
};

export default function HeroSearchBar({
  initialQuery = "",
  initialCounty = "",
  source = "home_hero",
}: HeroSearchBarProps) {
  const t = useTranslations("HeroSearch");
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [county, setCounty] = useState(initialCounty);

  const countyOptions = useMemo(
    () => ROMANIA_COUNTIES.map((name) => ({ value: name, label: name })),
    [],
  );

  function submitSearch(event?: FormEvent) {
    event?.preventDefault();
    const q = query.trim();
    const loc = county.trim();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (loc) params.set("county", loc);
    const qs = params.toString();
    trackEvent("search_listings", {
      source,
      has_query: q.length > 0,
      has_location: loc.length > 0,
    });
    router.push(qs ? `/cauta?${qs}` : "/cauta");
  }

  const fieldClass =
    "min-h-12 w-full bg-transparent px-4 py-3 text-sm font-semibold text-black placeholder:text-neutral-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#FFD100] md:min-h-[3.25rem] md:text-[15px]";

  return (
    <div className="flex w-full max-w-3xl flex-col items-stretch">
      <form
        onSubmit={submitSearch}
        className="flex w-full flex-col overflow-hidden rounded-2xl border-[3px] border-black bg-[#FDFCF8] text-left shadow-[6px_6px_0_0_rgba(0,0,0,1)] md:flex-row md:items-stretch"
      >
        <label className="flex min-w-0 flex-1 flex-col border-b-[3px] border-black md:border-b-0 md:border-r-[3px]">
          <span className="sr-only">{t("queryLabel")}</span>
          <input
            type="search"
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("placeholder")}
            autoComplete="off"
            className={fieldClass}
          />
        </label>
        <label className="flex min-w-0 flex-1 flex-col border-b-[3px] border-black md:border-b-0 md:border-r-[3px]">
          <span className="sr-only">{t("locationLabel")}</span>
          <select
            name="county"
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            className={`${fieldClass} cursor-pointer appearance-none bg-[#FDFCF8]`}
          >
            <option value="">{t("locationDefault")}</option>
            {countyOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center bg-black px-6 text-sm font-black uppercase tracking-widest text-[#FFD100] transition hover:bg-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD100] md:min-h-[3.25rem] md:min-w-[8.5rem] md:px-8 md:text-[13px]"
        >
          {t("action")}
        </button>
      </form>
      <p className="mt-2.5 text-center text-[11px] font-semibold text-neutral-500 md:text-xs">
        {t("hint")}
      </p>
    </div>
  );
}
