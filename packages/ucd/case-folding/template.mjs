import { assertCodePoint, assertString } from "@internal/helpers/assert";
import { toCodePoints } from "@internal/helpers/tables";
import { FOLDING_MAP, VERSION } from "#generated";

export { VERSION };

const NON_ASCII = /\P{ASCII}/u;

/**
 * Applies full Unicode case folding to a string
 * @param {string} input
 * @returns {string}
 */
export function caseFold(input) {
  assertString(input);
  if (!NON_ASCII.test(input)) return input.toLowerCase();

  let result = "";
  for (const char of input) {
    result += FOLDING_MAP.get(char.codePointAt(0)) ?? char;
  }
  return result;
}

/**
 * Compares two strings using Unicode case folding
 * @param {string} str1
 * @param {string} str2
 * @returns {boolean}
 */
export function caseFoldEquals(str1, str2) {
  return caseFold(str1) === caseFold(str2);
}

/**
 * Returns the full case folding mapping for a code point
 * @param {number} codePoint
 * @returns {number[] | undefined} undefined if it folds to itself
 */
export function lookupFolding(codePoint) {
  assertCodePoint(codePoint);
  const folding = FOLDING_MAP.get(codePoint);
  return folding === undefined ? undefined : toCodePoints(folding);
}

export default {
  caseFold,
  caseFoldEquals,
  lookupFolding,
  VERSION,
};
