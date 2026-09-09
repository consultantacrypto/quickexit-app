"use client";

import { useTranslations } from "next-intl";
import {
  BUCHAREST_DISTRICTS,
  ROMANIA_CITIES_BY_COUNTY,
  ROMANIA_COUNTIES,
  canonicalRomaniaCounty,
  type RomaniaCounty,
} from "@/lib/romaniaLocations";

type LocationFormValue = {
  country_code?: string;
  county?: string;
  city?: string;
  district?: string;
};

type ListingLocationFieldsProps = {
  value: LocationFormValue;
  onChange: (patch: LocationFormValue) => void;
  showDistrict?: boolean;
  idPrefix?: string;
  required?: boolean;
};

const inputClass =
  "w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD100]";

export default function ListingLocationFields({
  value,
  onChange,
  showDistrict = true,
  idPrefix = "listing-location",
  required = true,
}: ListingLocationFieldsProps) {
  const t = useTranslations("ListingLocation");
  const county = value.county ?? "";
  const city = value.city ?? "";
  const district = value.district ?? "";
  const canonicalCounty = county ? canonicalRomaniaCounty(county) : null;
  const cityOptions: readonly string[] = canonicalCounty
    ? ROMANIA_CITIES_BY_COUNTY[canonicalCounty]
    : [];
  const isBucharest = canonicalCounty === "București";

  function patch(next: Partial<LocationFormValue>) {
    const merged = {
      country_code: "RO",
      county,
      city,
      district,
      ...next,
    };
    onChange(merged);
  }

  return (
    <div className="md:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
      <input type="hidden" name="country_code" value="RO" />
      <div>
        <label htmlFor={`${idPrefix}-county`} className="text-[10px] font-black uppercase tracking-widest text-gray-500">
          {t("countyLabel")}
          {required ? " *" : ""}
        </label>
        <select
          id={`${idPrefix}-county`}
          required={required}
          value={county}
          onChange={(e) => {
            const nextCounty = e.target.value;
            const nextCanonical = nextCounty ? canonicalRomaniaCounty(nextCounty) : null;
            patch({
              county: nextCounty,
              city: nextCanonical === "București" ? "București" : "",
              district: "",
            });
          }}
          className={`${inputClass} appearance-none`}
        >
          <option value="">{t("countyPlaceholder")}</option>
          {ROMANIA_COUNTIES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-city`} className="text-[10px] font-black uppercase tracking-widest text-gray-500">
          {t("cityLabel")}
          {required ? " *" : ""}
        </label>
        <input
          id={`${idPrefix}-city`}
          list={`${idPrefix}-city-list`}
          required={required}
          value={isBucharest ? "București" : city}
          readOnly={isBucharest}
          onChange={(e) => patch({ city: e.target.value })}
          placeholder={t("cityPlaceholder")}
          autoComplete="off"
          className={inputClass}
        />
        <datalist id={`${idPrefix}-city-list`}>
          {cityOptions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>
      {showDistrict ? (
        <div className={isBucharest ? "md:col-span-2" : "md:col-span-2"}>
          <label htmlFor={`${idPrefix}-district`} className="text-[10px] font-black uppercase tracking-widest text-gray-500">
            {isBucharest ? t("sectorLabel") : t("districtLabel")}
          </label>
          {isBucharest ? (
            <select
              id={`${idPrefix}-district`}
              value={district}
              onChange={(e) => patch({ city: "București", district: e.target.value })}
              className={`${inputClass} appearance-none`}
            >
              <option value="">{t("sectorPlaceholder")}</option>
              {BUCHAREST_DISTRICTS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={`${idPrefix}-district`}
              value={district}
              onChange={(e) => patch({ district: e.target.value })}
              placeholder={t("districtPlaceholder")}
              autoComplete="off"
              className={inputClass}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

export type { RomaniaCounty };
