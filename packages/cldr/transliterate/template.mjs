import { assertString } from "@internal/helpers/assert";
import { inSet, lookupRange, toCodePoints } from "@internal/helpers/tables";
import { normalize } from "unicode-normalize";
import {
  ALIASES,
  ANY_LATIN_IDS,
  ARABIC_LATIN,
  ARMENIAN_LATIN,
  BENGALI_LATIN,
  BOPOMOFO_LATIN,
  CYRILLIC_LATIN,
  DEVANAGARI_LATIN,
  ETHIOPIC_LATIN,
  GEORGIAN_LATIN,
  GREEK_LATIN,
  GUJARATI_LATIN,
  GURMUKHI_LATIN,
  HAN_LATIN,
  HANGUL_LATIN,
  HANT_LATN,
  HEBREW_LATIN,
  HIRAGANA_LATIN,
  INTERINDIC_LATIN,
  KANNADA_LATIN,
  KATAKANA_LATIN,
  LATIN_ASCII,
  MALAYALAM_LATIN,
  MYANMAR_LATIN,
  ORIYA_LATIN,
  SCRIPT_RUNS,
  SYRIAC_LATIN,
  TAMIL_LATIN,
  TELUGU_LATIN,
  THAANA_LATIN,
  THAI_LATIN,
  VERSION,
} from "#generated";
import {
  ANCHOR_END,
  ANCHOR_START,
  ANCHORS,
  ANTE,
  CHILDREN,
  COMPOUND,
  CURSOR,
  FALLBACK,
  FILTER,
  FORM,
  FUNCTIONS,
  INDEX_FIRST_VALUE,
  INDEX_HOLE,
  KEY,
  NORMALIZE,
  OUTPUT,
  POST,
  QUANTIFIER,
  RULE_LIST,
  RULES,
  SEGMENT,
  SEGMENTS,
  SETS,
  SHARED_ID,
  TYPE,
  USE,
  VALUES,
} from "./format.mjs";

export { VERSION };

const END = -1;
// Sets match the end of the text if they contain U+FFFF ("[…$]")
const END_OF_TEXT = 0xffff;
const WORD_PART = /[\p{L}\p{M}]/u;
const WORD_BREAK_CONTEXT = 8;

let wordSegmenter;

const INTERINDIC = { "InterIndic-Latin": INTERINDIC_LATIN };
const bengali = /* @__PURE__ */ link(BENGALI_LATIN, INTERINDIC);
const devanagari = /* @__PURE__ */ link(DEVANAGARI_LATIN, INTERINDIC);
const gujarati = /* @__PURE__ */ link(GUJARATI_LATIN, INTERINDIC);
const gurmukhi = /* @__PURE__ */ link(GURMUKHI_LATIN, INTERINDIC);
const hant = /* @__PURE__ */ link(HANT_LATN, { "Han-Latin": HAN_LATIN });
const hiragana = /* @__PURE__ */ link(HIRAGANA_LATIN, {
  "Katakana-Latin": KATAKANA_LATIN,
});
const kannada = /* @__PURE__ */ link(KANNADA_LATIN, INTERINDIC);
const malayalam = /* @__PURE__ */ link(MALAYALAM_LATIN, INTERINDIC);
const oriya = /* @__PURE__ */ link(ORIYA_LATIN, INTERINDIC);
const tamil = /* @__PURE__ */ link(TAMIL_LATIN, INTERINDIC);
const telugu = /* @__PURE__ */ link(TELUGU_LATIN, INTERINDIC);

