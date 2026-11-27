import { assertCodePoint, assertString } from "@internal/helpers/assert";
import { lookupRange } from "@internal/helpers/tables";
import { AGES, AGE_VERSIONS, VERSION } from "#generated";

export { VERSION };

const VERSION_PATTERN = /^\d+(?:\.\d+){0,2}$/;

/**
 * Returns the Unicode version that introduced a character, e.g. "6.0"
 * @param {number} codePoint
 * @returns {string | undefined}
 */
export function getAge(codePoint) {
  assertCodePoint(codePoint);
  const age = lookupRange(AGES, codePoint);
  return age === null ? undefined : AGE_VERSIONS[age];
}

/**
 * Returns the Unicode version that introduced the newest character of a text
 * @param {string} text
 * @returns {string | undefined} undefined if a code point is unassigned
 */
export function getRequiredVersion(text) {
  assertString(text);
  let newest = 0;
  for (const char of text) {
    const age = lookupRange(AGES, char.codePointAt(0));
    if (age === null) return undefined;
    if (age > newest) newest = age;
  }
  return AGE_VERSIONS[newest];
}

/**
 * Checks whether a code point is assigned in a version of Unicode
 * @param {number} codePoint
 * @param {string} version - e.g. "15.1"
 * @returns {boolean}
 */
export function isAssignedIn(codePoint, version) {
  assertCodePoint(codePoint);
  assertString(version);
  if (!VERSION_PATTERN.test(version)) {
    throw new RangeError(`Invalid Unicode version: ${version}`);
  }
  const age = lookupRange(AGES, codePoint);
  return age !== null && compareVersions(AGE_VERSIONS[age], version) <= 0;
}

function compareVersions(a, b) {
  const [aMajor, aMinor = 0] = a.split(".").map(Number);
  const [bMajor, bMinor = 0] = b.split(".").map(Number);
  return aMajor - bMajor || aMinor - bMinor;
}

export default { getAge, getRequiredVersion, isAssignedIn, VERSION };
