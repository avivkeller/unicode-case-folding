import * as cldr from "@internal/build/sources/cldr";
import { canonicalId, Compiler, registeredIds } from "./compiler/compile.mjs";
import { scriptNames, scriptRanges } from "./compiler/properties.mjs";

export const VERSION = await cldr.version();

const TRANSFORMS = [
  "Arabic-Latin",
  "Armenian-Latin",
  "Bengali-Latin",
  "Bopomofo-Latin",
  "Cyrillic-Latin",
  "Devanagari-Latin",
  "Ethiopic-Latin",
  "Georgian-Latin",
  "Greek-Latin",
  "Gujarati-Latin",
  "Gurmukhi-Latin",
  "Han-Latin",
  "Hangul-Latin",
  "Hant-Latn",
  "Hebrew-Latin",
  "Hiragana-Latin",
  "Kannada-Latin",
  "Katakana-Latin",
  "Latin-ASCII",
  "Malayalam-Latin",
  "Myanmar-Latin",
  "Oriya-Latin",
  "Syriac-Latin",
  "Tamil-Latin",
  "Telugu-Latin",
  "Thaana-Latin",
  "Thai-Latin",
];
const SHARED = ["Han-Latin", "InterIndic-Latin", "Katakana-Latin"];

const names = scriptNames();
const scriptTransforms = new Map();
for (const [code, set] of scriptRanges()) {
  if (set.isEmpty || code === "Latn") continue;
  const id = canonicalId(`${names.get(code)}-Latin`);
  if (id === undefined) continue;
  if (!TRANSFORMS.includes(id)) {
    throw new Error(`Any-Latin uses ${id}: add it to the package`);
  }
  scriptTransforms.set(code, id);
}

export const ANY_LATIN_IDS = [...new Set(scriptTransforms.values())].sort();

const scriptValue = (code) => {
  if (code === "Zyyy" || code === "Zinh") return 0;
  const id = scriptTransforms.get(code);
  return id === undefined ? 1 : 2 + ANY_LATIN_IDS.indexOf(id);
};
const ranges = [];
for (const [code, set] of scriptRanges()) {
  for (const [start] of set.ranges()) ranges.push([start, scriptValue(code)]);
}
ranges.sort((a, b) => a[0] - b[0]);
const starts = [];
const values = [];
for (const [start, value] of ranges) {
  if (values.at(-1) === value) continue;
  starts.push(start);
  values.push(value);
}
export const SCRIPT_RUNS = [starts, values];

export const ALIASES = new Map();
for (const [alias, { id }] of registeredIds()) {
  if (TRANSFORMS.includes(id)) ALIASES.set(alias, id);
}

const compiler = new Compiler(new Set(SHARED));
const compiled = {};
for (const id of [...TRANSFORMS, ...SHARED]) {
  compiled[id.toUpperCase().replace(/-/g, "_")] = compiler.compile(id);
}
export const {
  ARABIC_LATIN,
  ARMENIAN_LATIN,
  BENGALI_LATIN,
  BOPOMOFO_LATIN,
  CYRILLIC_LATIN,
  DEVANAGARI_LATIN,
  ETHIOPIC_LATIN,
  GEORGIAN_LATIN,
  GREEK_LATIN,
  GUJARATI_LATIN,
  GURMUKHI_LATIN,
  HAN_LATIN,
  HANGUL_LATIN,
  HANT_LATN,
  HEBREW_LATIN,
  HIRAGANA_LATIN,
  INTERINDIC_LATIN,
  KANNADA_LATIN,
  KATAKANA_LATIN,
  LATIN_ASCII,
  MALAYALAM_LATIN,
  MYANMAR_LATIN,
  ORIYA_LATIN,
  SYRIAC_LATIN,
  TAMIL_LATIN,
  TELUGU_LATIN,
  THAANA_LATIN,
  THAI_LATIN,
} = compiled;
