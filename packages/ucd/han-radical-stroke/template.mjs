import { assertCodePoint, assertString } from "@internal/helpers/assert";
import { findRun, unpackInts } from "@internal/helpers/tables";
import {
  BIAS,
  EQUIVALENT_IDEOGRAPHS,
  RADICAL_CHARACTERS,
  RADICAL_STROKE_STARTS,
  RADICAL_STROKE_VALUES,
  VERSION,
} from "#generated";

export { VERSION };

const FIRST_CODE_POINT = 0x3400;
const NO_DATA = -1;

let starts;
let values;

function lookup(codePoint) {
  if (codePoint < FIRST_CODE_POINT) return NO_DATA;
  if (starts === undefined) {
    starts = unpackInts(RADICAL_STROKE_STARTS);
    values = unpackInts(RADICAL_STROKE_VALUES);
  }
  return values[findRun(starts, codePoint)];
}

const residualOf = (value) => ((value >> 7) & 127) - BIAS;
const totalOf = (value) => residualOf(value) + (value & 127) - BIAS;

/**
 * Returns the radical and the stroke counts of a Chinese character
 * @param {number} codePoint
 * @returns {RadicalStroke | undefined}
 */
export function getRadicalStroke(codePoint) {
  assertCodePoint(codePoint);
  const value = lookup(codePoint);
  if (value === NO_DATA) return undefined;
  return {
    radical: value >> 16,
    residualStrokes: residualOf(value),
    totalStrokes: totalOf(value),
  };
}

/**
 * Returns the total number of strokes of a Chinese character
 * @param {number} codePoint
 * @returns {number | undefined}
 */
export function getTotalStrokes(codePoint) {
  assertCodePoint(codePoint);
  const value = lookup(codePoint);
  return value === NO_DATA ? undefined : totalOf(value);
}

/**
 * Returns the character of a radical, e.g. "⼭" for 46
 * @param {number} radical - From 1 to 214
 * @returns {string | undefined}
 */
export function getRadicalCharacter(radical) {
  if (typeof radical !== "number") {
    throw new TypeError("Radical must be a number");
  }
  return RADICAL_CHARACTERS[radical - 1];
}

/**
 * Returns the ideograph equivalent to a radical or stroke character, e.g. "山" for "⼭"
 * @param {number} codePoint
 * @returns {string | undefined}
 */
export function getEquivalentIdeograph(codePoint) {
  assertCodePoint(codePoint);
  return EQUIVALENT_IDEOGRAPHS.get(codePoint);
}

/**
 * Compares two texts in radical-stroke order, for Array.prototype.sort()
 * @param {string} a
 * @param {string} b
 * @returns {number} Negative, zero or positive
 */
export function compareRadicalStroke(a, b) {
  assertString(a);
  assertString(b);
  let i = 0;
  while (i < a.length && i < b.length) {
    const first = a.codePointAt(i);
    const second = b.codePointAt(i);
    if (first !== second) {
      // Values order by radical, then residual strokes; NO_DATA comes first
      return (lookup(first) >> 7) - (lookup(second) >> 7) || first - second;
    }
    i += first > 0xffff ? 2 : 1;
  }
  return a.length - b.length;
}

export default /* @__PURE__ */ Object.assign(getRadicalStroke, {
  getRadicalStroke,
  getTotalStrokes,
  getRadicalCharacter,
  getEquivalentIdeograph,
  compareRadicalStroke,
  VERSION,
});

/**
 * @typedef {object} RadicalStroke
 * @property {number} radical Kangxi radical number, from 1 to 214
 * @property {number} residualStrokes Strokes besides the radical; negative for a few characters
 * @property {number} totalStrokes
 */
