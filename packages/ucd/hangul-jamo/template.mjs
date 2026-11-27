import {
  assertCodePoint,
  assertOption,
  assertString,
} from "@internal/helpers/assert";
import { lookupRange } from "@internal/helpers/tables";
import {
  COMPATIBILITY_BASE,
  COMPATIBILITY_FINALS,
  COMPATIBILITY_INITIALS,
  COMPATIBILITY_VOWELS,
  JAMO_TYPE_NAMES,
  JAMO_TYPES,
  VERSION,
} from "#generated";

export { VERSION };

const S_BASE = 0xac00;
const L_BASE = 0x1100;
const V_BASE = 0x1161;
const T_BASE = 0x11a7;
const L_COUNT = 19;
const V_COUNT = 21;
const T_COUNT = 28;
const N_COUNT = V_COUNT * T_COUNT;
const S_COUNT = L_COUNT * N_COUNT;

const L = 0;
const V = 1;
const T = 2;

const JAMO_FORMS = ["conjoining", "compatibility"];
const SYLLABLE = /[가-힣]/;
const SYLLABLES = /[가-힣]/g;
const CONJOINING = /[ᄀ-ᇿꥠ-ꥼힰ-ퟻ]/;
const COMPATIBILITY = /[ㄱ-ㆎ]/;
const COMPOSABLE = /[ᄀ-ᄒ][ᅡ-ᅵ][ᆨ-ᇂ]?|[가-힣][ᆨ-ᇂ]/g;

let conjoiningToCompatibility;

/**
 * Splits the Hangul syllables of a text into jamo, e.g. "한" → "ㅎㅏㄴ"
 * @param {string} text
 * @param {JamoOptions} [options]
 * @returns {string}
 */
export function toJamo(text, options = {}) {
  assertString(text);
  const compatibility = isCompatibility(options);
  const split = SYLLABLE.test(text)
    ? text.replace(SYLLABLES, splitSyllable)
    : text;
  return compatibility ? convertToCompatibility(split) : split;
}

/**
 * Joins jamo into Hangul syllables, e.g. "ㅎㅏㄴㄱㅡㄹ" → "한글"
 * @param {string} text - With conjoining or compatibility jamo
 * @returns {string}
 */
export function fromJamo(text) {
  assertString(text);
  const conjoining = convertToConjoining(text, true);
  return CONJOINING.test(conjoining)
    ? conjoining.replace(COMPOSABLE, joinSyllable)
    : conjoining;
}

/**
 * Converts conjoining jamo (U+1100…) to compatibility jamo (U+3131…)
 * @param {string} text
 * @returns {string}
 */
export function toCompatibilityJamo(text) {
  assertString(text);
  return convertToCompatibility(text);
}

/**
 * Converts compatibility jamo to conjoining jamo, as initials, vowels and finals
 * @param {string} text
 * @returns {string}
 */
export function toConjoiningJamo(text) {
  assertString(text);
  return convertToConjoining(text, false);
}

/**
 * Returns the initial consonant of each syllable, e.g. "한글" → "ㅎㄱ"
 * @param {string} text
 * @param {JamoOptions} [options] Compatibility jamo by default
 * @returns {string}
 */
export function getInitialConsonants(text, options = {}) {
  assertString(text);
  const compatibility = isCompatibility(options, "compatibility");
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const unit = text.charCodeAt(i);
    const index = unit - S_BASE;
    if (index >= 0 && index < S_COUNT) {
      const initial = L_BASE + Math.floor(index / N_COUNT);
      result += compatibility
        ? compatibilityOf(initial)
        : String.fromCharCode(initial);
      continue;
    }
    const type = unit < L_BASE ? -1 : lookupRange(JAMO_TYPES, unit);
    if (type === L) {
      result += compatibility ? compatibilityOf(unit) : text[i];
    } else if (type === -1) {
      result += text[i];
    }
  }
  return result;
}

/**
 * Returns the Hangul_Syllable_Type of a code point
 * @param {number} codePoint
 * @returns {"L" | "V" | "T" | "LV" | "LVT" | undefined} undefined if not Hangul
 */
export function getHangulSyllableType(codePoint) {
  assertCodePoint(codePoint);
  const index = codePoint - S_BASE;
  if (index >= 0 && index < S_COUNT) return index % T_COUNT ? "LVT" : "LV";
  return /** @type {"L" | "V" | "T" | undefined} */ (
    JAMO_TYPE_NAMES[lookupRange(JAMO_TYPES, codePoint)]
  );
}

