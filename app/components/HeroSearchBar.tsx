"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";
import { trackEvent } from "@/lib/analytics";
import {
  foldRo,
  formatTypedLocationSearch,
  resolveTypedLocationSearch,
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
  const locationBoxRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [locationText, setLocationText] = useState(() =>
    formatTypedLocationSearch({
      county: initialCounty,
      city: initialCity,
      district: initialDistrict,
    }),
  );
  const [locationOpen, setLocationOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const locationOptions = useMemo(() => romaniaLocationSearchOptions(), []);
  const filteredLocationOptions = useMemo(() => {
    const needle = foldRo(locationText);
    if (!needle) return [];
    return locationOptions.filter((opt) => foldRo(opt.label).includes(needle)).slice(0, 12);
  }, [locationOptions, locationText]);

  function applyLocationSuggestion(label: string) {
    setLocationText(label);
    setLocationOpen(false);
  }

  function submitSearch(event?: FormEvent) {
    event?.preventDefault();
    const q = query.trim();
    const loc = resolveTypedLocationSearch(locationText);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (!loc.invalid) {
      if (loc.county) params.set("county", loc.county);
      if (loc.city) params.set("city", loc.city);
      if (loc.district) params.set("district", loc.district);
    }
    const qs = params.toString();
    trackEvent("search_listings", {
      source,
      has_query: q.length > 0,
      has_location: Boolean(!loc.invalid && (loc.county || loc.city || loc.district)),
    });
    router.push(qs ? `/cauta?${qs}` : "/cauta");
  }

  const fieldClass =
    "min-h-12 w-full bg-transparent px-4 py-3 text-sm font-semibold text-black placeholder:text-neutral-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#FFD100] md:min-h-[3.25rem] md:text-[15px]";

  return (
    <div className="flex w-full max-w-3xl flex-col items-stretch">
      <form
        onSubmit={submitSearch}
        className="flex w-full flex-col rounded-2xl border-[3px] border-black bg-[#FDFCF8] text-left shadow-[6px_6px_0_0_rgba(0,0,0,1)] md:flex-row md:items-stretch"
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
        <div ref={locationBoxRef} className="relative flex min-w-0 flex-1 flex-col">
          <label className="flex min-w-0 flex-1 flex-col border-b-[3px] border-black md:border-b-0 md:border-r-[3px]">
            <span className="sr-only">{t("locationLabel")}</span>
            <input
              type="text"
              name="location"
              role="combobox"
              aria-expanded={locationOpen}
              aria-controls="hero-location-suggestions"
              aria-autocomplete="list"
              value={locationText}
              onChange={(e) => {
                setLocationText(e.target.value);
                setHighlight(0);
                setLocationOpen(true);
              }}
              onFocus={() => setLocationOpen(true)}
              onBlur={() => {
                window.setTimeout(() => {
                  if (!locationBoxRef.current?.contains(document.activeElement)) {
                    setLocationOpen(false);
                  }
                }, 0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" && filteredLocationOptions.length > 0) {
                  e.preventDefault();
                  setLocationOpen(true);
                  setHighlight((index) => (index + 1) % filteredLocationOptions.length);
                  return;
                }
                if (e.key === "ArrowUp" && filteredLocationOptions.length > 0) {
                  e.preventDefault();
                  setLocationOpen(true);
                  setHighlight((index) =>
                    (index - 1 + filteredLocationOptions.length) % filteredLocationOptions.length,
                  );
                  return;
                }
                if (e.key === "Escape") {
                  setLocationOpen(false);
                  return;
                }
                if (e.key === "Enter" && locationOpen && filteredLocationOptions[highlight]) {
                  e.preventDefault();
                  applyLocationSuggestion(filteredLocationOptions[highlight].label);
                }
              }}
              placeholder={t("locationDefault")}
              autoComplete="off"
              className={fieldClass}
            />
          </label>
          {locationOpen && filteredLocationOptions.length > 0 ? (
            <ul
              id="hero-location-suggestions"
              role="listbox"
              className="absolute left-0 right-0 top-full z-20 max-h-64 overflow-auto border-[3px] border-t-0 border-black bg-[#FDFCF8] text-left shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
            >
              {filteredLocationOptions.map((opt, index) => (
                <li key={opt.value} role="option" aria-selected={index === highlight}>
                  <button
                    type="button"
                    className={`block w-full px-4 py-2.5 text-left text-sm font-semibold ${
                      index === highlight ? "bg-[#FFD100] text-black" : "text-black hover:bg-white"
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => applyLocationSuggestion(opt.label)}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
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
