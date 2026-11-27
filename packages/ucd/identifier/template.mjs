import { assertCodePoint, assertString } from "@internal/helpers/assert";
import { directLookup } from "@internal/helpers/tables";
import { FLAGS, VERSION } from "#generated";

export { VERSION };

const ID_START = 1;
const ID_CONTINUE = 2;
const XID_START = 4;
const XID_CONTINUE = 8;
const PATTERN_SYNTAX = 16;
const PATTERN_WHITE_SPACE = 32;

const flagsOf = /* @__PURE__ */ directLookup(FLAGS);

/**
 * Checks whether a text is an identifier of UAX #31: a start character, then continue characters
 * @param {string} text
 * @param {IdentifierOptions & { extraStart?: string, extraContinue?: string }} [options]
 *   extraStart: more characters to allow anywhere, e.g. "$_";
 *   extraContinue: more to allow after the first, e.g. "-"
 * @returns {boolean}
 */
export function isIdentifier(text, options = {}) {
  assertString(text);
  const { xid = true, extraStart = "", extraContinue = "" } = options;
  assertString(extraStart);
  assertString(extraContinue);
  if (text === "") return false;

  const first = text.codePointAt(0);
  if (
    !(flagsOf(first) & (xid ? XID_START : ID_START)) &&
    !hasCodePoint(extraStart, first)
  ) {
    return false;
  }
  const rest = xid ? XID_CONTINUE : ID_CONTINUE;
  for (let i = first > 0xffff ? 2 : 1; i < text.length; ) {
    const codePoint = text.codePointAt(i);
    if (
      !(flagsOf(codePoint) & rest) &&
      !hasCodePoint(extraContinue, codePoint) &&
      !hasCodePoint(extraStart, codePoint)
    ) {
      return false;
    }
    i += codePoint > 0xffff ? 2 : 1;
  }
  return true;
}

/**
 * Checks whether a code point can start an identifier: XID_Start, or ID_Start
 * @param {number} codePoint
 * @param {IdentifierOptions} [options]
 * @returns {boolean}
 */
export function isIdentifierStart(codePoint, { xid = true } = {}) {
  assertCodePoint(codePoint);
  return (flagsOf(codePoint) & (xid ? XID_START : ID_START)) !== 0;
}

/**
 * Checks whether a code point can continue an identifier: XID_Continue, or ID_Continue
 * @param {number} codePoint
 * @param {IdentifierOptions} [options]
 * @returns {boolean}
 */
export function isIdentifierContinue(codePoint, { xid = true } = {}) {
  assertCodePoint(codePoint);
  return (flagsOf(codePoint) & (xid ? XID_CONTINUE : ID_CONTINUE)) !== 0;
}

/**
 * Checks the Pattern_Syntax property: the characters reserved for the syntax of languages
 * @param {number} codePoint
 * @returns {boolean}
 */
export function isPatternSyntax(codePoint) {
  assertCodePoint(codePoint);
  return (flagsOf(codePoint) & PATTERN_SYNTAX) !== 0;
}

/**
 * Checks the Pattern_White_Space property: the white space between the tokens of languages
 * @param {number} codePoint
 * @returns {boolean}
 */
export function isPatternWhiteSpace(codePoint) {
  assertCodePoint(codePoint);
  return (flagsOf(codePoint) & PATTERN_WHITE_SPACE) !== 0;
}

function hasCodePoint(characters, codePoint) {
  return (
    characters !== "" && characters.includes(String.fromCodePoint(codePoint))
  );
}

export default /* @__PURE__ */ Object.assign(isIdentifier, {
  isIdentifier,
  isIdentifierStart,
  isIdentifierContinue,
  isPatternSyntax,
  isPatternWhiteSpace,
  VERSION,
});

/**
 * @typedef {object} IdentifierOptions
 * @property {boolean} [xid] Use XID_Start and XID_Continue, which NFKC
 *   keeps, rather than ID_Start and ID_Continue; true by default
 */
