import * as cldr from "@internal/build/sources/cldr";
import * as ucd from "@internal/build/sources/ucd";
import { rangeTableOf } from "@internal/helpers/tables";
import * as C from "./classes.mjs";

const GRAPHEME_FILE = "auxiliary/GraphemeBreakProperty.txt";
const WORD_FILE = "auxiliary/WordBreakProperty.txt";
const SENTENCE_FILE = "auxiliary/SentenceBreakProperty.txt";
const EMOJI_DATA = "emoji/emoji-data.txt";
const DERIVED_CORE = "DerivedCoreProperties.txt";
const { CODE_POINTS } = ucd;

export const VERSION = await ucd.version(
  GRAPHEME_FILE,
  WORD_FILE,
  SENTENCE_FILE,
  EMOJI_DATA,
  DERIVED_CORE,
);

const [graphemeBreak, wordBreak, sentenceBreak, pictographic, alphabetic] =
  await Promise.all([
    ucd.values(GRAPHEME_FILE),
    ucd.values(WORD_FILE),
    ucd.values(SENTENCE_FILE),
    ucd.ranges(EMOJI_DATA, "Extended_Pictographic"),
    ucd.ranges(DERIVED_CORE, "Alphabetic"),
  ]);

function flags(ranges) {
  const result = new Uint8Array(CODE_POINTS);
  for (const [start, end] of ranges) result.fill(1, start, end + 1);
  return result;
}
const isPictographic = flags(pictographic);
const isAlphabetic = flags(alphabetic);

const conjunctBreak = new Array(CODE_POINTS).fill("None");
for (const [range, property, value] of await ucd.records(DERIVED_CORE)) {
  if (property !== "InCB") continue;
  const [start, end] = ucd.parseRange(range);
  conjunctBreak.fill(value, start, end + 1);
}

function table(file, classes, key) {
  const result = new Uint8Array(CODE_POINTS);
  for (let codePoint = 0; codePoint < CODE_POINTS; codePoint++) {
    const value = classes[key(codePoint)];
    if (value === undefined) {
      throw new Error(`${file}: unexpected ${key(codePoint)}`);
    }
    result[codePoint] = value;
  }
  return result;
}

// The table gives every Hangul syllable LVT, saving about 800 ranges
export const HANGUL_BASE = 0xac00;
export const HANGUL_T_COUNT = 28;

const GRAPHEME_CLASSES = {
  "Other None": C.G_OTHER,
  "Other Consonant": C.G_CONSONANT,
  "Other Linker": C.G_OTHER_LINKER,
  "Other None Pictographic": C.G_PICTOGRAPHIC,
  "Extend Extend": C.G_EXTEND_INCB,
  "Extend Linker": C.G_LINKER,
  "Extend None": C.G_EXTEND,
  "ZWJ Extend": C.G_ZWJ,
  "SpacingMark None": C.G_SPACING_MARK,
  "Prepend None": C.G_PREPEND,
  "Regional_Indicator None": C.G_RI,
  "L None": C.G_L,
  "V None": C.G_V,
  "T None": C.G_T,
  "LV None": C.G_LVT,
  "LVT None": C.G_LVT,
  "Control None": C.G_CONTROL,
  "CR None": C.G_CR,
  "LF None": C.G_LF,
};
const graphemeClasses = table(
  GRAPHEME_FILE,
  GRAPHEME_CLASSES,
  (codePoint) =>
    `${graphemeBreak[codePoint]} ${conjunctBreak[codePoint]}` +
    (isPictographic[codePoint] ? " Pictographic" : ""),
);
export const GRAPHEME_BREAK = rangeTableOf(graphemeClasses);

// Below this code point, the only cluster longer than a character is CR LF
export const SINGLE_GRAPHEMES_BELOW = graphemeClasses.findIndex(
  (value) =>
    value !== C.G_OTHER && value !== C.G_PICTOGRAPHIC && value < C.G_CONTROL,
);

const WORD_CLASSES = {
  ALetter: C.W_ALETTER,
  "ALetter Pictographic": C.W_ALETTER_PICTOGRAPHIC,
  Hebrew_Letter: C.W_HEBREW_LETTER,
  Numeric: C.W_NUMERIC,
  Katakana: C.W_KATAKANA,
  "Other Alphabetic": C.W_OTHER_LETTER,
  ExtendNumLet: C.W_EXTEND_NUM_LET,
  Other: C.W_OTHER,
  "Other Pictographic": C.W_PICTOGRAPHIC,
  MidLetter: C.W_MID_LETTER,
  MidNumLet: C.W_MID_NUM_LET,
  Single_Quote: C.W_SINGLE_QUOTE,
  MidNum: C.W_MID_NUM,
  Double_Quote: C.W_DOUBLE_QUOTE,
  WSegSpace: C.W_WSEG_SPACE,
  Regional_Indicator: C.W_RI,
  Extend: C.W_EXTEND,
  Format: C.W_FORMAT,
  ZWJ: C.W_ZWJ,
  Newline: C.W_NEWLINE,
  CR: C.W_CR,
  LF: C.W_LF,
};
export const WORD_BREAK = rangeTableOf(
  table(WORD_FILE, WORD_CLASSES, (codePoint) => {
    const value = wordBreak[codePoint];
    if (isPictographic[codePoint]) return `${value} Pictographic`;
    return value === "Other" && isAlphabetic[codePoint]
      ? "Other Alphabetic"
      : value;
  }),
);

const SENTENCE_CLASSES = {
  Extend: C.S_EXTEND,
  Format: C.S_FORMAT,
  Other: C.S_OTHER,
  OLetter: C.S_OLETTER,
  Lower: C.S_LOWER,
  Upper: C.S_UPPER,
  Numeric: C.S_NUMERIC,
  Close: C.S_CLOSE,
  Sp: C.S_SP,
  SContinue: C.S_SCONTINUE,
  ATerm: C.S_ATERM,
  STerm: C.S_STERM,
  Sep: C.S_SEP,
  CR: C.S_CR,
  LF: C.S_LF,
};
export const SENTENCE_BREAK = rangeTableOf(
  table(
    SENTENCE_FILE,
    SENTENCE_CLASSES,
    (codePoint) => sentenceBreak[codePoint],
  ),
);

const SUPPRESSIONS_PACKAGE = "cldr-segments-full";

// Language → the abbreviations after which a sentence does not end
export const SUPPRESSIONS = {};
const { availableLocales } = await cldr.json(
  "cldr-core",
  "availableLocales.json",
);
for (const locale of availableLocales.full) {
  const file = `segments/${locale}/suppressions.json`;
  if (!(await cldr.has(SUPPRESSIONS_PACKAGE, file))) continue;
  const { segmentations } = (await cldr.json(SUPPRESSIONS_PACKAGE, file))
    .segments;
  const suppressions = segmentations.SentenceBreak?.standard;
  if (!suppressions) continue;
  if (!/^[a-z]+$/.test(locale)) {
    throw new Error(`Suppressions for ${locale}, which is not a language`);
  }
  SUPPRESSIONS[locale] = suppressions
    .map(({ suppression }) => suppression.normalize("NFC"))
    .filter((suppression) => suppression.endsWith("."))
    .sort();
}
if (!SUPPRESSIONS.en) throw new Error("No suppressions for English");
