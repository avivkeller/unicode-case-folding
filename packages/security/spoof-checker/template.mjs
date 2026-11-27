import {
  assertCodePoint,
  assertOption,
  assertString,
} from "@internal/helpers/assert";
import {
  hasRightToLeftOrExplicit,
  isRemovedByX9,
  mirroringGlyph,
  resolveLevels,
  visualRuns,
} from "@internal/helpers/bidi";
import { inSet, lookupRange } from "@internal/helpers/tables";
import {
  ALLOWED_TYPE_LISTS,
  AUGMENTED_SCRIPT_SETS,
  BIDI,
  COMBINING_MARKS,
  CONFUSABLES,
  DEFAULT_IGNORABLES,
  IDENTIFIER_TYPE_LISTS,
  IDENTIFIER_TYPES_OF,
  RECOMMENDED_SCRIPTS,
  SCRIPTS,
  VERSION,
} from "#generated";

export { VERSION };

const DIRECTIONS = ["ltr", "rtl", "auto"];
const NON_ASCII = /\P{ASCII}/u;
const HIGHLY_RESTRICTIVE_SYSTEMS = ["Jpan", "Hanb", "Kore"];

/**
 * Returns the skeleton of a string: confusable strings have equal skeletons.
 * Do not store skeletons: they change between Unicode versions.
 * @param {string} input
 * @param {SkeletonOptions} [options]
 * @returns {string}
 */
export function skeleton(input, options = {}) {
  assertString(input);
  const { direction = "ltr" } = options;
  assertOption("direction", direction, DIRECTIONS);

  if (direction !== "rtl" && !NON_ASCII.test(input)) {
    let mapped = "";
    for (const char of input) {
      mapped += CONFUSABLES.get(char.charCodeAt(0)) ?? char;
    }
    return NON_ASCII.test(mapped) ? mapped.normalize("NFD") : mapped;
  }
  return internalSkeleton(displayOrder(input, direction));
}

/**
 * Checks whether the skeletons of two strings are equal
 * @param {string} a
 * @param {string} b
 * @param {SkeletonOptions} [options]
 * @returns {boolean}
 */
export function areConfusable(a, b, options) {
  return skeleton(a, options) === skeleton(b, options);
}

/**
 * Classifies two confusable strings by the scripts they share
 * @param {string} a
 * @param {string} b
 * @returns {ConfusableType | null} null if not confusable
 */
export function getConfusableType(a, b) {
  if (skeleton(a) !== skeleton(b)) return null;
  const scriptsA = resolvedScriptSet(a);
  const scriptsB = resolvedScriptSet(b);
  if (!isEmpty(intersect(scriptsA, scriptsB))) return "single-script";
  return !isEmpty(scriptsA) && !isEmpty(scriptsB)
    ? "whole-script"
    : "mixed-script";
}

/**
 * Returns the scripts that every character of a string belongs to
 * @param {string} input
 * @returns {string[] | null} Empty if mixed-script, null if any script fits
 */
export function getResolvedScripts(input) {
  assertString(input);
  const scripts = resolvedScriptSet(input);
  return scripts === null ? null : [...scripts];
}

/**
 * Checks whether no script covers all characters of a string
 * @param {string} input
 * @returns {boolean}
 */
export function isMixedScript(input) {
  assertString(input);
  return isEmpty(resolvedScriptSet(input));
}

/**
 * Returns the most restrictive UTS #39 restriction level an identifier meets
 * @param {string} identifier
 * @returns {RestrictionLevel}
 */
export function getRestrictionLevel(identifier) {
  assertString(identifier);
  const normalized = identifier.normalize("NFC");
  for (const char of normalized) {
    if (!isAllowedInProfile(char)) return "unrestricted";
  }
  if (!NON_ASCII.test(normalized)) return "ascii-only";

  // Equal script sets are the same object
  const scriptSets = new Set();
  for (const char of normalized) {
    const scripts = augmentedScriptSet(char.codePointAt(0));
    if (scripts !== null) scriptSets.add(scripts);
  }
  if (!isEmpty(intersectAll(scriptSets))) return "single-script";

  const withoutLatin = [...scriptSets].filter(
    (scripts) => !scripts.includes("Latn"),
  );
  const isCoveredBy = (writingSystem) =>
    withoutLatin.every((scripts) => scripts.includes(writingSystem));
  if (HIGHLY_RESTRICTIVE_SYSTEMS.some(isCoveredBy)) {
    return "highly-restrictive";
  }

  const common = intersectAll(withoutLatin) ?? [];
  if (
    common.some(
      (script) =>
        RECOMMENDED_SCRIPTS.has(script) &&
        script !== "Cyrl" &&
        script !== "Grek",
    )
  ) {
    return "moderately-restrictive";
  }
  return "minimally-restrictive";
}

/**
 * Checks whether the Identifier_Status of a code point is Allowed
 * @param {number} codePoint
 * @returns {boolean}
 */
