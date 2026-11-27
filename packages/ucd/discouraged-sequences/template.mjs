import { assertOption, assertString } from "@internal/helpers/assert";
import { SEQUENCES, TYPES, VERSION } from "#generated";

export { VERSION };

const SEQUENCE = 0;
const REPLACEMENT = 1;
const TYPE = 2;

const ASCII = /^[\0-\x7f]*$/;

// First UTF-16 code unit → its sequences, longest first
let byFirstUnit;

/**
 * Replaces the sequences that Unicode says not to emit with their preferred form
 * @param {string} text
 * @param {DiscouragedOptions} [options]
 * @returns {string}
 */
export function replaceDiscouragedSequences(text, options = {}) {
  assertString(text);
  const types = resolveTypes(options);
  if (ASCII.test(text)) return text;
  let result = "";
  let copied = 0;
  for (let i = 0; i < text.length; i++) {
    const entry = matchAt(text, i, types);
    if (entry === undefined) continue;
    result += text.slice(copied, i) + entry[REPLACEMENT];
    i += entry[SEQUENCE].length - 1;
    copied = i + 1;
  }
  return copied === 0 ? text : result + text.slice(copied);
}

/**
 * Finds the sequences of a text that Unicode says not to emit
 * @param {string} text
 * @param {DiscouragedOptions} [options]
 * @returns {DiscouragedMatch[]} In text order, without overlaps
 */
export function findDiscouragedSequences(text, options = {}) {
  assertString(text);
  const types = resolveTypes(options);
  const matches = [];
  if (ASCII.test(text)) return matches;
  for (let i = 0; i < text.length; i++) {
    const entry = matchAt(text, i, types);
    if (entry === undefined) continue;
    matches.push({ index: i, ...toObject(entry) });
    i += entry[SEQUENCE].length - 1;
  }
  return matches;
}

/**
 * Returns every sequence that Unicode says not to emit
 * @returns {DiscouragedSequence[]}
 */
export function getDiscouragedSequences() {
  return SEQUENCES.map(toObject);
}

/**
 * Returns the types of discouraged sequences, e.g. "Deprecated"
 * @returns {string[]}
 */
export function getDiscouragedTypes() {
  return [...TYPES];
}

function resolveTypes({ types }) {
  if (types === undefined) return undefined;
  if (!Array.isArray(types)) throw new TypeError("types must be an array");
  let mask = 0;
  for (const type of types) {
    assertOption("type", type, TYPES);
    mask |= 1 << TYPES.indexOf(type);
  }
  return mask;
}

function matchAt(text, index, types) {
  if (byFirstUnit === undefined) {
    byFirstUnit = new Map();
    const longestFirst = [...SEQUENCES].sort(
      (a, b) => b[SEQUENCE].length - a[SEQUENCE].length,
    );
    for (const entry of longestFirst) {
      const unit = entry[SEQUENCE].charCodeAt(0);
      if (!byFirstUnit.has(unit)) byFirstUnit.set(unit, []);
      byFirstUnit.get(unit).push(entry);
    }
  }
  const entries = byFirstUnit.get(text.charCodeAt(index));
  if (entries === undefined) return undefined;
  for (const entry of entries) {
    if (
      (types === undefined || types & (1 << entry[TYPE])) &&
      text.startsWith(entry[SEQUENCE], index)
    ) {
      return entry;
    }
  }
  return undefined;
}

function toObject(entry) {
  return {
    sequence: entry[SEQUENCE],
    replacement: entry[REPLACEMENT],
    type: TYPES[entry[TYPE]],
  };
}

export default /* @__PURE__ */ Object.assign(replaceDiscouragedSequences, {
  replaceDiscouragedSequences,
  findDiscouragedSequences,
  getDiscouragedSequences,
  getDiscouragedTypes,
  VERSION,
});

/**
 * @typedef {object} DiscouragedOptions
 * @property {string[]} [types] Only these types, e.g. ["Deprecated"]; every type by default
 */

/**
 * @typedef {object} DiscouragedSequence
 * @property {string} sequence
 * @property {string} replacement The preferred form
 * @property {string} type e.g. "Deprecated", "Indic_Vowel_Letter"
 */

/**
 * @typedef {DiscouragedSequence & { index: number }} DiscouragedMatch
 */
