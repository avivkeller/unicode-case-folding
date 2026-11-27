import { assertOption, assertString } from "@internal/helpers/assert";
import { lookupRange, toCodePoints } from "@internal/helpers/tables";
import { getCombiningClass, normalize } from "unicode-normalize";
import {
  CODE_POINTS,
  CONTRACTIONS,
  COUNTS,
  IMPLICIT_KINDS,
  LOWER_INDEXES,
  LOWER_WEIGHTS,
  MAX_COUNT,
  PRIMARIES,
  SINIFORM_KINDS,
  VERSION,
} from "#generated";

export { VERSION };

const STRENGTHS = [
  "primary",
  "secondary",
  "tertiary",
  "quaternary",
  "identical",
];
const ALTERNATES = ["non-ignorable", "shifted"];

// A collation element is primary << 15 | variable << 14 | secondary << 5 | tertiary
const PRIMARY_SHIFT = 15;
const PRIMARY_MASK = 0xffff;
const VARIABLE = 0x4000;
const SECONDARY_SHIFT = 5;
const SECONDARY_MASK = 0x1ff;
const TERTIARY_MASK = 0x1f;
// [.AAAA.0020.0002] without its primary
const IMPLICIT_LOWER = (0x20 << SECONDARY_SHIFT) | 2;

// U+FFFE sorts before any other code point at the identical level, section 10.1.5
const MERGE_SEPARATOR = 0xfffe;

const CORE_HAN = 1;
const OTHER_HAN = 2;
const SINIFORM = 3;

// Planes 0 and 1 have nearly all the text; the rest is looked up in a map
const DIRECT_LIMIT = 0x20000;
const MAX_ARGUMENTS = 4096;

// An entry is offset in elements << 6 | count << 1 | starts a contraction
let elements;
let direct;
let others;
// First code point → { entry, next: code point → … }
let contractions;

// Kept between calls: a sort compares the same string many times in a row
let left = /* @__PURE__ */ newArray();
let right = /* @__PURE__ */ newArray();
let key = /* @__PURE__ */ new Uint16Array(256);

function newArray() {
  return {
    source: undefined,
    shifted: false,
    text: "",
    length: 0,
    elements: new Uint32Array(64),
    // The level 4 weight of each element, with the "shifted" alternate
    fourth: new Uint16Array(64),
  };
}

/**
 * Compares two strings in the default Unicode collation order (UTS #10)
 * @param {string} a
 * @param {string} b
 * @param {CollationOptions} [options]
 * @returns {number} -1 if a sorts first, 1 if b does, 0 if they are equal
 */
export function compare(a, b, options = {}) {
  assertString(a);
  assertString(b);
  const { level, shifted } = resolveOptions(options);
  if (a === b) return 0;
  if (right.source === a || left.source === b) [left, right] = [right, left];
  collect(a, shifted, left);
  collect(b, shifted, right);

  const x = left.elements;
  const y = right.elements;
  const m = left.length;
  const n = right.length;
  let order = compareWeights(x, m, y, n, PRIMARY_SHIFT, PRIMARY_MASK);
  if (order === 0 && level > 1) {
    order = compareWeights(x, m, y, n, SECONDARY_SHIFT, SECONDARY_MASK);
  }
  if (order === 0 && level > 2) {
    order = compareWeights(x, m, y, n, 0, TERTIARY_MASK);
  }
  if (order === 0 && level > 3 && shifted) {
    order = compareWeights(left.fourth, m, right.fourth, n, 0, 0xffff);
  }
  if (order === 0 && level > 4) {
    order = compareCodePoints(left.text, right.text);
  }
  return order;
}

/**
 * Returns the sort key of a string: comparing two keys with < and > orders
 * them as compare() orders their strings
 * @param {string} text
 * @param {CollationOptions} [options]
 * @returns {string} Binary data, not text
 */
