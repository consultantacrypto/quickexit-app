"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MapPin, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";
import { trackEvent } from "@/lib/analytics";
import {
  foldRo,
  formatTypedLocationSearch,
  resolveTypedLocationSearch,
  romaniaLocationSearchOptions,
  type RomaniaLocationSearchOption,
} from "@/lib/romaniaLocations";

type HeroSearchBarProps = {
  initialQuery?: string;
  initialCountry?: string;
  initialCounty?: string;
  initialCity?: string;
  initialDistrict?: string;
  source?: string;
};

function LocationOptionContent({ opt }: { opt: RomaniaLocationSearchOption }) {
  if (opt.group === "city" || opt.group === "district") {
    const idx = opt.label.lastIndexOf(", ");
    if (idx > 0) {
      return (
        <>
          <span className="font-semibold text-black">{opt.label.slice(0, idx)}</span>
          <span className="font-medium text-neutral-500">{opt.label.slice(idx)}</span>
        </>
      );
    }
  }
  return (
    <span
      className={
        opt.group === "county" || opt.group === "country"
          ? "font-medium text-neutral-700"
          : "font-semibold text-black"
      }
    >
      {opt.label}
    </span>
  );
}

export default function HeroSearchBar({
  initialQuery = "",
  initialCountry = "",
  initialCounty = "",
  initialCity = "",
  initialDistrict = "",
  source = "home_hero",
}: HeroSearchBarProps) {
  const t = useTranslations("HeroSearch");
  const router = useRouter();
  const locationBoxRef = useRef<HTMLDivElement | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLUListElement | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [locationText, setLocationText] = useState(() =>
    formatTypedLocationSearch({
      country: initialCountry,
      county: initialCounty,
      city: initialCity,
      district: initialDistrict,
    }),
  );
  const [locationOpen, setLocationOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const locationOptions = useMemo(() => romaniaLocationSearchOptions(), []);
  const filteredLocationOptions = useMemo(() => {
    const needle = foldRo(locationText);
    if (!needle) {
      return locationOptions.filter((opt) => opt.group === "county").slice(0, 12);
    }
    return locationOptions.filter((opt) => foldRo(opt.label).includes(needle)).slice(0, 12);
  }, [locationOptions, locationText]);

  function syncMenuRect() {
    const el = locationBoxRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuRect({
      top: rect.bottom + 7,
      left: rect.left,
      width: rect.width,
    });
  }

  useEffect(() => {
    if (!locationOpen) return;
    syncMenuRect();
    const onReposition = () => syncMenuRect();
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (locationBoxRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setLocationOpen(false);
    };
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [locationOpen]);

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
      if (loc.country) params.set("country", loc.country);
      if (loc.county) params.set("county", loc.county);
      if (loc.city) params.set("city", loc.city);
      if (loc.district) params.set("district", loc.district);
    }
    const qs = params.toString();
    trackEvent("search_listings", {
      source,
      has_query: q.length > 0,
      has_location: Boolean(!loc.invalid && (loc.country || loc.county || loc.city || loc.district)),
    });
    router.push(qs ? `/cauta?${qs}` : "/cauta");
  }

  const fieldClass =
    "h-full w-full bg-transparent text-sm font-semibold text-black placeholder:text-neutral-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#FFD100] md:text-[15px]";

  const listbox =
    locationOpen && filteredLocationOptions.length > 0 && menuRect
      ? createPortal(
          <ul
            ref={menuRef}
            id="hero-location-suggestions"
            role="listbox"
            className="max-h-[240px] overflow-auto rounded-[12px] border-2 border-black bg-white text-left shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
            style={{
              position: "fixed",
              top: menuRect.top,
              left: menuRect.left,
              width: menuRect.width,
              zIndex: 80,
            }}
          >
            {filteredLocationOptions.map((opt, index) => (
              <li key={opt.value} role="option" aria-selected={index === highlight} id={`hero-location-opt-${index}`}>
                <button
                  type="button"
                  className={`flex h-12 w-full items-center px-3.5 text-left text-sm ${
                    index === highlight ? "bg-[#FFF6CC] text-black" : "bg-white text-black hover:bg-[#FFF6CC]"
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => applyLocationSuggestion(opt.label)}
                >
                  <LocationOptionContent opt={opt} />
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div className="w-full max-w-[900px]">
      <form
        onSubmit={submitSearch}
        className="overflow-visible rounded-2xl border-[3px] border-black bg-white text-left shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
      >
        <div className="flex flex-col md:h-14 md:flex-row md:items-center">
          <label className="flex h-14 min-w-0 flex-[1.15] items-center gap-2.5 px-3.5 md:h-full md:px-4">
            <Search className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden />
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
          <div className="hidden h-7 w-px shrink-0 bg-black/20 md:block" aria-hidden />
          <div className="flex h-14 min-w-0 flex-1 items-center border-t border-black/10 md:h-full md:border-t-0">
            <div ref={locationBoxRef} className="relative flex h-full min-w-0 flex-1 items-center gap-2.5 px-3.5 md:px-3">
              <MapPin className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden />
              <label className="flex h-full min-w-0 flex-1 items-center">
                <span className="sr-only">{t("locationLabel")}</span>
                <input
                  ref={locationInputRef}
                  type="text"
                  name="location"
                  role="combobox"
                  aria-expanded={locationOpen}
                  aria-controls="hero-location-suggestions"
                  aria-autocomplete="list"
                  aria-activedescendant={
                    locationOpen && filteredLocationOptions[highlight]
                      ? `hero-location-opt-${highlight}`
                      : undefined
                  }
                  value={locationText}
                  onChange={(e) => {
                    setLocationText(e.target.value);
                    setHighlight(0);
                    setLocationOpen(true);
                  }}
                  onFocus={() => {
                    setLocationOpen(true);
                    syncMenuRect();
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
            </div>
            <div className="h-7 w-px shrink-0 bg-black/15" aria-hidden />
            <button
              type="submit"
              className="mx-1.5 inline-flex h-11 min-w-[5.5rem] shrink-0 items-center justify-center rounded-xl bg-[#FFD100] px-3.5 text-[11px] font-black uppercase tracking-widest text-black transition hover:bg-[#ffe14d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black md:min-w-[6.25rem] md:px-4 md:text-[12px]"
            >
              {t("action")}
            </button>
          </div>
        </div>
      </form>
      {listbox}
    </div>
  );
}
