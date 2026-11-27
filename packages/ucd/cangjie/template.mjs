import { assertCodePoint, assertString } from "@internal/helpers/assert";
import { CODES, VERSION } from "#generated";

export { VERSION };

// The radical of each key, from A to Z
const RADICALS = "日月金木水火土竹戈十大中一弓人心手口尸廿山女田難卜重";
const CODE = /^[A-Za-z]*$/;

/**
 * Returns the Cangjie code of a Chinese character, e.g. "AB" for 明
 * @param {number} codePoint
 * @returns {string | undefined}
 */
export function getCangjie(codePoint) {
  assertCodePoint(codePoint);
  return CODES.get(codePoint);
}

/**
 * Converts the letters of a Cangjie code to their radicals, e.g. "AB" → "日月"
 * @param {string} code
 * @returns {string}
 */
export function toCangjieRadicals(code) {
  assertString(code);
  if (!CODE.test(code)) throw new RangeError(`Invalid Cangjie code: ${code}`);
  let radicals = "";
  for (let i = 0; i < code.length; i++) {
    radicals += RADICALS[(code.charCodeAt(i) | 32) - 97];
  }
  return radicals;
}

export default /* @__PURE__ */ Object.assign(getCangjie, {
  getCangjie,
  toCangjieRadicals,
  VERSION,
});
