import * as cldr from "@internal/build/sources/cldr";
import * as ucd from "@internal/build/sources/ucd";
import {
  codePointSet,
  codePointSetWhere,
  mappingTable,
} from "@internal/helpers/tables";

export const VERSION = await cldr.version();

// template.mjs implements these rules; the build fails if they change
const STRUCTURE = [
  ":: [[:Latin:][:Common:][:Inherited:][〇]] ;",
  ":: NFD() ;",
  "[[:Latin:][0-9]] { [:Mn:]+ → ;",
  ":: NFC() ;",
];

const transform = await cldr.text(
  "cldr-transforms",
  "transforms/Latin-ASCII.txt",
);
const mappings = new Map();
const structure = [];
for (const line of transform.split("\n")) {
  const rule = line.replace(/(^|\s)#.*$/, "").trim();
  if (!rule) continue;
  const match = /^(\S+) → (.+) ;$/.exec(rule);
  if (match && !rule.startsWith("[")) {
    const [source] = parseRuleText(match[1]);
    mappings.set(source.codePointAt(0), parseRuleText(match[2]).join(""));
  } else {
    structure.push(rule);
  }
}
if (structure.join("\n") !== STRUCTURE.join("\n")) {
  throw new Error(
    `Latin-ASCII.txt has new structural rules:\n${structure.join("\n")}`,
  );
}

const toAscii = (text) =>
  Array.from(text, (char) => mappings.get(char.codePointAt(0)) ?? char).join(
    "",
  );
const { "character-fallback": fallbacks } = (
  await cldr.json("cldr-core", "supplemental/characterFallbacks.json")
).supplemental.characters;
for (const [key, substitutes] of Object.entries(fallbacks)) {
  const codePoint = parseInt(key.slice(2), 16); // "U+00BC"
  if (mappings.has(codePoint)) continue;
  for (const { substitute } of substitutes) {
    const ascii = toAscii(substitute);
    if (!/\P{ASCII}/u.test(ascii)) {
      mappings.set(codePoint, ascii);
      break;
    }
  }
}

for (let codePoint = 0x80; codePoint <= 0x10ffff; codePoint++) {
  if (mappings.has(codePoint)) continue;
  if (codePoint >= 0xd800 && codePoint <= 0xdfff) continue;
  const char = String.fromCodePoint(codePoint);
  const decomposed = char.normalize("NFKC");
  if (decomposed === char) continue;
  const ascii = toAscii(
    decomposed.normalize("NFD").replace(/(?<=[A-Za-z0-9])\p{Mn}+/gu, ""),
  );
  if (!/\P{ASCII}/u.test(ascii)) mappings.set(codePoint, ascii);
}

export const ASCII_MAP = mappingTable(mappings);

const scripts = await ucd.values("Scripts.txt");
const categories = await ucd.values("extracted/DerivedGeneralCategory.txt");
export const REMOVABLE_MARKS = codePointSetWhere(
  (codePoint) =>
    categories[codePoint] === "Mn" &&
    ["Latin", "Common", "Inherited"].includes(scripts[codePoint]),
);

export const MARK_BASES = codePointSet([
  ...(await ucd.ranges("Scripts.txt", "Latin")),
  [0x30, 0x39], // 0-9
]);

function parseRuleText(text) {
  const chars = [];
  const charAt = (i) => String.fromCodePoint(text.codePointAt(i));
  for (let i = 0; i < text.length; ) {
    const char = charAt(i);
    if (char === " ") {
      i++;
    } else if (text.startsWith("\\u", i)) {
      chars.push(String.fromCodePoint(parseInt(text.slice(i + 2, i + 6), 16)));
      i += 6;
    } else if (char === "\\") {
      const escaped = charAt(i + 1);
      chars.push(escaped);
      i += 1 + escaped.length;
    } else if (text.startsWith("''", i)) {
      chars.push("'");
      i += 2;
    } else if (char === "'") {
      const end = text.indexOf("'", i + 1);
      if (end === -1) throw new Error(`Unterminated quote in rule: ${text}`);
      chars.push(...text.slice(i + 1, end));
      i = end + 1;
    } else if (/[\p{L}\p{N}\p{P}\p{S}]/u.test(char)) {
      chars.push(char);
      i += char.length;
    } else {
      throw new Error(`Unsupported rule syntax: ${text}`);
    }
  }
  return chars;
}