export function sortKey(text, options = {}) {
  assertString(text);
  const { level, shifted } = resolveOptions(options);
  collect(text, shifted, left);

  const { length, text: decomposed } = left;
  const size = (length + 1) * 4 + decomposed.length * 3;
  if (key.length < size) key = new Uint16Array(size * 2);
  let end = appendWeights(
    left.elements,
    length,
    PRIMARY_SHIFT,
    PRIMARY_MASK,
    0,
  );
  if (level > 1) {
    key[end++] = 0;
    end = appendWeights(
      left.elements,
      length,
      SECONDARY_SHIFT,
      SECONDARY_MASK,
      end,
    );
  }
  if (level > 2) {
    key[end++] = 0;
    end = appendWeights(left.elements, length, 0, TERTIARY_MASK, end);
  }
  if (level > 3 && shifted) {
    key[end++] = 0;
    end = appendWeights(left.fourth, length, 0, 0xffff, end);
  }
  if (level > 4) {
    key[end++] = 0;
    // One unit below U+FFFD and three from it on, to sort as code points do
    for (let i = 0; i < decomposed.length; ) {
      const codePoint = decomposed.codePointAt(i);
      i += codePoint > 0xffff ? 2 : 1;
      if (codePoint === MERGE_SEPARATOR) {
        key[end++] = 1;
      } else if (codePoint < 0xfffd) {
        key[end++] = codePoint + 2;
      } else {
        key[end++] = 0xffff;
        key[end++] = codePoint >>> 16;
        key[end++] = codePoint & 0xffff;
      }
    }
  }

  let result = "";
  for (let start = 0; start < end; start += MAX_ARGUMENTS) {
    result += String.fromCharCode.apply(
      null,
      key.subarray(start, Math.min(start + MAX_ARGUMENTS, end)),
    );
  }
  return result;
}

function resolveOptions({ alternate = "non-ignorable", strength }) {
  assertOption("alternate", alternate, ALTERNATES);
  const shifted = alternate === "shifted";
  strength ??= shifted ? "quaternary" : "tertiary";
  assertOption("strength", strength, STRENGTHS);
  return { level: STRENGTHS.indexOf(strength) + 1, shifted };
}

function load() {
  elements = new Uint32Array(PRIMARIES.length);
  for (let i = 0; i < elements.length; i++) {
    elements[i] =
      PRIMARIES[i] * (1 << PRIMARY_SHIFT) + LOWER_WEIGHTS[LOWER_INDEXES[i]];
  }

  direct = new Int32Array(DIRECT_LIMIT);
  others = new Map();
  contractions = new Map();
  let offset = 0;
  let index = 0;
  for (const codePoint of CODE_POINTS) {
    const count = COUNTS[index++];
    const entry = (offset << 6) | (count << 1);
    if (codePoint < DIRECT_LIMIT) direct[codePoint] = entry;
    else others.set(codePoint, entry);
    offset += count;
  }
  for (const contraction of CONTRACTIONS) {
    const count = COUNTS[index++];
    const [first, ...rest] = toCodePoints(contraction);
    if (first < DIRECT_LIMIT) direct[first] |= 1;
    else others.set(first, (others.get(first) ?? 0) | 1);
    let node = contractions.get(first);
    if (!node) contractions.set(first, (node = { entry: 0, next: new Map() }));
    for (const codePoint of rest) {
      let child = node.next.get(codePoint);
      if (!child) {
        node.next.set(codePoint, (child = { entry: 0, next: new Map() }));
      }
      node = child;
    }
    node.entry = (offset << 6) | (count << 1);
    offset += count;
  }
}

