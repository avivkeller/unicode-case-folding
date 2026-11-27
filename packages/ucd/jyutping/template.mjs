import {
  assertCodePoint,
  assertOption,
  assertString,
} from "@internal/helpers/assert";
import { findRun } from "@internal/helpers/tables";
import { READINGS, SYLLABLES, VERSION } from "#generated";

export { VERSION };

const TONES = ["number", "none"];
const WORD = /[\p{L}\p{N}]/u;

/**
 * Returns the Cantonese reading of a Chinese character, e.g. "zung1" for 中
 * @param {number} codePoint
 * @param {JyutpingOptions} [options]
 * @returns {string | undefined}
 */
export function getJyutping(codePoint, options = {}) {
  assertCodePoint(codePoint);
  const withTone = resolveTone(options);
  const index = readingIndex(codePoint);
  return index === undefined ? undefined : format(SYLLABLES[index], withTone);
}

/**
 * Converts the Chinese characters of a text to jyutping, e.g. "中文" → "zung1 man4"
 * @param {string} text
 * @param {JyutpingOptions & { separator?: string }} [options]
 * @returns {string}
 */
export function toJyutping(text, options = {}) {
  assertString(text);
  const withTone = resolveTone(options);
  const separator = options.separator ?? " ";
  assertString(separator);

  let result = "";
  let previous = "";
  for (const char of text) {
    const index = readingIndex(char.codePointAt(0));
    const kind =
      index !== undefined ? "reading" : WORD.test(char) ? "word" : "other";
    if (
      (kind === "reading" && previous !== "" && previous !== "other") ||
      (kind === "word" && previous === "reading")
    ) {
      result += separator;
    }
    result += kind === "reading" ? format(SYLLABLES[index], withTone) : char;
    previous = kind;
  }
  return result;
}

function resolveTone({ tone = "number" }) {
  assertOption("tone", tone, TONES);
  return tone === "number";
}

function readingIndex(codePoint) {
  const [starts, runs] = READINGS;
  const run = findRun(starts, codePoint);
  const reading = runs[run]?.[codePoint - starts[run]];
  return reading ? reading - 1 : undefined;
}

function format(syllable, withTone) {
  return withTone ? syllable : syllable.slice(0, -1);
}

export default /* @__PURE__ */ Object.assign(toJyutping, {
  toJyutping,
  getJyutping,
  VERSION,
});

/**
 * @typedef {object} JyutpingOptions
 * @property {"number" | "none"} [tone] "number" by default
 */
