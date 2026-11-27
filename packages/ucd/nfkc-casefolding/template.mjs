import { assertCodePoint, assertString } from "@internal/helpers/assert";
import { toCodePoints } from "@internal/helpers/tables";
import { normalize } from "unicode-normalize";
import { FOLDING_MAP, VERSION } from "#generated";

export { VERSION };

const NON_ASCII = /\P{ASCII}/u;

/**
 * Applies NFKC_Casefold, e.g. "Ａ" → "a"
 * @param {string} input
 * @returns {string} In NFC
 */
export function caseFold(input) {
  assertString(input);
  if (!NON_ASCII.test(input)) return input.toLowerCase();

  let result = "";
  for (const char of normalize(input, "NFD")) {
    result += FOLDING_MAP.get(char.codePointAt(0)) ?? char;
  }
  return normalize(result, "NFC");
}

/**
 * Compares two strings by their caseFold() forms
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function caseFoldEquals(a, b) {
  return caseFold(a) === caseFold(b);
}

/**
 * Returns the NFKC_Casefold mapping of a single code point
 * @param {number} codePoint
 * @returns {number[] | undefined} Empty if removed, undefined if unchanged
 */
export function lookupFolding(codePoint) {
  assertCodePoint(codePoint);
  const mapping = FOLDING_MAP.get(codePoint);
  return mapping === undefined ? undefined : toCodePoints(mapping);
}

export default {
  caseFold,
  caseFoldEquals,
  lookupFolding,
  VERSION,
};
