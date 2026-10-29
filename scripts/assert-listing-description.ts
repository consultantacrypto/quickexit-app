import {
  mergePastedListingDescription,
  normalizeListingDescription,
  normalizePastedListingDescription,
} from "../lib/listingDescription";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const pasted =
  "VOLKSWAGEN ID.ERA 9X ULTRA AWD EDITION (2026) | 510 CP | Extended Range Electric\n" +
  "Date cheie:Putere: 510 CP / \n" +
  "Tracțiune AWDMotorizare: Extended Range Electric Vehicle (EREV)Baterie & Autonomie: 65.2 kWh / 340 km rulare 100% electrică\n" +
  'An Fabricație: 2026Kilometraj: 4.000 km (Rulaj minim / "Used - Like New")Culoare: Negru (Black)\n' +
  "Preț Final România: 69.990 € (Transport și formalități vamale incluse)\n" +
  "Status: Disponibil la comandă (Automobil verificat și pregătit pentru exploatare).\n" +
  'Despre acest activ / Argumentul "Smart Money":\n' +
  "DECONTARE EXCLUSIV ÎN SISTEM FIAT PENTRU IMPORTURILE LA COMANDĂ.Uită de anxietate.\n" +
  "Când ai nevoie de performanță îți garantează o dinamică de invidiat.O mașină produsă în 2026.\n" +
  "reprezintă o optimizare clară a lichidităților tale.Deschide o cameră de negociere.";

const normalized = normalizeListingDescription(pasted);

assert(normalized.includes("ID.ERA"), "model name stays intact");
assert(!normalized.includes("ID.\nERA"), "abbreviation ID.ERA is not split");
assert(normalized.includes("Date cheie:\nPutere:"), "glued label after colon breaks");
assert(normalized.includes("Tracțiune AWD\nMotorizare:"), "acronym glued to the next label breaks");
assert(normalized.includes("(EREV)\nBaterie & Autonomie:"), "label after closing paren breaks");
assert(normalized.includes("2026\nKilometraj:"), "label glued to a year breaks");
assert(normalized.includes('New")\nCuloare:'), "label after a closing quote breaks");
assert(normalized.includes('Argumentul "Smart Money":'), "quoted label stays on one line");
assert(normalized.includes("COMANDĂ.\nUită"), "glued sentence after a period breaks");
assert(normalized.includes("invidiat.\nO mașină"), "single-letter sentence start breaks");
assert(normalized.includes("tale.\nDeschide"), "glued sentence after a short word breaks");
assert(normalizeListingDescription(normalized) === normalized, "normalizer is idempotent");

assert(
  normalizeListingDescription("Mașină bună, un proprietar.") === "Mașină bună, un proprietar.",
  "short hand-typed description is unchanged",
);
assert(
  normalizeListingDescription("Notă: text pe aceeași linie cu spațiu.") ===
    "Notă: text pe aceeași linie cu spațiu.",
  "spaced colon stays on one line",
);
assert(
  normalizeListingDescription("Preț: 10.000 euro, negociabil.") === "Preț: 10.000 euro, negociabil.",
  "decimal price is unchanged",
);
assert(
  normalizeListingDescription("Date cheie:\n\nPutere: 407 CP / Tracțiune 4WD\n\nMotorizare: 1.5") ===
    "Date cheie:\n\nPutere: 407 CP / Tracțiune 4WD\n\nMotorizare: 1.5",
  "already wrapped description is unchanged",
);
assert(
  normalizeListingDescription("Vezi https://www.quickexit.ro/ro azi.") ===
    "Vezi https://www.quickexit.ro/ro azi.",
  "url is unchanged",
);
assert(
  normalizeListingDescription("Vezi www.QuickExit.ro azi.") === "Vezi www.QuickExit.ro azi.",
  "www host is unchanged",
);
assert(
  normalizeListingDescription("Firmă S.R.L. activă în Cluj.") === "Firmă S.R.L. activă în Cluj.",
  "initialism is unchanged",
);
assert(
  normalizeListingDescription("McLaren: un exemplar.") === "McLaren: un exemplar.",
  "camel-case name is unchanged",
);
assert(
  normalizeListingDescription("Windows line\r\nsecond") === "Windows line\nsecond",
  "CRLF becomes LF",
);
assert(
  normalizeListingDescription("old mac\rsecond") === "old mac\nsecond",
  "bare CR becomes LF",
);
assert(
  normalizeListingDescription("row<br>next") === "row\nnext",
  "literal br becomes a line break and stays text",
);
assert(
  normalizeListingDescription("Cuplu: 1.410 NmCombustibil: Plug-In Hybrid") ===
    "Cuplu: 1.410 Nm\nCombustibil: Plug-In Hybrid",
  "unit glued to the next label breaks",
);
assert(
  normalizeListingDescription("3.6L V6Kilometraj: 1.511 km") === "3.6L V6\nKilometraj: 1.511 km",
  "engine code is not split, the following label is",
);
assert(
  normalizeListingDescription('negri)   Interior: Piele') === "negri)\nInterior: Piele",
  "spaces before a glued label become a line break",
);

const fromHtml = normalizePastedListingDescription(
  "Date cheie:Putere: 510 CP",
  "<p>Date cheie:</p><p>Putere: 510 CP</p>",
);
assert(fromHtml.includes("Date cheie:\nPutere:"), "rich-text paste without plain breaks is recovered");

const keepsPlain = normalizePastedListingDescription(
  "Deja\ncorect",
  "<p>Deja</p><p>alt text mult mai lung care nu trebuie folosit</p>",
);
assert(keepsPlain === "Deja\ncorect", "plain text that already has breaks wins over html");

const merged = mergePastedListingDescription("prefix ", 7, 7, "Date cheie:Putere: 1", "");
assert(merged?.value === "prefix Date cheie:\nPutere: 1", "paste merges into the current value");
assert(merged?.caret === "prefix Date cheie:\nPutere: 1".length, "caret sits after the pasted text");
assert(
  mergePastedListingDescription("abc", 1, 1, "x", "") === null,
  "unchanged paste is left to the textarea",
);

console.log("ok listing description");
