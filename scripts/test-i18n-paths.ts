import { readFileSync } from "node:fs";
import { getPathname } from "../src/i18n/navigation";
import { normalizeAppPath } from "../src/i18n/paths";

const cases = [
  "/anunt/test-id",
  "/categorii/auto",
  "/trimite-oferta/abc",
  "/ro/anunt/test-id",
  "/en/categorii/auto",
] as const;

console.log("=== getPathname (next-intl) ===");
for (const locale of ["ro", "en"] as const) {
  console.log(`\nlocale: ${locale}`);
  for (const href of cases) {
    console.log(`  ${href} -> ${getPathname({ href, locale })}`);
  }
}

console.log("\n=== normalizeAppPath (sanitizer) ===");
for (const href of cases) {
  console.log(`  ${href} -> ${normalizeAppPath(href)}`);
}

const htmlPath = ".tmp-home2.html";
try {
  const html = readFileSync(htmlPath, "utf8");
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  const anunt = hrefs.filter((h) => h.includes("anunt"));
  const categorii = hrefs.filter((h) => h.includes("categorii"));
  const doubled = hrefs.filter((h) => /\/(ro|en)\/(ro|en)\//.test(h));

  console.log(`\n=== SSR snapshot (${htmlPath}) ===`);
  console.log(`  total hrefs: ${hrefs.length}`);
  console.log(`  anunt hrefs: ${anunt.length}`, anunt.slice(0, 5));
  console.log(`  categorii hrefs: ${categorii.length}`, categorii.slice(0, 5));
  console.log(`  doubled locale prefix: ${doubled.length}`, doubled.slice(0, 5));
} catch {
  console.log(`\n(skip SSR snapshot — ${htmlPath} not found)`);
}