/** @type {Record<string, Array>} */
const TRANSFORMS = {
  "Arabic-Latin": ARABIC_LATIN,
  "Armenian-Latin": ARMENIAN_LATIN,
  "Bengali-Latin": bengali,
  "Bopomofo-Latin": BOPOMOFO_LATIN,
  "Cyrillic-Latin": CYRILLIC_LATIN,
  "Devanagari-Latin": devanagari,
  "Ethiopic-Latin": ETHIOPIC_LATIN,
  "Georgian-Latin": GEORGIAN_LATIN,
  "Greek-Latin": GREEK_LATIN,
  "Gujarati-Latin": gujarati,
  "Gurmukhi-Latin": gurmukhi,
  "Han-Latin": HAN_LATIN,
  "Hangul-Latin": HANGUL_LATIN,
  "Hant-Latn": hant,
  "Hebrew-Latin": HEBREW_LATIN,
  "Hiragana-Latin": hiragana,
  "Kannada-Latin": kannada,
  "Katakana-Latin": KATAKANA_LATIN,
  "Latin-ASCII": LATIN_ASCII,
  "Malayalam-Latin": malayalam,
  "Myanmar-Latin": MYANMAR_LATIN,
  "Oriya-Latin": oriya,
  "Syriac-Latin": SYRIAC_LATIN,
  "Tamil-Latin": tamil,
  "Telugu-Latin": telugu,
  "Thaana-Latin": THAANA_LATIN,
  "Thai-Latin": THAI_LATIN,
};
const ANY_LATIN = "Any-Latin";

/**
 * Transliterates text with a CLDR transform, as ICU does
 * @param {string} text
 * @param {string} id - Transform ID or alias, case-insensitive
 * @returns {string}
 */
export function transliterate(text, id) {
  assertString(id);
  const lower = id.toLowerCase();
  if (lower === "any-latin") return toLatin(text);
  const canonical = ALIASES.get(lower);
  if (canonical === undefined) {
    throw new RangeError(`Unsupported transform: ${id}`);
  }
  return run(TRANSFORMS[canonical], text);
}

/**
 * Romanizes every script CLDR has a transform for, leaving other text as is
 * @param {string} text
 * @param {{ ascii?: boolean }} [options] - `ascii` also removes accents
 * @returns {string}
 */
export function toLatin(text, { ascii = false } = {}) {
  assertString(text);
  const latin = fromCodePoints(anyLatin(toCodePoints(text)));
  return ascii ? run(LATIN_ASCII, latin) : latin;
}

/**
 * Lists the supported transform IDs
 * @returns {string[]}
 */
export function getTransformIds() {
  return [ANY_LATIN, ...new Set(ALIASES.values())].sort();
}

/**
 * @param {string} text
 * @returns {string}
 */
