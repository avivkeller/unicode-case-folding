import { assertCodePoint, assertString } from "@internal/helpers/assert";
import { directLookup, lookupRange } from "@internal/helpers/tables";
import {
  DECOMPOSITIONS,
  GROUP_NAMES,
  JOINING_GROUPS,
  JOINING_TYPES,
  LETTER_FORMS,
  LIGATURE_FORMS,
  VERSION,
} from "#generated";

export { VERSION };

const TYPES = "URLDCT";
const RIGHT = 1;
const LEFT = 2;
const DUAL = 3;
const CAUSING = 4;
const TRANSPARENT = 5;

const ISOLATED = 0;
const FINAL = 1;
const INITIAL = 2;
const MEDIAL = 3;

const typeOf = /* @__PURE__ */ directLookup(JOINING_TYPES);

const FIRST_LETTER = LETTER_FORMS[0];
const LAST_LETTER = LETTER_FORMS[LETTER_FORMS.length - 5];
// Four forms per letter from FIRST_LETTER, 0 for none; then the ligatures
// of each letter as [second letter, isolated, final, …]
let forms;
let ligatures;
function loadForms() {
  forms = new Uint16Array((LAST_LETTER - FIRST_LETTER + 1) * 4);
  for (let i = 0; i < LETTER_FORMS.length; i += 5) {
    forms.set(
      LETTER_FORMS.slice(i + 1, i + 5),
      (LETTER_FORMS[i] - FIRST_LETTER) * 4,
    );
  }
  ligatures = new Map();
  for (let i = 0; i < LIGATURE_FORMS.length; i += 6) {
    const first = LIGATURE_FORMS[i];
    if (!ligatures.has(first)) ligatures.set(first, []);
    ligatures.get(first).push(...LIGATURE_FORMS.slice(i + 1, i + 4));
  }
}

/**
 * Replaces Arabic letters with their contextual presentation forms, e.g. "سلام" → "ﺳﻼﻡ"
 * @param {string} text
 * @param {ShapingOptions} [options]
 * @returns {string} In logical order, like the text
 */
export function toPresentationForms(text, options = {}) {
  assertString(text);
  const { ligatures: withLigatures = true } = options;
  if (forms === undefined) loadForms();

  const length = text.length;
  let result = "";
  let copied = 0;
  let previousJoins = false;
  for (let i = 0; i < length; ) {
    const unit = text.charCodeAt(i);
    const codePoint = unit < 0xd800 ? unit : text.codePointAt(i);
    const size = codePoint > 0xffff ? 2 : 1;
    const type = typeOf(codePoint);
    if (type === TRANSPARENT) {
      i += size;
      continue;
    }
    if (codePoint < FIRST_LETTER || codePoint > LAST_LETTER) {
      previousJoins = type >= LEFT && type <= CAUSING;
      i += size;
      continue;
    }

    let next = i + 1;
    let nextCodePoint = -1;
    let nextType = 0;
    while (next < length) {
      const nextUnit = text.charCodeAt(next);
      nextCodePoint = nextUnit < 0xd800 ? nextUnit : text.codePointAt(next);
      nextType = typeOf(nextCodePoint);
      if (nextType !== TRANSPARENT) break;
      next += nextCodePoint > 0xffff ? 2 : 1;
    }
    if (next >= length) nextType = 0;

    const joinsPrevious = previousJoins && (type === RIGHT || type === DUAL);
    const joinsNext =
      (type === LEFT || type === DUAL) &&
      (nextType === RIGHT || nextType === DUAL || nextType === CAUSING);
    previousJoins = type >= LEFT && type <= CAUSING;

    const pairs =
      withLigatures && joinsNext ? ligatures.get(codePoint) : undefined;
    const pair = pairs === undefined ? -1 : pairIndex(pairs, nextCodePoint);
    if (pair !== -1) {
      // The marks of the first letter go after the ligature
      result +=
        text.slice(copied, i) +
        String.fromCharCode(pairs[pair + (joinsPrevious ? 2 : 1)]) +
        text.slice(i + 1, next);
      i = copied = next + 1;
      previousJoins = false;
      continue;
    }

    const form =
      forms[
        (codePoint - FIRST_LETTER) * 4 +
          (joinsPrevious
            ? joinsNext
              ? MEDIAL
              : FINAL
            : joinsNext
              ? INITIAL
              : ISOLATED)
      ];
    if (form !== 0) {
      result += text.slice(copied, i) + String.fromCharCode(form);
      copied = i + 1;
    }
    i++;
  }
  return copied === 0 ? text : result + text.slice(copied);
}

function pairIndex(pairs, second) {
  for (let i = 0; i < pairs.length; i += 3) {
    if (pairs[i] === second) return i;
  }
  return -1;
}

/**
 * Replaces Arabic presentation forms and ligatures with their letters, e.g. "ﺳﻼﻡ" → "سلام"
 * @param {string} text
 * @returns {string}
 */
export function fromPresentationForms(text) {
  assertString(text);
  let result = "";
  let copied = 0;
  for (let i = 0; i < text.length; i++) {
    const unit = text.charCodeAt(i);
    if (unit < 0xfb50 || unit > 0xfeff) continue;
    const letters = DECOMPOSITIONS.get(unit);
    if (letters === undefined) continue;
    result += text.slice(copied, i) + letters;
    copied = i + 1;
  }
  return copied === 0 ? text : result + text.slice(copied);
}

/**
 * Returns the Joining_Type property of a code point
 * @param {number} codePoint
 * @returns {JoiningType} "U" if it does not join
 */
export function getJoiningType(codePoint) {
  assertCodePoint(codePoint);
  return /** @type {JoiningType} */ (TYPES[typeOf(codePoint)]);
}

/**
 * Returns the Joining_Group property of a code point, e.g. "Beh" for ب, ت and ث
 * @param {number} codePoint
 * @returns {string | undefined}
 */
export function getJoiningGroup(codePoint) {
  assertCodePoint(codePoint);
  return GROUP_NAMES[lookupRange(JOINING_GROUPS, codePoint)];
}

export default /* @__PURE__ */ Object.assign(toPresentationForms, {
  toPresentationForms,
  fromPresentationForms,
  getJoiningType,
  getJoiningGroup,
  VERSION,
});

/**
 * Right-joining, left-joining, dual-joining, join-causing, non-joining or
 * transparent
 * @typedef {"R" | "L" | "D" | "C" | "U" | "T"} JoiningType
 */

/**
 * @typedef {object} ShapingOptions
 * @property {boolean} [ligatures] Join lam and alef into their ligature; true by default
 */
