import { foldLocationSearch } from "@/lib/locationFold";

export type CountryOption = {
  code: string;
  nameRo: string;
  nameEn: string;
};

/** ISO 3166-1 alpha-2 subset for listing location. Romania is first in selectors. */
export const COUNTRY_OPTIONS: readonly CountryOption[] = [
  { code: "RO", nameRo: "România", nameEn: "Romania" },
  { code: "MD", nameRo: "Republica Moldova", nameEn: "Moldova" },
  { code: "DE", nameRo: "Germania", nameEn: "Germany" },
  { code: "IT", nameRo: "Italia", nameEn: "Italy" },
  { code: "FR", nameRo: "Franța", nameEn: "France" },
  { code: "ES", nameRo: "Spania", nameEn: "Spain" },
  { code: "PT", nameRo: "Portugalia", nameEn: "Portugal" },
  { code: "NL", nameRo: "Țările de Jos", nameEn: "Netherlands" },
  { code: "BE", nameRo: "Belgia", nameEn: "Belgium" },
  { code: "AT", nameRo: "Austria", nameEn: "Austria" },
  { code: "CH", nameRo: "Elveția", nameEn: "Switzerland" },
  { code: "HU", nameRo: "Ungaria", nameEn: "Hungary" },
  { code: "BG", nameRo: "Bulgaria", nameEn: "Bulgaria" },
  { code: "GR", nameRo: "Grecia", nameEn: "Greece" },
  { code: "PL", nameRo: "Polonia", nameEn: "Poland" },
  { code: "CZ", nameRo: "Cehia", nameEn: "Czechia" },
  { code: "SK", nameRo: "Slovacia", nameEn: "Slovakia" },
  { code: "SI", nameRo: "Slovenia", nameEn: "Slovenia" },
  { code: "HR", nameRo: "Croația", nameEn: "Croatia" },
  { code: "RS", nameRo: "Serbia", nameEn: "Serbia" },
  { code: "UA", nameRo: "Ucraina", nameEn: "Ukraine" },
  { code: "TR", nameRo: "Turcia", nameEn: "Turkey" },
  { code: "GB", nameRo: "Regatul Unit", nameEn: "United Kingdom" },
  { code: "IE", nameRo: "Irlanda", nameEn: "Ireland" },
  { code: "SE", nameRo: "Suedia", nameEn: "Sweden" },
  { code: "NO", nameRo: "Norvegia", nameEn: "Norway" },
  { code: "DK", nameRo: "Danemarca", nameEn: "Denmark" },
  { code: "FI", nameRo: "Finlanda", nameEn: "Finland" },
  { code: "US", nameRo: "Statele Unite", nameEn: "United States" },
  { code: "CA", nameRo: "Canada", nameEn: "Canada" },
  { code: "CN", nameRo: "China", nameEn: "China" },
  { code: "JP", nameRo: "Japonia", nameEn: "Japan" },
  { code: "KR", nameRo: "Coreea de Sud", nameEn: "South Korea" },
  { code: "AE", nameRo: "Emiratele Arabe Unite", nameEn: "United Arab Emirates" },
  { code: "QA", nameRo: "Qatar", nameEn: "Qatar" },
  { code: "SA", nameRo: "Arabia Saudită", nameEn: "Saudi Arabia" },
  { code: "IL", nameRo: "Israel", nameEn: "Israel" },
  { code: "SG", nameRo: "Singapore", nameEn: "Singapore" },
  { code: "AU", nameRo: "Australia", nameEn: "Australia" },
  { code: "NZ", nameRo: "Noua Zeelandă", nameEn: "New Zealand" },
  { code: "BR", nameRo: "Brazilia", nameEn: "Brazil" },
  { code: "MX", nameRo: "Mexic", nameEn: "Mexico" },
  { code: "AR", nameRo: "Argentina", nameEn: "Argentina" },
  { code: "ZA", nameRo: "Africa de Sud", nameEn: "South Africa" },
  { code: "EG", nameRo: "Egipt", nameEn: "Egypt" },
  { code: "MA", nameRo: "Maroc", nameEn: "Morocco" },
  { code: "IN", nameRo: "India", nameEn: "India" },
  { code: "TH", nameRo: "Thailanda", nameEn: "Thailand" },
  { code: "VN", nameRo: "Vietnam", nameEn: "Vietnam" },
  { code: "ID", nameRo: "Indonezia", nameEn: "Indonesia" },
  { code: "MY", nameRo: "Malaezia", nameEn: "Malaysia" },
  { code: "PH", nameRo: "Filipine", nameEn: "Philippines" },
  { code: "HK", nameRo: "Hong Kong", nameEn: "Hong Kong" },
  { code: "TW", nameRo: "Taiwan", nameEn: "Taiwan" },
  { code: "LU", nameRo: "Luxemburg", nameEn: "Luxembourg" },
  { code: "MC", nameRo: "Monaco", nameEn: "Monaco" },
  { code: "LI", nameRo: "Liechtenstein", nameEn: "Liechtenstein" },
  { code: "AD", nameRo: "Andorra", nameEn: "Andorra" },
  { code: "MT", nameRo: "Malta", nameEn: "Malta" },
  { code: "CY", nameRo: "Cipru", nameEn: "Cyprus" },
  { code: "EE", nameRo: "Estonia", nameEn: "Estonia" },
  { code: "LV", nameRo: "Letonia", nameEn: "Latvia" },
  { code: "LT", nameRo: "Lituania", nameEn: "Lithuania" },
  { code: "IS", nameRo: "Islanda", nameEn: "Iceland" },
  { code: "AL", nameRo: "Albania", nameEn: "Albania" },
  { code: "MK", nameRo: "Macedonia de Nord", nameEn: "North Macedonia" },
  { code: "BA", nameRo: "Bosnia și Herțegovina", nameEn: "Bosnia and Herzegovina" },
  { code: "ME", nameRo: "Muntenegru", nameEn: "Montenegro" },
  { code: "XK", nameRo: "Kosovo", nameEn: "Kosovo" },
  { code: "GE", nameRo: "Georgia", nameEn: "Georgia" },
  { code: "AM", nameRo: "Armenia", nameEn: "Armenia" },
  { code: "AZ", nameRo: "Azerbaidjan", nameEn: "Azerbaijan" },
  { code: "BY", nameRo: "Belarus", nameEn: "Belarus" },
  { code: "RU", nameRo: "Rusia", nameEn: "Russia" },
] as const;

const BY_CODE = new Map(COUNTRY_OPTIONS.map((country) => [country.code, country]));

export function isIsoCountryCode(value: string): boolean {
  return /^[A-Z]{2}$/.test(value) && BY_CODE.has(value);
}

export function findCountry(raw: string | null | undefined): CountryOption | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const upper = text.toUpperCase();
  if (BY_CODE.has(upper)) return BY_CODE.get(upper) ?? null;
  const folded = foldLocationSearch(text);
  return (
    COUNTRY_OPTIONS.find(
      (country) =>
        foldLocationSearch(country.nameRo) === folded ||
        foldLocationSearch(country.nameEn) === folded,
    ) ?? null
  );
}

export function countryDisplayName(code: string, locale: string = "ro"): string {
  const country = BY_CODE.get(code.toUpperCase());
  if (!country) return code;
  return locale.toLowerCase().startsWith("en") ? country.nameEn : country.nameRo;
}

export function canonicalCountryName(code: string): string {
  return countryDisplayName(code, "ro");
}
