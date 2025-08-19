/**
 * Unicode Case Folding
 * Generated from Unicode Character Database
 * Source: https://www.unicode.org/Public/UCD/latest/ucd/CaseFolding.txt
 */

// Mapping of code points to their case-folded equivalents
const FOLDING_MAP = new Map(/* MAPPING_DATA_PLACEHOLDER */);

/**
 * Applies Unicode case folding to a string
 * @param {string} input - The string to case fold
 * @returns {string} The case-folded string
 */
export function caseFold(input) {
  if (typeof input !== "string") {
    throw new TypeError("Input must be a string");
  }

  let result = [];

  for (const char of input) {
    const codePoint = char.codePointAt(0);

    const mapping = FOLDING_MAP.get(codePoint);

    result.push(mapping ? String.fromCodePoint(...mapping) : char);
  }

  return result.join("");
}

/**
 * Compares two strings using Unicode case folding
 * @param {string} str1 - First string to compare
 * @param {string} str2 - Second string to compare
 * @returns {boolean} True if the strings are case-fold equivalent
 */
export function caseFoldEquals(str1, str2) {
  return caseFold(str1) === caseFold(str2);
}

/**
 * Returns the full case folding mapping for a code point
 * @param {number} codePoint - The Unicode code point to look up
 * @returns {number[] | undefined} Array of code points this folds to, or undefined
 */
export function lookupFolding(codePoint) {
  if (typeof codePoint !== "number") {
    throw new TypeError("Code point must be a number");
  }

  return FOLDING_MAP.get(codePoint);
}

// Named exports
export default {
  caseFold,
  caseFoldEquals,
  lookupFolding,
};
