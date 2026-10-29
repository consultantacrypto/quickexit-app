/**
 * Listing descriptions are plain text. Pasted copy often loses the newline
 * between lines (the break is deleted, not turned into a space), so the public
 * page wraps one dense block even with `white-space: pre-wrap`.
 * This restores line breaks at render time. It does not interpret HTML.
 */

const UPPER = "A-ZĂÂÎȘȚÁÉÍÓÖÜŞŢ";
const LOWER = "a-zăâîșțăéíóöüşţ";
const LETTERS = `${UPPER}${LOWER}`;

const UPPER_CHAR = new RegExp(`[${UPPER}]`, "u");
const LOWER_CHAR = new RegExp(`[${LOWER}]`, "u");
const LETTER_CHAR = new RegExp(`[${LETTERS}]`, "u");

const QUOTED = `(?:"[^"\\n]{1,48}"|„[^”\\n]{1,48}”|“[^”\\n]{1,48}”)`;
const TOKEN = `(?:${QUOTED}|[${UPPER}][${LOWER}]+|[${LOWER}]+|[${UPPER}]{1,6}|[0-9]+(?:[${UPPER}]{1,4})?|[${UPPER}]{1,4}[0-9]+)`;
const LABEL_RE = new RegExp(
  `^(?:${TOKEN})(?:(?:[ ]*[\\/&][ ]*|[ ]+)${TOKEN}){0,5}[ ]*:`,
  "u",
);
const GLUE_PUNCT = /[0-9)\]>”'’».!?"]/u;

function labelParts(body: string): string[] {
  return body.match(new RegExp(`${QUOTED}|[${LETTERS}0-9]+`, "gu")) ?? [];
}

function isUpper(char: string): boolean {
  return UPPER_CHAR.test(char);
}

function isLower(char: string): boolean {
  return LOWER_CHAR.test(char);
}

function isLetter(char: string): boolean {
  return LETTER_CHAR.test(char);
}

function labelAt(text: string, index: number): string | null {
  const match = LABEL_RE.exec(text.slice(index, index + 120));
  LABEL_RE.lastIndex = 0;
  if (!match) return null;
  const raw = match[0];
  const body = raw.slice(0, -1).trim();
  if (body.length < 2) return null;
  const parts = labelParts(body);
  if (parts.length === 0 || parts.length > 6) return null;
  if (parts.length >= 3) {
    const caps = parts.filter((part) => {
      const inner = part.replace(/^["„“]|["”]$/gu, "");
      return inner.length > 0 && isUpper(inner[0] ?? "");
    }).length;
    if (caps < 2) return null;
  }
  return raw;
}

function shouldSplitBeforeLabel(text: string, index: number): boolean {
  if (index <= 0 || !isUpper(text[index] ?? "")) return false;
  const label = labelAt(text, index);
  if (!label) return false;
  const prev = text[index - 1] ?? "";
  if (/\s/u.test(prev)) return false;
  if (prev === '"' || prev === "„" || prev === "“" || prev === "«") {
    const beforeQuote = index >= 2 ? text[index - 2] ?? "" : "";
    if (!beforeQuote || /\s/u.test(beforeQuote)) return false;
  }

  const second = text[index + 1] ?? "";
  const titleCase = isLower(second);
  const body = label.slice(0, -1).trim();
  const parts = labelParts(body);

  if (isUpper(prev)) return titleCase;
  if (isLower(prev)) {
    let start = index - 1;
    while (start >= 0 && isLetter(text[start] ?? "")) start -= 1;
    const word = text.slice(start + 1, index);
    const multi = parts.length >= 2;
    const longSingle =
      parts.length === 1 && titleCase && body.replace(/\s+/gu, "").length >= 6;
    return word.length >= 4 || multi || longSingle;
  }
  return GLUE_PUNCT.test(prev);
}

