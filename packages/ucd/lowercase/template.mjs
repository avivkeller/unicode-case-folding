import { assertCodePoint, assertString } from "@internal/helpers/assert";
import { createCaseMapper } from "@internal/helpers/casing";
import { toCodePoints } from "@internal/helpers/tables";
import { CASING, VERSION } from "#generated";

export { VERSION };

const mapper = /* @__PURE__ */ createCaseMapper(CASING);
const NON_ASCII = /\P{ASCII}/u;

/**
 * Converts a string to lowercase using the full Unicode case mappings
 * @param {string} input
 * @param {{ locale?: string | Intl.Locale }} [options]
 * @returns {string}
 */
export function toLowercase(input, options = {}) {
  assertString(input);
  const language = mapper.resolveLanguage(options.locale);
  // ASCII lowercases the same way in every Unicode version
  if (language === undefined && !NON_ASCII.test(input)) {
    return input.toLowerCase();
  }
  return mapper.convert(input, "lower", language);
}

/**
 * Checks whether a string is unchanged by toLowercase()
 * @param {string} input
 * @param {{ locale?: string | Intl.Locale }} [options]
 * @returns {boolean}
 */
export function isLowercase(input, options) {
  return toLowercase(input, options) === input;
}

/**
 * Returns the full, unconditional lowercase mapping of a code point
 * @param {number} codePoint
 * @returns {number[] | undefined} undefined if it maps to itself
 */
export function lookupLowercase(codePoint) {
  assertCodePoint(codePoint);
  const mapping = mapper.lookup(codePoint, "lower");
  return mapping === undefined ? undefined : toCodePoints(mapping);
}

export default /* @__PURE__ */ Object.assign(toLowercase, {
  toLowercase,
  isLowercase,
  lookupLowercase,
  VERSION,
});
