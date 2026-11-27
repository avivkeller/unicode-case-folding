import { assertString } from "@internal/helpers/assert";
import { inSet } from "@internal/helpers/tables";
import { normalize } from "unicode-normalize";
import { ASCII_MAP, MARK_BASES, REMOVABLE_MARKS, VERSION } from "#generated";

export { VERSION };

const NON_ASCII = /\P{ASCII}/u;

/**
 * Converts text to ASCII, e.g. "é" → "e".
 * @param {string} input
 * @param {object} [options]
 * @param {string | null} [options.replacement] - null keeps unmappable characters
 * @returns {string}
 */
export function toAscii(input, { replacement = "?" } = {}) {
  assertString(input);
  if (replacement !== null) assertString(replacement);
  if (!NON_ASCII.test(input)) return input;

  let result = "";
  for (const char of removeMarks(input)) {
    if (!NON_ASCII.test(char)) {
      result += char;
      continue;
    }
    result += ASCII_MAP.get(char.codePointAt(0)) ?? replacement ?? char;
  }
  return result;
}

function removeMarks(input) {
  let result = "";
  let afterBase = false;
  for (const char of normalize(input, "NFD")) {
    const codePoint = char.codePointAt(0);
    if (afterBase && inSet(REMOVABLE_MARKS, codePoint)) continue;
    afterBase = inSet(MARK_BASES, codePoint);
    result += char;
  }
  return normalize(result, "NFC");
}

export default /* @__PURE__ */ Object.assign(toAscii, {
  toAscii,
  VERSION,
});