// UTS #10, section 7.2, with the variable weighting of section 4
function collect(text, shifted, array) {
  if (array.source === text && array.shifted === shifted) return;
  if (elements === undefined) load();
  let input = normalize(text, "NFD");
  array.source = text;
  array.shifted = shifted;
  array.text = input;
  let output = array.elements;
  let fourth = array.fourth;
  let length = 0;
  let afterVariable = false;

  for (let i = 0; i < input.length; ) {
    if (length + MAX_COUNT > output.length) {
      output = array.elements = grow(output, Uint32Array);
      fourth = array.fourth = grow(fourth, Uint16Array);
    }
    const codePoint = input.codePointAt(i);
    i += codePoint > 0xffff ? 2 : 1;
    let entry =
      codePoint < DIRECT_LIMIT
        ? direct[codePoint]
        : (others.get(codePoint) ?? 0);

    if (entry & 1) {
      // S2.1: the longest match, which may have prefixes that are no match
      let matched = contractions.get(codePoint);
      for (let node = matched, j = i; j < input.length; ) {
        const next = input.codePointAt(j);
        node = node.next.get(next);
        if (!node) break;
        j += next > 0xffff ? 2 : 1;
        if (node.entry) {
          matched = node;
          entry = node.entry;
          i = j;
        }
      }
      // S2.1.1 to S2.1.3: unblocked non-starters extend the match
      if (entry >>> 1) {
        let skippedClass = 0;
        for (let j = i; j < input.length && matched.next.size > 0; ) {
          const next = input.codePointAt(j);
          const size = next > 0xffff ? 2 : 1;
          const combiningClass = getCombiningClass(next);
          if (combiningClass === 0) break;
          const node =
            combiningClass > skippedClass ? matched.next.get(next) : undefined;
          if (node?.entry) {
            matched = node;
            entry = node.entry;
            input = input.slice(0, j) + input.slice(j + size);
          } else {
            skippedClass = combiningClass;
            j += size;
          }
        }
      }
    }

    const count = (entry >>> 1) & 31;
    if (count === 0) {
      // Section 10.1.3
      const kind = lookupRange(IMPLICIT_KINDS, codePoint);
      let lead;
      let trail;
      if (kind >= SINIFORM) {
        const [siniformLead, first] = SINIFORM_KINDS[kind - SINIFORM];
        lead = siniformLead;
        trail = codePoint - first;
      } else {
        lead =
          (kind === CORE_HAN ? 0xfb40 : kind === OTHER_HAN ? 0xfb80 : 0xfbc0) +
          (codePoint >>> 15);
        trail = codePoint & 0x7fff;
      }
      output[length] = lead * (1 << PRIMARY_SHIFT) + IMPLICIT_LOWER;
      fourth[length++] = 0xffff;
      output[length] = (trail | 0x8000) * (1 << PRIMARY_SHIFT);
      fourth[length++] = 0;
      afterVariable = false;
      continue;
    }

    const end = (entry >>> 6) + count;
    for (let offset = entry >>> 6; offset < end; offset++) {
      const element = elements[offset];
      if (!shifted) {
        if (element !== 0) output[length++] = element;
      } else if (element & VARIABLE) {
        output[length] = 0;
        fourth[length++] = element >>> PRIMARY_SHIFT;
        afterVariable = true;
      } else if (element >>> PRIMARY_SHIFT !== 0) {
        output[length] = element;
        fourth[length++] = 0xffff;
        afterVariable = false;
      } else if (element !== 0 && !afterVariable) {
        output[length] = element;
        fourth[length++] = 0xffff;
      }
    }
  }
  array.length = length;
}

function grow(array, TypedArray) {
  const larger = new TypedArray(array.length * 2);
  larger.set(array);
  return larger;
}

// Section 7.4, without forming the sort keys: zero weights are skipped
function compareWeights(x, m, y, n, shift, mask) {
  for (let i = 0, j = 0; ; ) {
    let a = 0;
    let b = 0;
    while (i < m && (a = (x[i++] >>> shift) & mask) === 0);
    while (j < n && (b = (y[j++] >>> shift) & mask) === 0);
    if (a !== b) return a < b ? -1 : 1;
    if (a === 0) return 0;
  }
}

function appendWeights(array, length, shift, mask, end) {
  for (let i = 0; i < length; i++) {
    const weight = (array[i] >>> shift) & mask;
    if (weight !== 0) key[end++] = weight;
  }
  return end;
}

function compareCodePoints(a, b) {
  if (a === b) return 0;
  for (let i = 0; i < a.length && i < b.length; ) {
    const x = a.codePointAt(i);
    const y = b.codePointAt(i);
    if (x !== y) {
      return x === MERGE_SEPARATOR || (x < y && y !== MERGE_SEPARATOR) ? -1 : 1;
    }
    i += x > 0xffff ? 2 : 1;
  }
  return a.length < b.length ? -1 : 1;
}

export default /* @__PURE__ */ Object.assign(compare, {
  compare,
  sortKey,
  VERSION,
});

/**
 * @typedef {object} CollationOptions
 * @property {"non-ignorable" | "shifted"} [alternate] "shifted" ignores spaces, punctuation and symbols up to the tertiary level; "non-ignorable" by default
 * @property {"primary" | "secondary" | "tertiary" | "quaternary" | "identical"} [strength] The last level compared; "tertiary" by default, "quaternary" with "shifted"
 */
