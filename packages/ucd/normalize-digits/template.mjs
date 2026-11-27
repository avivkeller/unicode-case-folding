import { assertCodePoint, assertString } from "@internal/helpers/assert";
import { findRun } from "@internal/helpers/tables";
import { DIGIT_ZEROS, NUMERIC_VALUES, VERSION } from "#generated";

export { VERSION };

const NON_ASCII = /\P{ASCII}/u;

/**
 * Replaces the decimal digits of every script with ASCII digits
 * @param {string} text
 * @returns {string}
 */
export function normalizeDigits(text) {
  assertString(text);
  if (!NON_ASCII.test(text)) return text;

  let result = "";
  for (const char of text) {
    const codePoint = char.codePointAt(0);
    // Before the second run of digits, the only digits are ASCII
    const digit =
      codePoint < DIGIT_ZEROS[1] ? undefined : digitValue(codePoint);
    result += digit === undefined ? char : digit;
  }
  return result;
}

/**
 * Returns the value (0-9) of a decimal digit of any script
 * @param {number} codePoint
 * @returns {number | undefined}
 */
export function getDigitValue(codePoint) {
  assertCodePoint(codePoint);
  return digitValue(codePoint);
}

/**
 * Returns the numeric value of a character, e.g. 0.5 for "½"
 * @param {number} codePoint
 * @returns {number | undefined}
 */
export function getNumericValue(codePoint) {
  assertCodePoint(codePoint);
  return NUMERIC_VALUES.get(codePoint);
}

function digitValue(codePoint) {
  const value = codePoint - DIGIT_ZEROS[findRun(DIGIT_ZEROS, codePoint)];
  return value <= 9 ? value : undefined;
}

export default { normalizeDigits, getDigitValue, getNumericValue, VERSION };
