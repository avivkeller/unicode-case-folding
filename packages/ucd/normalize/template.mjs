import {
  assertCodePoint,
  assertOption,
  assertString,
} from "@internal/helpers/assert";
import { lookupRange } from "@internal/helpers/tables";
import {
  CANONICAL,
  CLASS_MASK,
  COMPATIBILITY,
  COMPOSITIONS,
  LEAD_SURROGATE,
  NFC_NO_OR_MAYBE,
  NFD_NO,
  NFKC_NO_OR_MAYBE,
  NFKD_NO,
  PROPERTIES,
  STABLE_BELOW,
  VERSION,
} from "#generated";

export { VERSION };

// Hangul syllables, Unicode Standard section 3.12
const S_BASE = 0xac00;
const L_BASE = 0x1100;
const V_BASE = 0x1161;
const T_BASE = 0x11a7;
const L_COUNT = 19;
const V_COUNT = 21;
const T_COUNT = 28;
const N_COUNT = V_COUNT * T_COUNT;
const S_COUNT = L_COUNT * N_COUNT;

const FORMS = {
  NFC: /* @__PURE__ */ defineForm(NFC_NO_OR_MAYBE, NFD_NO, STABLE_BELOW.NFC),
  NFD: /* @__PURE__ */ defineForm(NFD_NO, NFD_NO, STABLE_BELOW.NFD),
  NFKC: /* @__PURE__ */ defineForm(
    NFKC_NO_OR_MAYBE,
    NFKD_NO,
    STABLE_BELOW.NFKC,
  ),
  NFKD: /* @__PURE__ */ defineForm(NFKD_NO, NFKD_NO, STABLE_BELOW.NFKD),
};
const FORM_NAMES = /* @__PURE__ */ Object.keys(FORMS);

function defineForm(unstable, decomposes, stableBelow) {
  const first = stableBelow.toString(16).padStart(4, "0");
  return {
    unstable,
    decomposes,
    compatibility: decomposes === NFKD_NO,
    composes: unstable !== decomposes,
    // Far faster than a loop, most of all on strings V8 stores as Latin-1
    notStable: new RegExp(`[\\u${first}-\\uffff]`),
  };
}

const CLASS_SHIFT = 21;
const CODE_POINT_MASK = 0x1fffff;
const MAX_ARGUMENTS = 4096;
const MAX_COPIED = 16;

// PROPERTIES of each BMP code point: quick check flags | combining class
let bmp;

// Both reused by every call. Buffer entries are
// code point | combining class << 21, kept in canonical order
const buffer = [];
const units = [];

/**
 * Normalizes a string (UAX #15)
 * @param {string} input
 * @param {"NFC" | "NFD" | "NFKC" | "NFKD"} [form="NFC"]
 * @returns {string}
 */
export function normalize(input, form = "NFC") {
  assertString(input);
  assertOption("form", form, FORM_NAMES);
  const rules = FORMS[form];
  const start = firstUnstable(input, rules);
  return start === -1 ? input : rewrite(input, start, rules);
}

/**
 * Returns whether a string is in a normalization form
 * @param {string} input
 * @param {"NFC" | "NFD" | "NFKC" | "NFKD"} [form="NFC"]
 * @returns {boolean}
 */
export function isNormalized(input, form = "NFC") {
  assertString(input);
  assertOption("form", form, FORM_NAMES);
  const rules = FORMS[form];
  const start = firstUnstable(input, rules);
  if (start === -1) return true;
  // Only composition can leave a character that fails the quick check as is
  return rules.composes && rewrite(input, start, rules) === input;
}

/**
 * Returns the full decomposition of a code point, in canonical order
 * @param {number} codePoint
 * @param {object} [options]
 * @param {boolean} [options.compatibility=false] Also apply compatibility mappings, as NFKD does
 * @returns {number[] | undefined} undefined if it does not decompose
 */
export function lookupDecomposition(codePoint, { compatibility = false } = {}) {
  assertCodePoint(codePoint);
  const form = compatibility ? FORMS.NFKD : FORMS.NFD;
  bmp ??= bmpTable();
  const props = properties(codePoint);
  if (!(props & form.decomposes)) return undefined;
  const size = decompose(codePoint, props, form, 0);
  const result = [];
  for (let i = 0; i < size; i++) result.push(buffer[i] & CODE_POINT_MASK);
  return result;
}

/**
 * Returns the Canonical_Combining_Class of a code point
 * @param {number} codePoint
 * @returns {number} 0 for a starter
 */
export function getCombiningClass(codePoint) {
  assertCodePoint(codePoint);
  bmp ??= bmpTable();
  return properties(codePoint) & CLASS_MASK;
}

function bmpTable() {
  const table = new Uint16Array(0x10000);
  const [starts, values] = PROPERTIES;
  for (let i = 0; starts[i] <= 0xffff; i++) {
    table.fill(values[i], starts[i], starts[i + 1]);
  }
  return table;
}

function properties(codePoint) {
  return codePoint <= 0xffff
    ? bmp[codePoint]
    : lookupRange(PROPERTIES, codePoint);
}

function firstUnstable(input, form) {
  const index = input.search(form.notStable);
  if (index === -1) return -1;
  bmp ??= bmpTable();
  return findUnstable(input, Math.max(index - 1, 0), form);
}