function isCompatibility({ jamo }, fallback = "conjoining") {
  if (jamo === undefined) return fallback === "compatibility";
  assertOption("jamo", jamo, JAMO_FORMS);
  return jamo === "compatibility";
}

function splitSyllable(syllable) {
  const index = syllable.charCodeAt(0) - S_BASE;
  const final = index % T_COUNT;
  return String.fromCharCode(
    L_BASE + Math.floor(index / N_COUNT),
    V_BASE + Math.floor((index % N_COUNT) / T_COUNT),
    ...(final ? [T_BASE + final] : []),
  );
}

function joinSyllable(jamo) {
  const first = jamo.charCodeAt(0);
  if (first >= S_BASE) {
    return String.fromCharCode(first + jamo.charCodeAt(1) - T_BASE);
  }
  return String.fromCharCode(
    S_BASE +
      ((first - L_BASE) * V_COUNT + jamo.charCodeAt(1) - V_BASE) * T_COUNT +
      (jamo.length > 2 ? jamo.charCodeAt(2) - T_BASE : 0),
  );
}

function compatibilityOf(unit) {
  if (conjoiningToCompatibility === undefined) {
    conjoiningToCompatibility = new Map();
    for (const forms of [
      COMPATIBILITY_INITIALS,
      COMPATIBILITY_VOWELS,
      COMPATIBILITY_FINALS,
    ]) {
      forms.forEach((conjoining, index) => {
        if (conjoining !== 0) {
          conjoiningToCompatibility.set(
            conjoining,
            String.fromCharCode(COMPATIBILITY_BASE + index),
          );
        }
      });
    }
  }
  return conjoiningToCompatibility.get(unit) ?? String.fromCharCode(unit);
}

function convertToCompatibility(text) {
  if (!CONJOINING.test(text)) return text;
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const unit = text.charCodeAt(i);
    result += unit < L_BASE ? text[i] : compatibilityOf(unit);
  }
  return result;
}

// A consonant is an initial before a vowel, a final after an initial and a
// vowel that were jamo too, and otherwise stays as it is
function convertToConjoining(text, modernFinals) {
  if (!COMPATIBILITY.test(text)) return text;
  const length = COMPATIBILITY_INITIALS.length;
  let result = "";
  let previous = -1;
  let canTakeFinal = false;
  for (let i = 0; i < text.length; i++) {
    const unit = text.charCodeAt(i);
    const index = unit - COMPATIBILITY_BASE;
    if (index < 0 || index >= length) {
      const type = unit < L_BASE ? -1 : lookupRange(JAMO_TYPES, unit);
      canTakeFinal = type === V && previous === L;
      previous = type;
      result += text[i];
      continue;
    }
    let conjoining = 0;
    let type = -1;
    if (COMPATIBILITY_VOWELS[index] !== 0) {
      if (previous === L) {
        conjoining = COMPATIBILITY_VOWELS[index];
        type = V;
      }
    } else if (COMPATIBILITY_INITIALS[index] !== 0 && isVowelAt(text, i + 1)) {
      conjoining = COMPATIBILITY_INITIALS[index];
      type = L;
    } else if (
      canTakeFinal &&
      COMPATIBILITY_FINALS[index] !== 0 &&
      !(modernFinals && COMPATIBILITY_FINALS[index] >= T_BASE + T_COUNT)
    ) {
      conjoining = COMPATIBILITY_FINALS[index];
      type = T;
    }
    result += conjoining === 0 ? text[i] : String.fromCharCode(conjoining);
    canTakeFinal = type === V;
    previous = type;
  }
  return result;
}

function isVowelAt(text, i) {
  if (i >= text.length) return false;
  const unit = text.charCodeAt(i);
  const index = unit - COMPATIBILITY_BASE;
  if (index >= 0 && index < COMPATIBILITY_VOWELS.length) {
    return COMPATIBILITY_VOWELS[index] !== 0;
  }
  return unit >= L_BASE && lookupRange(JAMO_TYPES, unit) === V;
}

export default /* @__PURE__ */ Object.assign(toJamo, {
  toJamo,
  fromJamo,
  toCompatibilityJamo,
  toConjoiningJamo,
  getInitialConsonants,
  getHangulSyllableType,
  VERSION,
});

/**
 * @typedef {object} JamoOptions
 * @property {"conjoining" | "compatibility"} [jamo] Conjoining jamo
 *   (U+1100…) combine into syllable blocks when displayed; compatibility
 *   jamo (U+3131…) are the standalone letters of keyboards
 */