function breakAfterColonBeforeUpper(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i] ?? "";
    out += char;
    const next = text[i + 1] ?? "";
    if (char === ":" && isUpper(next)) out += "\n";
  }
  return out;
}

function breakSpacesBeforeLabel(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    if (text[i] === " ") {
      let end = i;
      while (end < text.length && text[end] === " ") end += 1;
      if (end - i >= 2 && end < text.length && labelAt(text, end)) {
        out += "\n";
        i = end;
        continue;
      }
    }
    out += text[i] ?? "";
    i += 1;
  }
  return out;
}

function breakGluedLabels(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    if (shouldSplitBeforeLabel(text, i)) out += "\n";
    out += text[i] ?? "";
  }
  return out;
}

function breakGluedSentences(text: string): string {
  return text.replace(
    new RegExp(`([.!?])([${UPPER}])`, "gu"),
    (match, punct: string, upper: string, offset: number) => {
      const before = text.slice(0, offset);
      const wordMatch = before.match(new RegExp(`[${LETTERS}0-9]+$`, "u"));
      const word = wordMatch?.[0] ?? "";
      if (word.length < 3) return match;
      if (new RegExp(`^[${LOWER}]+$`, "u").test(word) && word.length <= 3) return match;
      const rest = upper + text.slice(offset + match.length);
      const nextWord = rest.match(new RegExp(`^[${UPPER}][${LETTERS}]*`, "u"))?.[0] ?? "";
      if (nextWord.length === 1) {
        if (!new RegExp(`^[${UPPER}]\\s+[${LOWER}]`, "u").test(rest)) return match;
      } else if (nextWord.length < 2) {
        return match;
      }
      return `${punct}\n${upper}`;
    },
  );
}

function normalizeLineEndings(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\u2028\u2029\u000b\u000c\u0085]/g, "\n")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/\s*(?:p|div|li|h[1-6]|tr|blockquote)\s*>/gi, "\n");
}

export function normalizeListingDescription(value: string): string {
  if (!value) return "";
  const prepared = normalizeLineEndings(value);
  return breakGluedSentences(
    breakGluedLabels(breakSpacesBeforeLabel(breakAfterColonBeforeUpper(prepared))),
  );
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (entity, digits: string) => {
      const code = Number(digits);
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : entity;
    })
    .replace(/&#x([0-9a-f]+);/gi, (entity, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : entity;
    });
}

function htmlPasteToText(html: string): string {
  const withBreaks = html
    .replace(/\r\n/g, "\n")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/\s*(?:p|div|li|h[1-6]|tr|blockquote)\s*>/gi, "\n");
  return decodeBasicEntities(withBreaks.replace(/<[^>]+>/g, ""));
}

/** Plain text wins when it already has breaks. HTML is used only to recover breaks from a rich paste. */
export function normalizePastedListingDescription(plain: string, html?: string): string {
  let source = plain ?? "";
  const htmlSource = html?.trim() ?? "";
  if (htmlSource && !/[\n\r\u2028\u2029]/u.test(source)) {
    const fromHtml = htmlPasteToText(htmlSource).trim();
    const plainTrim = source.trim();
    const lengthClose =
      !plainTrim ||
      Math.abs(fromHtml.length - plainTrim.length) <= Math.max(20, Math.round(plainTrim.length * 0.2));
    if (fromHtml && lengthClose && fromHtml.includes("\n")) source = fromHtml;
  }
  return normalizeListingDescription(source);
}

export function mergePastedListingDescription(
  current: string,
  selectionStart: number,
  selectionEnd: number,
  plain: string,
  html: string,
): { value: string; caret: number } | null {
  const chunk = normalizePastedListingDescription(plain, html);
  if (chunk === plain) return null;
  const start = Math.max(0, selectionStart);
  const end = Math.max(start, selectionEnd);
  const value = current.slice(0, start) + chunk + current.slice(end);
  return { value, caret: start + chunk.length };
}
