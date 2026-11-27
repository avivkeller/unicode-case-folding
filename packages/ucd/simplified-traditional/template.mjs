import {
  assertCodePoint,
  assertOption,
  assertString,
} from "@internal/helpers/assert";
import { FIRST_CODE_POINT, SIMPLIFIED, TRADITIONAL, VERSION } from "#generated";

export { VERSION };

const AMBIGUOUS = ["keep", "convert"];

/**
 * Converts traditional Chinese characters to simplified ones, e.g. "漢語" → "汉语"
 * @param {string} text
 * @param {ConversionOptions} [options]
 * @returns {string}
 */
export function toSimplified(text, options) {
  return convert(text, SIMPLIFIED, options);
}

/**
 * Converts simplified Chinese characters to traditional ones, e.g. "汉语" → "漢語"
 * @param {string} text
 * @param {ConversionOptions} [options]
 * @returns {string}
 */
export function toTraditional(text, options) {
  return convert(text, TRADITIONAL, options);
}

/**
 * Returns the simplified forms of a character
 * @param {number} codePoint
 * @returns {string[]} The character itself first if it is one; empty if Unihan lists none
 */
export function getSimplifiedVariants(codePoint) {
  assertCodePoint(codePoint);
  return [...(SIMPLIFIED.get(codePoint) ?? "")];
}

/**
 * Returns the traditional forms of a character
 * @param {number} codePoint
 * @returns {string[]} The character itself first if it is one; empty if Unihan lists none
 */
export function getTraditionalVariants(codePoint) {
  assertCodePoint(codePoint);
  return [...(TRADITIONAL.get(codePoint) ?? "")];
}

function convert(text, table, { ambiguous = "keep" } = {}) {
  assertString(text);
  assertOption("ambiguous", ambiguous, AMBIGUOUS);
  const keep = ambiguous === "keep";
  let result = "";
  let copied = 0;
  for (let i = 0; i < text.length; ) {
    const codePoint = text.codePointAt(i);
    const length = codePoint > 0xffff ? 2 : 1;
    if (codePoint >= FIRST_CODE_POINT) {
      const variants = table.get(codePoint);
      if (variants !== undefined) {
        // The character itself comes first when it is among its variants
        const start = variants.codePointAt(0) !== codePoint ? 0 : length;
        if (start < variants.length && !(keep && start)) {
          const end = start + (variants.charCodeAt(start) >= 0xd800 ? 2 : 1);
          result += text.slice(copied, i) + variants.slice(start, end);
          copied = i + length;
        }
      }
    }
    i += length;
  }
  return copied === 0 ? text : result + text.slice(copied);
}

export default /* @__PURE__ */ Object.assign(toSimplified, {
  toSimplified,
  toTraditional,
  getSimplifiedVariants,
  getTraditionalVariants,
  VERSION,
});

/**
 * @typedef {object} ConversionOptions
 * @property {"keep" | "convert"} [ambiguous] What to do with a character that is
 *   also its own variant: "keep" it (the default) or "convert" it to its first other variant
 */
