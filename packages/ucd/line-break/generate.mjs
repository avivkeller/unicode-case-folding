import * as ucd from "@internal/build/sources/ucd";
import { codePointSetWhere, rangeTableOf } from "@internal/helpers/tables";
import * as CLASSES from "./classes.mjs";

const LINE_BREAK_FILE = "LineBreak.txt";
const EAST_ASIAN_WIDTH = "EastAsianWidth.txt";
const GENERAL_CATEGORY = "extracted/DerivedGeneralCategory.txt";
const EMOJI_DATA = "emoji/emoji-data.txt";
const { CODE_POINTS } = ucd;

export const VERSION = await ucd.version(
  LINE_BREAK_FILE,
  EAST_ASIAN_WIDTH,
  GENERAL_CATEGORY,
  EMOJI_DATA,
);

const [lineBreak, eastAsianWidth, generalCategory, pictographic] =
  await Promise.all([
    ucd.values(LINE_BREAK_FILE),
    ucd.values(EAST_ASIAN_WIDTH),
    ucd.values(GENERAL_CATEGORY),
    ucd.ranges(EMOJI_DATA, "Extended_Pictographic"),
  ]);

// LB1
const RESOLVED = { AI: "AL", SG: "AL", XX: "AL", CJ: "NS" };

function resolvedClass(codePoint) {
  const value = lineBreak[codePoint];
  if (value === "SA") {
    const category = generalCategory[codePoint];
    return category === "Mn" || category === "Mc" ? "CM" : "AL";
  }
  const resolved = RESOLVED[value] ?? value;
  if (!Object.hasOwn(CLASSES, resolved)) {
    throw new Error(`${LINE_BREAK_FILE}: unknown line breaking class ${value}`);
  }
  return resolved;
}

// The table gives every Hangul syllable H3, saving about 800 ranges
export const HANGUL_BASE = 0xac00;
export const HANGUL_T_COUNT = 28;

const classes = new Uint8Array(CODE_POINTS);
for (let codePoint = 0; codePoint < CODE_POINTS; codePoint++) {
  const name = resolvedClass(codePoint);
  classes[codePoint] = CLASSES[name === "H2" ? "H3" : name];
}
export const LINE_BREAK = rangeTableOf(classes);

export const EAST_ASIAN = codePointSetWhere((codePoint) =>
  ["F", "W", "H"].includes(eastAsianWidth[codePoint]),
);

export const INITIAL_QUOTATION_MARKS = new Set();
export const FINAL_QUOTATION_MARKS = new Set();
for (let codePoint = 0; codePoint < CODE_POINTS; codePoint++) {
  if (lineBreak[codePoint] !== "QU") continue;
  const category = generalCategory[codePoint];
  if (category === "Pi") INITIAL_QUOTATION_MARKS.add(codePoint);
  if (category === "Pf") FINAL_QUOTATION_MARKS.add(codePoint);
}

const isPictographic = new Array(CODE_POINTS).fill(false);
for (const [start, end] of pictographic) {
  isPictographic.fill(true, start, end + 1);
}
export const UNASSIGNED_PICTOGRAPHIC = codePointSetWhere(
  (codePoint) =>
    isPictographic[codePoint] && generalCategory[codePoint] === "Cn",
);