export function isAllowedInIdentifier(codePoint) {
  assertCodePoint(codePoint);
  return ALLOWED_TYPE_LISTS.has(identifierTypeList(codePoint));
}

/**
 * Returns the Identifier_Type values of a code point, e.g. ["Recommended"]
 * @param {number} codePoint
 * @returns {string[]}
 */
export function getIdentifierTypes(codePoint) {
  assertCodePoint(codePoint);
  return [...IDENTIFIER_TYPE_LISTS[identifierTypeList(codePoint)]];
}

function internalSkeleton(input) {
  let mapped = "";
  for (const char of input.normalize("NFD")) {
    const codePoint = char.codePointAt(0);
    if (!inSet(DEFAULT_IGNORABLES, codePoint)) {
      mapped += CONFUSABLES.get(codePoint) ?? char;
    }
  }
  return mapped.normalize("NFD");
}

// "ü" is allowed if "u" and the combining diaeresis are
function isAllowedInProfile(char) {
  const allowed = (part) =>
    ALLOWED_TYPE_LISTS.has(identifierTypeList(part.codePointAt(0)));
  return allowed(char) || Array.from(char.normalize("NFD")).every(allowed);
}

// Script sets are sorted arrays of script codes, or null for ALL
function resolvedScriptSet(input) {
  let resolved = null;
  for (const char of input) {
    resolved = intersect(resolved, augmentedScriptSet(char.codePointAt(0)));
    if (isEmpty(resolved)) break;
  }
  return resolved;
}

function isEmpty(scripts) {
  return scripts !== null && scripts.length === 0;
}

function intersect(a, b) {
  if (a === null) return b;
  if (b === null) return a;
  return a.filter((script) => b.includes(script));
}

function intersectAll(scriptSets) {
  let result = null;
  for (const scripts of scriptSets) result = intersect(result, scripts);
  return result;
}

function augmentedScriptSet(codePoint) {
  return AUGMENTED_SCRIPT_SETS[lookupRange(SCRIPTS, codePoint)];
}

function identifierTypeList(codePoint) {
  return lookupRange(IDENTIFIER_TYPES_OF, codePoint);
}

function displayOrder(input, direction) {
  if (direction !== "rtl" && !hasRightToLeftOrExplicit(BIDI, input)) {
    return input;
  }
  const { codePoints, classes, levels, paragraphs } = resolveLevels(
    BIDI,
    input,
    direction,
  );

  const order = [];
  for (const [start, end] of paragraphs) {
    for (const [runStart, runEnd, level] of visualRuns(
      levels.subarray(start, end),
    )) {
      if (level % 2 === 0) {
        for (let i = runStart; i < runEnd; i++) order.push(start + i);
      } else {
        for (let i = runEnd - 1; i >= runStart; i--) order.push(start + i);
      }
    }
  }

  keepMarksAfterBase(order, levels, codePoints, classes);

  let result = "";
  for (const index of order) {
    let codePoint = codePoints[index];
    if (levels[index] % 2 === 1) {
      codePoint = mirroringGlyph(BIDI, codePoint) ?? codePoint;
    }
    result += String.fromCodePoint(codePoint);
  }
  return result;
}

function keepMarksAfterBase(order, levels, codePoints, classes) {
  const followsBase = (index) =>
    inSet(COMBINING_MARKS, codePoints[index]) || isRemovedByX9(classes[index]);
  const continuesRun = (k) =>
    order[k] === order[k - 1] - 1 && levels[order[k]] === levels[order[k - 1]];

  let i = 0;
  while (i < order.length) {
    if (levels[order[i]] % 2 === 0 || !followsBase(order[i])) {
      i++;
      continue;
    }
    let end = i + 1;
    while (end < order.length && continuesRun(end) && followsBase(order[end])) {
      end++;
    }
    if (end < order.length && continuesRun(end)) {
      reverse(order, i, end + 1);
      i = end + 1;
    } else {
      i = end;
    }
  }
}

function reverse(array, start, end) {
  for (let low = start, high = end - 1; low < high; low++, high--) {
    [array[low], array[high]] = [array[high], array[low]];
  }
}

export default {
  skeleton,
  areConfusable,
  getConfusableType,
  getResolvedScripts,
  isMixedScript,
  getRestrictionLevel,
  isAllowedInIdentifier,
  getIdentifierTypes,
  VERSION,
};

/** @typedef {"ltr" | "rtl" | "auto"} Direction */

/**
 * @typedef {object} SkeletonOptions
 * @property {Direction} [direction] "ltr" by default
 */

/** @typedef {"ascii-only" | "single-script" | "highly-restrictive" | "moderately-restrictive" | "minimally-restrictive" | "unrestricted"} RestrictionLevel */

/** @typedef {"single-script" | "mixed-script" | "whole-script"} ConfusableType */