export function arabicToLatin(text) {
  return run(ARABIC_LATIN, text);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function armenianToLatin(text) {
  return run(ARMENIAN_LATIN, text);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function bengaliToLatin(text) {
  return run(bengali, text);
}

/**
 * To pinyin with tone numbers: "ㄋㄧˇ ㄏㄠˇ" → "ni3 hao3"
 * @param {string} text
 * @returns {string}
 */
export function bopomofoToLatin(text) {
  return run(BOPOMOFO_LATIN, text);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function cyrillicToLatin(text) {
  return run(CYRILLIC_LATIN, text);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function devanagariToLatin(text) {
  return run(devanagari, text);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function ethiopicToLatin(text) {
  return run(ETHIOPIC_LATIN, text);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function georgianToLatin(text) {
  return run(GEORGIAN_LATIN, text);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function greekToLatin(text) {
  return run(GREEK_LATIN, text);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function gujaratiToLatin(text) {
  return run(gujarati, text);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function gurmukhiToLatin(text) {
  return run(gurmukhi, text);
}

/**
 * To pinyin, with Simplified Chinese readings: "你好" → "nǐ hǎo"
 * @param {string} text
 * @returns {string}
 */
export function hanToLatin(text) {
  return run(HAN_LATIN, text);
}

/**
 * To pinyin, with Traditional Chinese readings: "沈" → "chén"
 * @param {string} text
 * @returns {string}
 */
export function hantToLatin(text) {
  return run(hant, text);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function hangulToLatin(text) {
  return run(HANGUL_LATIN, text);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function hebrewToLatin(text) {
  return run(HEBREW_LATIN, text);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function hiraganaToLatin(text) {
  return run(hiragana, text);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function kannadaToLatin(text) {
  return run(kannada, text);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function katakanaToLatin(text) {
  return run(KATAKANA_LATIN, text);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function latinToAscii(text) {
  return run(LATIN_ASCII, text);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function malayalamToLatin(text) {
  return run(malayalam, text);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function myanmarToLatin(text) {
  return run(MYANMAR_LATIN, text);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function oriyaToLatin(text) {
  return run(oriya, text);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function syriacToLatin(text) {
  return run(SYRIAC_LATIN, text);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function tamilToLatin(text) {
  return run(tamil, text);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function teluguToLatin(text) {
  return run(telugu, text);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function thaanaToLatin(text) {
  return run(THAANA_LATIN, text);
}

/**
 * ISO 11940, with spaces inserted between words
 * @param {string} text
 * @returns {string}
 */
export function thaiToLatin(text) {
  return run(THAI_LATIN, text);
}

function run(transform, text) {
  assertString(text);
  return fromCodePoints(apply(transform, toCodePoints(text), null));
}

function link(transform, shared) {
  if (transform[TYPE] === USE) {
    const target = shared[transform[SHARED_ID]];
    const filter = transform[FILTER];
    return filter === null
      ? target
      : [target[TYPE], filter, ...target.slice(2)];
  }
  if (transform[TYPE] === COMPOUND) {
    return [
      COMPOUND,
      transform[FILTER],
      transform[CHILDREN].map((child) => link(child, shared)),
    ];
  }
  return transform;
}

// Levels are { output, pending, outer }; pending is reversed (next code point last)

function apply(transform, input, outer) {
  const filter = transform[FILTER];
  if (filter === null) return applyUnfiltered(transform, input, outer);

  const level = { output: [], pending: input.reverse(), outer };
  const { output, pending } = level;
  while (pending.length > 0) {
    if (!inSet(filter, pending[pending.length - 1])) {
      output.push(pending.pop());
      continue;
    }
    const filtered = [];
    while (pending.length > 0 && inSet(filter, pending[pending.length - 1])) {
      filtered.push(pending.pop());
    }
    append(output, applyUnfiltered(transform, filtered, level));
  }
  return output;
}

function applyUnfiltered(transform, input, outer) {
  switch (transform[TYPE]) {
    case COMPOUND: {
      let text = input;
      for (const child of transform[CHILDREN]) {
        if (text.length === 0) break;
        text = apply(child, text, outer);
      }
      return text;
    }
    case RULES:
      return applyRules(transform, input, outer);
    case NORMALIZE:
      return toCodePoints(normalize(fromCodePoints(input), transform[FORM]));
    default:
      return breakWords(input, outer);
  }
}

function applyRules(transform, input, outer) {
  const rules = transform[RULE_LIST];
  // ICU limits the steps, in case rules loop (UTF-16 units × 16)
  let steps = 0;
  for (const codePoint of input) steps -= codePoint > 0xffff ? 32 : 16;

  const level = { output: [], pending: input.reverse(), outer };
  const { output, pending } = level;
  while (pending.length > 0 && steps++ <= 0) {
    const candidates = lookup(transform, pending[pending.length - 1]);
    if (typeof candidates === "string") {
      pending.pop();
      appendString(output, candidates);
      continue;
    }
    let matched = false;
    for (const rule of candidates) {
      if (applyRule(rules[rule], transform, level)) {
        matched = true;
        break;
      }
    }
    if (!matched) output.push(pending.pop());
  }
  while (pending.length > 0) output.push(pending.pop());
  return output;
}

function lookup(transform, codePoint) {
  const segments = transform[SEGMENTS];
  let low = 0;
  let high = segments.length / 2;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (segments[mid * 2] <= codePoint) low = mid + 1;
    else high = mid;
  }
  if (low > 0) {
    const table = segments[low * 2 - 1];
    const offset = codePoint - segments[low * 2 - 2];
    if (offset < table.length) {
      const entry = table.charCodeAt(offset);
      if (entry !== INDEX_HOLE) {
        return transform[VALUES][entry - INDEX_FIRST_VALUE];
      }
    }
  }
  return transform[FALLBACK];
}

function applyRule(rule, transform, level) {
  const sets = transform[SETS];
  const segments = [];
  const ante = rule[ANTE];
  const post = rule[POST];
  const anchors = rule[ANCHORS] ?? 0;

  let anteLength = 0;
  if (ante) {
    anteLength = matchPattern(ante, level, BEFORE, 0, sets, segments);
    if (anteLength < 0) return false;
  }
  if (anchors & ANCHOR_START && charBefore(level, anteLength) !== END) {
    return false;
  }
  const keyLength = matchPattern(
    rule[KEY],
    level,
    KEY_REGION,
    0,
    sets,
    segments,
  );
  if (keyLength < 0) return false;
  let end = keyLength;
  if (post) {
    end = matchPattern(post, level, AFTER, keyLength, sets, segments);
    if (end < 0) return false;
  }
  if (anchors & ANCHOR_END && charAfter(level, end) !== END) return false;

  level.pending.length -= keyLength;
  const output = rule[OUTPUT];
  const cursor = rule[CURSOR];
  if (typeof output === "string") {
    if (cursor === undefined) {
      appendString(level.output, output);
    } else {
      const codePoints = toCodePoints(output);
      append(level.output, codePoints.slice(0, cursor));
      revisit(level, codePoints.slice(cursor));
    }
  } else {
    const before = [];
    const after = [];
    output.forEach((part, i) => {
      append(
        i < (cursor ?? output.length) ? before : after,
        generate(part, segments, transform),
      );
    });
    append(level.output, before);
    revisit(level, after);
  }
  return true;
}

function revisit(level, codePoints) {
  for (let i = codePoints.length - 1; i >= 0; i--) {
    level.pending.push(codePoints[i]);
  }
}

function generate(part, segments, transform) {
  if (typeof part === "string") return toCodePoints(part);
  if (typeof part === "number") return segments[part] ?? [];
  const [functionIndex, parts] = part;
  const input = parts.flatMap((inner) => generate(inner, segments, transform));
  return apply(transform[FUNCTIONS][functionIndex], input, null);
}

const BEFORE = 0;
const KEY_REGION = 1;
const AFTER = 2;

function read(level, region, offset) {
  if (region === BEFORE) return charBefore(level, offset);
  const { pending } = level;
  if (offset < pending.length) return pending[pending.length - 1 - offset];
  return region === KEY_REGION
    ? END
    : charAfter(level.outer, offset - pending.length);
}

function charBefore(level, offset) {
  for (; level !== null; level = level.outer) {
    const { output } = level;
    if (offset < output.length) return output[output.length - 1 - offset];
    offset -= output.length;
  }
  return END;
}

function charAfter(level, offset) {
  for (; level !== null; level = level.outer) {
    const { pending } = level;
    if (offset < pending.length) return pending[pending.length - 1 - offset];
    offset -= pending.length;
  }
  return END;
}

function matchPattern(pattern, level, region, offset, sets, segments) {
  const backward = region === BEFORE;
  for (let i = 0; i < pattern.length && offset >= 0; i++) {
    const element = pattern[backward ? pattern.length - 1 - i : i];
    offset = matchElement(element, level, region, offset, sets, segments);
  }
  return offset;
}

function matchElement(element, level, region, offset, sets, segments) {
  if (typeof element === "number") {
    const codePoint = read(level, region, offset);
    if (element >= 0) return codePoint === element ? offset + 1 : -1;
    const set = sets[-1 - element];
    if (codePoint === END) return inSet(set, END_OF_TEXT) ? offset : -1;
    return inSet(set, codePoint) ? offset + 1 : -1;
  }
  switch (element[0]) {
    case QUANTIFIER: {
      const [, min, max, pattern] = element;
      let count = 0;
      while (count < max) {
        const next = matchPattern(
          pattern,
          level,
          region,
          offset,
          sets,
          segments,
        );
        if (next < 0) break;
        count++;
        // Stop at an empty match, which would repeat forever
        if (next === offset) break;
        offset = next;
      }
      return count >= min ? offset : -1;
    }
    case SEGMENT: {
      const [, number, pattern] = element;
      const end = matchPattern(pattern, level, region, offset, sets, segments);
      // Backward, the first match is the rightmost one, which ICU keeps
      if (end >= 0 && (region !== BEFORE || segments[number] === undefined)) {
        segments[number] = readRange(level, region, offset, end);
      }
      return end;
    }
    default: {
      const [, set, strings] = element;
      for (const string of strings) {
        const end = matchPattern(
          toCodePoints(string),
          level,
          region,
          offset,
          sets,
          segments,
        );
        if (end >= 0) return end;
      }
      return matchElement(set, level, region, offset, sets, segments);
    }
  }
}

function readRange(level, region, start, end) {
  const codePoints = [];
  for (let offset = start; offset < end; offset++) {
    codePoints.push(read(level, region, offset));
  }
  return region === BEFORE ? codePoints.reverse() : codePoints;
}

function breakWords(input, outer) {
  const before = [];
  for (let i = 0; i < WORD_BREAK_CONTEXT; i++) {
    const codePoint = charBefore(outer, i);
    if (codePoint === END) break;
    before.unshift(codePoint);
  }
  const after = [];
  for (let i = 0; i < WORD_BREAK_CONTEXT; i++) {
    const codePoint = charAfter(outer, i);
    if (codePoint === END) break;
    after.push(codePoint);
  }
  const prefix = fromCodePoints(before);
  const suffix = fromCodePoints(after);
  const text = prefix + fromCodePoints(input) + suffix;
  const start = prefix.length;
  const limit = text.length - suffix.length;

  wordSegmenter ??= new Intl.Segmenter("en", { granularity: "word" });
  const breaks = new Set();
  let previous = "";
  for (const { segment, index } of wordSegmenter.segment(text)) {
    const chars = [...segment];
    if (
      index >= start &&
      index < limit &&
      WORD_PART.test(previous) &&
      WORD_PART.test(chars[0])
    ) {
      breaks.add(index);
    }
    previous = chars[chars.length - 1];
  }

  const output = [];
  let position = start;
  for (const codePoint of input) {
    if (breaks.has(position)) output.push(0x20);
    output.push(codePoint);
    position += codePoint > 0xffff ? 2 : 1;
  }
  return output;
}

// Script values: 0 Common/Inherited, 1 no transform, else 2 + ANY_LATIN_IDS index
function anyLatin(input) {
  const level = { output: [], pending: input.reverse(), outer: null };
  const { output, pending } = level;
  while (pending.length > 0) {
    const run = [];
    while (
      output.length > 0 &&
      lookupRange(SCRIPT_RUNS, output[output.length - 1]) === 0
    ) {
      run.push(output.pop());
    }
    run.reverse();
    let script = 0;
    while (pending.length > 0) {
      const value = lookupRange(SCRIPT_RUNS, pending[pending.length - 1]);
      if (value !== 0 && script !== 0 && value !== script) break;
      if (value !== 0) script = value;
      run.push(pending.pop());
    }
    if (script < 2) {
      append(output, run);
    } else {
      const transform = TRANSFORMS[ANY_LATIN_IDS[script - 2]];
      append(output, apply(transform, run, level));
    }
  }
  return output;
}

function append(target, codePoints) {
  for (const codePoint of codePoints) target.push(codePoint);
}

function appendString(target, string) {
  for (const char of string) target.push(char.codePointAt(0));
}

function fromCodePoints(codePoints) {
  let string = "";
  // Avoid the engines' limits on the number of arguments
  for (let i = 0; i < codePoints.length; i += 4096) {
    string += String.fromCodePoint(...codePoints.slice(i, i + 4096));
  }
  return string;
}

export default {
  transliterate,
  toLatin,
  getTransformIds,
  VERSION,
};