// Index of the last stable starter before the first character that fails the
// quick check or is out of canonical order, or -1
function findUnstable(input, from, form) {
  const { unstable } = form;
  const table = bmp;
  let starter = from;
  let lastClass = 0;
  for (let i = from, next; i < input.length; i = next) {
    next = i + 1;
    let props = table[input.charCodeAt(i)];
    if (props === 0) {
      starter = i;
      lastClass = 0;
      continue;
    }
    if (props === LEAD_SURROGATE) {
      const codePoint = input.codePointAt(i);
      if (codePoint > 0xffff) {
        props = lookupRange(PROPERTIES, codePoint);
        next++;
      }
    }
    const ccc = props & CLASS_MASK;
    if (props & unstable || (ccc !== 0 && ccc < lastClass)) return starter;
    if (ccc === 0) starter = i;
    lastClass = ccc;
  }
  return -1;
}

function rewrite(input, first, form) {
  const boundary = form.unstable | CLASS_MASK;
  let result = "";
  let length = 0;
  let copied = 0;
  for (let start = first; ; ) {
    const end = start === -1 ? input.length : start;
    // Short stretches go through the units, sparing a string for each
    if (end - copied > MAX_COPIED || length >= MAX_ARGUMENTS) {
      result += unitsToString(length) + input.slice(copied, end);
      length = 0;
    } else {
      for (let i = copied; i < end; i++) units[length++] = input.charCodeAt(i);
    }
    if (start === -1) return result + unitsToString(length);

    let size = 0;
    let i = start;
    while (i < input.length) {
      const codePoint = input.codePointAt(i);
      const props = properties(codePoint);
      // Nothing before a stable starter interacts with what follows it
      if (i > start && !(props & boundary)) break;
      size = decompose(codePoint, props, form, size);
      i += codePoint > 0xffff ? 2 : 1;
    }
    if (form.composes) size = compose(size);
    for (let j = 0; j < size; j++) {
      const codePoint = buffer[j] & CODE_POINT_MASK;
      if (codePoint > 0xffff) {
        units[length++] = 0xd800 + ((codePoint - 0x10000) >> 10);
        units[length++] = 0xdc00 + (codePoint & 0x3ff);
      } else {
        units[length++] = codePoint;
      }
    }
    copied = i;
    start = findUnstable(input, i, form);
  }
}

function unitsToString(length) {
  if (length <= MAX_ARGUMENTS) {
    units.length = length;
    return String.fromCharCode.apply(undefined, units);
  }
  let result = "";
  for (let i = 0; i < length; i += MAX_ARGUMENTS) {
    result += String.fromCharCode.apply(
      undefined,
      units.slice(i, Math.min(i + MAX_ARGUMENTS, length)),
    );
  }
  return result;
}

// Appends to the buffer, and returns its new size
function decompose(codePoint, props, form, size) {
  if (!(props & form.decomposes)) {
    return append(codePoint, props & CLASS_MASK, size);
  }
  const syllable = codePoint - S_BASE;
  if (syllable >= 0 && syllable < S_COUNT) {
    buffer[size++] = L_BASE + Math.floor(syllable / N_COUNT);
    buffer[size++] = V_BASE + Math.floor((syllable % N_COUNT) / T_COUNT);
    const trailing = syllable % T_COUNT;
    if (trailing) buffer[size++] = T_BASE + trailing;
    return size;
  }
  const mapping =
    (form.compatibility ? COMPATIBILITY.get(codePoint) : undefined) ??
    CANONICAL.get(codePoint);
  for (let i = 0; i < mapping.length; ) {
    const part = mapping.codePointAt(i);
    size = append(part, properties(part) & CLASS_MASK, size);
    i += part > 0xffff ? 2 : 1;
  }
  return size;
}

function append(codePoint, ccc, size) {
  let i = size;
  if (ccc !== 0) {
    for (; i > 0 && buffer[i - 1] >>> CLASS_SHIFT > ccc; i--) {
      buffer[i] = buffer[i - 1];
    }
  }
  buffer[i] = codePoint | (ccc << CLASS_SHIFT);
  return size + 1;
}

// Composes the buffer in place, and returns its new size
function compose(size) {
  let starter = -1;
  let lastClass = 0;
  let length = 0;
  for (let i = 0; i < size; i++) {
    const entry = buffer[i];
    const ccc = entry >>> CLASS_SHIFT;
    // Not blocked: adjacent to the starter, or only lower classes in between
    if (starter !== -1 && (lastClass < ccc || lastClass === 0)) {
      const composite = composePair(buffer[starter], entry & CODE_POINT_MASK);
      if (composite !== -1) {
        buffer[starter] = composite;
        continue;
      }
    }
    if (ccc === 0) starter = length;
    lastClass = ccc;
    buffer[length++] = entry;
  }
  return length;
}

let pairs;

function composePair(first, second) {
  const leading = first - L_BASE;
  if (leading >= 0 && leading < L_COUNT) {
    const vowel = second - V_BASE;
    return vowel >= 0 && vowel < V_COUNT
      ? S_BASE + (leading * V_COUNT + vowel) * T_COUNT
      : -1;
  }
  const syllable = first - S_BASE;
  if (syllable >= 0 && syllable < S_COUNT) {
    const trailing = second - T_BASE;
    return syllable % T_COUNT === 0 && trailing > 0 && trailing < T_COUNT
      ? first + trailing
      : -1;
  }
  pairs ??= pairTable();
  return pairs.get(second)?.get(first) ?? -1;
}

// second → first → composite: few characters are ever a second
function pairTable() {
  const table = new Map();
  for (let i = 0; i < COMPOSITIONS.length; i += 3) {
    const second = COMPOSITIONS[i + 1];
    let firsts = table.get(second);
    if (firsts === undefined) table.set(second, (firsts = new Map()));
    firsts.set(COMPOSITIONS[i], COMPOSITIONS[i + 2]);
  }
  return table;
}

export default /* @__PURE__ */ Object.assign(normalize, {
  normalize,
  isNormalized,
  lookupDecomposition,
  getCombiningClass,
  VERSION,
});
