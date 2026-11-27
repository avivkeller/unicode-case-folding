import { assertCodePoint, assertString } from "@internal/helpers/assert";
import { lookupRange } from "@internal/helpers/tables";
import {
  EXTENSION_LISTS,
  EXTENSIONS,
  SCRIPT_CODES,
  SCRIPTS,
  VERSION,
} from "#generated";

export { VERSION };

const SCRIPT_CODE = /^[A-Z][a-z]{3}$/;

/**
 * Returns the Script property of a code point as an ISO 15924 code, e.g. "Latn"
 * @param {number} codePoint
 * @returns {string} "Zyyy" if common, "Zinh" if inherited, "Zzzz" if unknown
 */
export function getScript(codePoint) {
  assertCodePoint(codePoint);
  return SCRIPT_CODES[lookupRange(SCRIPTS, codePoint)];
}

/**
 * Returns the Script_Extensions property: every script a code point is used in
 * @param {number} codePoint
 * @returns {string[]} ISO 15924 codes, sorted
 */
export function getScriptExtensions(codePoint) {
  assertCodePoint(codePoint);
  const list = lookupRange(EXTENSIONS, codePoint);
  return list === -1
    ? [SCRIPT_CODES[lookupRange(SCRIPTS, codePoint)]]
    : [...EXTENSION_LISTS[list]];
}

/**
 * Checks whether a code point is used in a script, by its Script_Extensions
 * @param {number} codePoint
 * @param {string} script - ISO 15924 code, e.g. "Deva"
 * @returns {boolean}
 */
export function hasScript(codePoint, script) {
  assertCodePoint(codePoint);
  assertString(script);
  if (!SCRIPT_CODE.test(script)) {
    throw new RangeError(`Invalid script code: ${script}`);
  }
  const list = lookupRange(EXTENSIONS, codePoint);
  return list === -1
    ? SCRIPT_CODES[lookupRange(SCRIPTS, codePoint)] === script
    : EXTENSION_LISTS[list].includes(script);
}

export default { getScript, getScriptExtensions, hasScript, VERSION };
