import { assertCodePoint, assertString } from "@internal/helpers/assert";
import { createCaseMapper } from "@internal/helpers/casing";
import { toCodePoints } from "@internal/helpers/tables";
import { splitWords } from "unicode-text-segmentation";
import { CASING, VERSION } from "#generated";

export { VERSION };

const mapper = /* @__PURE__ */ createCaseMapper(CASING);

/**
 * Converts each word of a string to titlecase
 * @param {string} input
 * @param {object} [options]
 * @param {string | Intl.Locale} [options.locale]
 * @param {{ segment(input: string): Iterable<{ segment: string }> }} [options.segmenter] - Splits the input into words; Unicode word boundaries by default
 * @returns {string}
 */
export function toTitlecase(input, options = {}) {
  assertString(input);
  const language = mapper.resolveLanguage(options.locale);
  const words = options.segmenter
    ? Array.from(options.segmenter.segment(input), ({ segment }) => segment)
    : splitWords(input);
  const chars = Array.from(input);
  const codePoints = chars.map((char) => char.codePointAt(0));

  let result = "";
  let index = 0;
  for (const word of words) {
    const end = index + Array.from(word).length;
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

export default /* @__PURE__ */ Object.assign(toTitlecase, {
  toTitlecase,
  isTitlecase,
  lookupTitlecase,
  VERSION,
});
