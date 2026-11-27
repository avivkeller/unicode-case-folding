import * as cldr from "@internal/build/sources/cldr";
import { encodeLocaleTable } from "@internal/helpers/locale";

export const VERSION = await cldr.version();

const characters = await cldr.localeData("cldr-misc-full", "characters");
const likelySubtags = await cldr.likelySubtags();

// In the order of the types in template.mjs
const FIELDS = [
  "exemplarCharacters",
  "auxiliary",
  "index",
  "numbers",
  "punctuation",
];
const SEPARATOR = "\t";
const WHITE_SPACE = /[\t-\r \x85\u200e\u200f\u2028\u2029]/;
const HEX = /^[0-9A-Fa-f]+$/;

// The elements of a UnicodeSet that lists characters and strings, in its order
function parseSet(set) {
  const chars = [...set];
  if (chars[0] !== "[" || chars.at(-1) !== "]" || chars[1] === "^") {
    throw new Error(`Unsupported set: ${set}`);
  }
  const end = chars.length - 1;
  const elements = [];
  let i = 1;
  const hex = (length) => {
    const digits = chars.slice(i, i + length).join("");
    if (digits.length !== length || !HEX.test(digits)) {
      throw new Error(`Unsupported escape in ${set}`);
    }
    i += length;
    return String.fromCodePoint(parseInt(digits, 16));
  };
  const escape = () => {
    const char = chars[i++];
    if (char === "u" || char === "x") {
      if (chars[i] !== "{") return hex(char === "u" ? 4 : 2);
      const close = chars.indexOf("}", i);
      const codes = chars
        .slice(i + 1, close)
        .join("")
        .trim()
        .split(/\s+/);
      i = close + 1;
      return String.fromCodePoint(...codes.map((code) => parseInt(code, 16)));
    }
    if (char === "U") return hex(8);
    if (char === undefined || /[Npa-tvwyz]/i.test(char)) {
      throw new Error(`Unsupported escape in ${set}`);
    }
    return char;
  };
  const element = () => {
    const char = chars[i++];
    if (char === "\\") return escape();
    if (char !== "{") return char;
    let string = "";
    while (chars[i] !== "}") {
      if (i >= end) throw new Error(`Unterminated string in ${set}`);
      const next = chars[i++];
      if (next === "\\") string += escape();
      else if (!WHITE_SPACE.test(next)) string += next;
    }
    i++;
    return string;
  };
  const skipSpace = () => {
    while (i < end && WHITE_SPACE.test(chars[i])) i++;
  };

  for (skipSpace(); i < end; skipSpace()) {
    if (chars[i] === "[") throw new Error(`Unsupported nested set: ${set}`);
    const isFirst = elements.length === 0;
    const isHyphen = chars[i] === "-";
    const start = element();
    skipSpace();
    if (isHyphen && !isFirst && i < end) {
      const [from, to] = [elements.at(-1), element()];
      if ([...from].length !== 1 || [...to].length !== 1) {
        throw new Error(`Unsupported range in ${set}`);
      }
      for (let cp = from.codePointAt(0) + 1; cp <= to.codePointAt(0); cp++) {
        elements.push(String.fromCodePoint(cp));
      }
    } else {
      elements.push(start);
    }
  }
  const unique = [...new Set(elements)];
  if (unique.some((item) => item === "" || item.includes(SEPARATOR))) {
    throw new Error(`Unsupported element in ${set}`);
  }
  return unique;
}

// Each set as its elements, tab-separated; template.mjs splits them when used
export const SETS = [""];
const setIndex = (set) => {
  const joined = parseSet(set ?? "[]").join(SEPARATOR);
  if (!SETS.includes(joined)) SETS.push(joined);
  return SETS.indexOf(joined);
};

// Locale → for each type of characters, an index in SETS
export const LOCALES = encodeLocaleTable(
  new Map(
    [...characters].map(([locale, sets]) => [
      locale,
      FIELDS.map((field) => setIndex(sets[field])),
    ]),
  ),
  likelySubtags,
);
