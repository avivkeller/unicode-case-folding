import { assertCodePoint, assertString } from "@internal/helpers/assert";
import { READINGS, VERSION } from "#generated";

export { VERSION };

const WORD = /[\p{L}\p{N}]/u;

/**
 * Returns the Vietnamese readings of a Chinese character, e.g. ["việt"] for 越
 * @param {number} codePoint
 * @returns {string[]}
 */
export function getVietnameseReadings(codePoint) {
  assertCodePoint(codePoint);
  return READINGS.get(codePoint)?.split(" ") ?? [];
}

/**
 * Converts the Chinese characters of a text to Vietnamese, e.g. "越南" → "việt nam"
 * @param {string} text
 * @param {{ separator?: string }} [options]
 * @returns {string}
 */
export function toVietnamese(text, options = {}) {
  assertString(text);
  const separator = options.separator ?? " ";
  assertString(separator);

  let result = "";
  let previous = "";
  for (const char of text) {
    const readings = READINGS.get(char.codePointAt(0));
    const kind =
      readings !== undefined ? "reading" : WORD.test(char) ? "word" : "other";
    if (
      (kind === "reading" && previous !== "" && previous !== "other") ||
      (kind === "word" && previous === "reading")
    ) {
      result += separator;
    }
    if (kind === "reading") {
      const end = readings.indexOf(" ");
      result += end === -1 ? readings : readings.slice(0, end);
    } else {
      result += char;
    }
    previous = kind;
  }
  return result;
}

export default /* @__PURE__ */ Object.assign(toVietnamese, {
  toVietnamese,
  getVietnameseReadings,
  VERSION,
});
