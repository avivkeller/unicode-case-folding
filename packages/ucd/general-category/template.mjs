import { assertCodePoint, assertString } from "@internal/helpers/assert";
import { directLookup } from "@internal/helpers/tables";
import {
  CATEGORIES,
  CATEGORY_CODES,
  CATEGORY_NAMES,
  VERSION,
} from "#generated";

export { VERSION };

const CASED_LETTERS = ["Ll", "Lt", "Lu"];

const categoryOf = /* @__PURE__ */ directLookup(CATEGORIES);

/**
 * Returns the General_Category of a code point, e.g. "Lu" for U+0041
 * @param {number} codePoint
 * @returns {string} "Cn" if unassigned
 */
export function getGeneralCategory(codePoint) {
  assertCodePoint(codePoint);
  return CATEGORY_CODES[categoryOf(codePoint)];
}

/**
 * Returns the long name of a category or group, e.g. "Uppercase_Letter" for "Lu"
 * @param {string} category - e.g. "Lu", or a group such as "L"
 * @returns {string}
 */
export function getGeneralCategoryName(category) {
  assertCategory(category);
  return CATEGORY_NAMES[category];
}

/**
 * Checks whether a code point is in a category or a group of categories
 * @param {number} codePoint
 * @param {string} category - e.g. "Lu", or a group: "L", "LC", "M", "N", "P", "S", "Z", "C"
 * @returns {boolean}
 */
export function isInCategory(codePoint, category) {
  assertCodePoint(codePoint);
  assertCategory(category);
  const code = CATEGORY_CODES[categoryOf(codePoint)];
  if (category.length === 1) return code[0] === category;
  return category === "LC" ? CASED_LETTERS.includes(code) : code === category;
}

function assertCategory(category) {
  assertString(category);
  if (!Object.hasOwn(CATEGORY_NAMES, category)) {
    throw new RangeError(`Invalid general category: ${category}`);
  }
}

export default /* @__PURE__ */ Object.assign(getGeneralCategory, {
  getGeneralCategory,
  getGeneralCategoryName,
  isInCategory,
  VERSION,
});
