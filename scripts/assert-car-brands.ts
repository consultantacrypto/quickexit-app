import { readFileSync } from "node:fs";
import {
  CAR_BRANDS,
  carBrandSuggestions,
  filterCarBrands,
  isForbiddenOtherBrandToken,
  isKnownCarBrand,
  sanitizeCarBrandInput,
} from "../lib/carBrands";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const required = [
  "Abarth",
  "Alfa Romeo",
  "Aston Martin",
  "Audi",
  "Bentley",
  "BMW",
  "BYD",
  "Cadillac",
  "Chevrolet",
  "Citroën",
  "Cupra",
  "Dacia",
  "Dodge",
  "DS Automobiles",
  "Ferrari",
  "Fiat",
  "Ford",
  "Genesis",
  "GMC",
  "Honda",
  "Hongqi",
  "Hyundai",
  "Infiniti",
  "Isuzu",
  "Jaguar",
  "Jeep",
  "Kia",
  "Lamborghini",
  "Lancia",
  "Land Rover",
  "Lexus",
  "Li Auto",
  "Lotus",
  "Maserati",
  "Mazda",
  "McLaren",
  "Mercedes-Benz",
  "MG",
  "MINI",
  "Mitsubishi",
  "NIO",
  "Nissan",
  "Opel",
  "Peugeot",
  "Polestar",
  "Porsche",
  "Renault",
  "Rolls-Royce",
  "Saab",
  "SEAT",
  "Škoda",
  "Smart",
  "Subaru",
  "Suzuki",
  "Tesla",
  "Toyota",
  "Volkswagen",
  "Volvo",
  "Xiaomi",
  "XPeng",
  "Zeekr",
];

for (const brand of required) {
  assert(CAR_BRANDS.includes(brand as (typeof CAR_BRANDS)[number]), `list includes ${brand}`);
}

assert(!CAR_BRANDS.some((brand) => /alt[aă] marc/i.test(brand)), "no Other brand token in list");
assert(isForbiddenOtherBrandToken("Altă marcă"), "other-brand label is rejected");
assert(sanitizeCarBrandInput("Altă marcă") === "", "other-brand is not saved");
assert(filterCarBrands("skoda").includes("Škoda"), "diacritic-insensitive Skoda");
assert(filterCarBrands("citroen").includes("Citroën"), "diacritic-insensitive Citroen");
assert(sanitizeCarBrandInput("bmw") === "BMW", "known brand canonicalized on commit");
assert(sanitizeCarBrandInput("ARO") === "ARO", "legacy custom make is kept");
assert(!isKnownCarBrand("ARO"), "legacy ARO stays custom");
assert(carBrandSuggestions("", "ARO")[0] === "ARO", "legacy value remains selectable");
assert(carBrandSuggestions("dac", "ARO").includes("Dacia"), "list still searchable");

const publish = readFileSync("app/[locale]/pune-anunt/PuneAnuntClient.tsx", "utf8");
const editor = readFileSync("app/[locale]/editeaza-anunt/[id]/page.tsx", "utf8");
assert(publish.includes("CarBrandCombobox"), "publish uses combobox");
assert(publish.includes("formData.make"), "publish still writes make");
assert(editor.includes("CarBrandCombobox"), "editor uses combobox");
assert(editor.includes('updateField("make"'), "editor still writes details.make");

console.log("OK car-brands");
