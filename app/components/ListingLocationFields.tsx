"use client";

import { useTranslations } from "next-intl";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import {
  BUCHAREST_DISTRICTS,
  ROMANIA_CITIES_BY_COUNTY,
  ROMANIA_COUNTIES,
  ROMANIA_COUNTRIES_DEFAULT,
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
  const country_code = (value.country_code || ROMANIA_COUNTRIES_DEFAULT).toUpperCase();
  const county = value.county ?? "";
  const city = value.city ?? "";
  const district = value.district ?? "";
  const isRomania = country_code === "RO";
  const canonicalCounty = isRomania && county ? canonicalRomaniaCounty(county) : null;
  const cityOptions: readonly string[] = canonicalCounty
    ? ROMANIA_CITIES_BY_COUNTY[canonicalCounty]
    : [];
  const isBucharest = canonicalCounty === "București";

  function patch(next: Partial<LocationFormValue>) {
    onChange({
      country_code,
      county,
      city,
      district,
      ...next,
    });
  }

  return (
    <div className="md:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <p className="text-[11px] font-semibold leading-relaxed text-neutral-600">{t("helper")}</p>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-country`} className="text-[10px] font-black uppercase tracking-widest text-gray-500">
          {t("countryLabel")}
          {required ? " *" : ""}
        </label>
        <select
          id={`${idPrefix}-country`}
          name="country_code"
          required={required}
          value={country_code}
          onChange={(e) => {
            const nextCountry = e.target.value.toUpperCase() || ROMANIA_COUNTRIES_DEFAULT;
            patch({
              country_code: nextCountry,
              county: "",
              city: "",
              district: "",
            });
          }}
          className={`${inputClass} appearance-none`}
        >
          {COUNTRY_OPTIONS.map((country) => (
            <option key={country.code} value={country.code}>
              {country.nameRo}
            </option>
          ))}
        </select>
      </div>
      {isRomania ? (
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
      ) : (
        <div>
          <label htmlFor={`${idPrefix}-region`} className="text-[10px] font-black uppercase tracking-widest text-gray-500">
            {t("regionLabel")}
          </label>
          <input
            id={`${idPrefix}-region`}
            value={county}
            onChange={(e) => patch({ county: e.target.value })}
            placeholder={t("regionPlaceholder")}
            autoComplete="off"
            className={inputClass}
          />
        </div>
      )}
      <div>
        <label htmlFor={`${idPrefix}-city`} className="text-[10px] font-black uppercase tracking-widest text-gray-500">
          {t("cityLabel")}
          {required ? " *" : ""}
        </label>
        <input
          id={`${idPrefix}-city`}
          list={isRomania ? `${idPrefix}-city-list` : undefined}
          required={required}
          value={isBucharest ? "București" : city}
          readOnly={isBucharest}
          onChange={(e) => patch({ city: e.target.value })}
          placeholder={t("cityPlaceholder")}
          autoComplete="off"
          className={inputClass}
        />
        {isRomania ? (
          <datalist id={`${idPrefix}-city-list`}>
            {cityOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        ) : null}
      </div>
      {showDistrict ? (
        <div className="md:col-span-2">
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
