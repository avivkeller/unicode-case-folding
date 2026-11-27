import { assertCodePoint, assertString } from "@internal/helpers/assert";
import { createCaseMapper } from "@internal/helpers/casing";
import { toCodePoints } from "@internal/helpers/tables";
import { CASING, VERSION } from "#generated";

export { VERSION };

const mapper = /* @__PURE__ */ createCaseMapper(CASING);
const segmenters = new Map();

function wordSegmenter(locale) {
  const key = String(locale);
  if (!segmenters.has(key)) {
    segmenters.set(key, new Intl.Segmenter(locale, { granularity: "word" }));
  }
  return segmenters.get(key);
}

/**
 * Converts each word of a string to titlecase
 * @param {string} input
 * @param {object} [options]
 * @param {string | Intl.Locale} [options.locale]
 * @param {{ segment(input: string): Iterable<{ segment: string }> }} [options.segmenter] - Splits the input into words
 * @returns {string}
 */
export function toTitlecase(input, options = {}) {
  assertString(input);
  const language = mapper.resolveLanguage(options.locale);
  const segmenter = options.segmenter ?? wordSegmenter(options.locale);
  const chars = Array.from(input);
  const codePoints = chars.map((char) => char.codePointAt(0));

  let result = "";
  let index = 0;
  for (const { segment } of segmenter.segment(input)) {
    const end = index + Array.from(segment).length;
    if (end > chars.length) break;

    let afterFirstCased = false;
    for (let i = index; i < end; i++) {
      let mapping;
      if (afterFirstCased) {
        mapping = mapper.mapAt(codePoints, i, "lower", language);
      } else if (mapper.isCased(codePoints[i])) {
        afterFirstCased = true;
        mapping = mapper.mapAt(codePoints, i, "title", language);
      }
      result += mapping ?? chars[i];
    }
    index = end;
  }

  if (index !== chars.length) {
    throw new Error("The segmenter's segments do not add up to the input");
  }
  return result;
}

/**
 * Checks whether a string is unchanged by toTitlecase()
 * @param {string} input
 * @param {Parameters<typeof toTitlecase>[1]} [options]
 * @returns {boolean}
 */
export function isTitlecase(input, options) {
  return toTitlecase(input, options) === input;
}

/**
 * Returns the full, unconditional titlecase mapping of a code point
 * @param {number} codePoint
 * @returns {number[] | undefined} undefined if it maps to itself
 */
export function lookupTitlecase(codePoint) {
  assertCodePoint(codePoint);
  const mapping = mapper.lookup(codePoint, "title");
  return mapping === undefined ? undefined : toCodePoints(mapping);
}

export default { toTitlecase, isTitlecase, lookupTitlecase, VERSION };
