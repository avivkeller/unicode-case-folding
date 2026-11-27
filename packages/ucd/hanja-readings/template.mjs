import { assertCodePoint, assertString } from "@internal/helpers/assert";
import { READINGS, VERSION } from "#generated";

export { VERSION };

const FIRST_CODE_POINT = 0x3400;

/**
 * Returns the Korean readings of a Chinese character, e.g. ["한"] for 韓
 * @param {number} codePoint
 * @returns {string[]} Hangul syllables, the most customary reading first
 */
export function getHanjaReadings(codePoint) {
  assertCodePoint(codePoint);
  return [...(READINGS.get(codePoint) ?? "")];
}

/**
 * Converts the Chinese characters of a text to hangul, e.g. "大韓民國" → "대한민국"
 * @param {string} text
 * @returns {string}
 */
export function toHangul(text) {
  assertString(text);
  let result = "";
  let copied = 0;
  for (let i = 0; i < text.length; ) {
    const codePoint = text.codePointAt(i);
    const length = codePoint > 0xffff ? 2 : 1;
    if (codePoint >= FIRST_CODE_POINT) {
      const readings = READINGS.get(codePoint);
      if (readings !== undefined) {
        result += text.slice(copied, i) + readings[0];
        copied = i + length;
      }
    }
    i += length;
  }
  return copied === 0 ? text : result + text.slice(copied);
}

export default /* @__PURE__ */ Object.assign(toHangul, {
  toHangul,
  getHanjaReadings,
  VERSION,
});
