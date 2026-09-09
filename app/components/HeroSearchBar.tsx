"use client";

import { FormEvent, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";
import { trackEvent } from "@/lib/analytics";
import {
  decodeRomaniaLocationSearchValue,
  encodeRomaniaLocationSearchValue,
  romaniaLocationSearchOptions,
} from "@/lib/romaniaLocations";

type HeroSearchBarProps = {
  initialQuery?: string;
  initialCounty?: string;
  initialCity?: string;
  initialDistrict?: string;
  source?: string;
};

export default function HeroSearchBar({
  initialQuery = "",
  initialCounty = "",
  initialCity = "",
  initialDistrict = "",
  source = "home_hero",
}: HeroSearchBarProps) {
  const t = useTranslations("HeroSearch");
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [locationToken, setLocationToken] = useState(() =>
    encodeRomaniaLocationSearchValue({
      county: initialCounty,
      city: initialCity,
      district: initialDistrict,
    }),
  );

  const locationOptions = useMemo(() => romaniaLocationSearchOptions(), []);
  const countyOptions = locationOptions.filter((opt) => opt.group === "county");
  const cityOptions = locationOptions.filter((opt) => opt.group === "city");
  const districtOptions = locationOptions.filter((opt) => opt.group === "district");

  function submitSearch(event?: FormEvent) {
    event?.preventDefault();
    const q = query.trim();
    const loc = decodeRomaniaLocationSearchValue(locationToken);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (loc.county) params.set("county", loc.county);
    if (loc.city) params.set("city", loc.city);
    if (loc.district) params.set("district", loc.district);
    const qs = params.toString();
    trackEvent("search_listings", {
      source,
      has_query: q.length > 0,
      has_location: Boolean(loc.county || loc.city || loc.district),
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
            name="location"
            value={locationToken}
            onChange={(e) => setLocationToken(e.target.value)}
            className={`${fieldClass} max-w-full cursor-pointer appearance-none truncate bg-[#FDFCF8]`}
          >
            <option value="">{t("locationDefault")}</option>
            <optgroup label={t("groupCounties")}>
              {countyOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </optgroup>
            <optgroup label={t("groupCities")}>
              {cityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </optgroup>
            <optgroup label={t("groupDistricts")}>
              {districtOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </optgroup>
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
