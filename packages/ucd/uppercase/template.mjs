import { assertCodePoint, assertString } from "@internal/helpers/assert";
import { createCaseMapper } from "@internal/helpers/casing";
import { toCodePoints } from "@internal/helpers/tables";
import { CASING, VERSION } from "#generated";

export { VERSION };

const mapper = /* @__PURE__ */ createCaseMapper(CASING);
const NON_ASCII = /\P{ASCII}/u;

/**
 * Converts a string to uppercase using the full Unicode case mappings
 * @param {string} input
 * @param {{ locale?: string | Intl.Locale }} [options]
 * @returns {string}
 */
export function toUppercase(input, options = {}) {
  assertString(input);
  const language = mapper.resolveLanguage(options.locale);
  // ASCII uppercases the same way in every Unicode version
  if (language === undefined && !NON_ASCII.test(input)) {
    return input.toUpperCase();
  }
  return mapper.convert(input, "upper", language);
}

/**
 * Checks whether a string is unchanged by toUppercase()
 * @param {string} input
 * @param {{ locale?: string | Intl.Locale }} [options]
 * @returns {boolean}
 */
export function isUppercase(input, options) {
  return toUppercase(input, options) === input;
}

/**
 * Returns the full, unconditional uppercase mapping of a code point
 * @param {number} codePoint
 * @returns {number[] | undefined} undefined if it maps to itself
 */
export function lookupUppercase(codePoint) {
  assertCodePoint(codePoint);
  const mapping = mapper.lookup(codePoint, "upper");
  return mapping === undefined ? undefined : toCodePoints(mapping);
}

export default /* @__PURE__ */ Object.assign(toUppercase, {
  toUppercase,
  isUppercase,
  lookupUppercase,
  VERSION,
});
