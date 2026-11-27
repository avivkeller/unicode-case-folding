import { assertString } from "@internal/helpers/assert";
import { normalizeLocale } from "@internal/helpers/locale";
import { lookupRange } from "@internal/helpers/tables";
import {
  GRAPHEME_BREAK,
  HANGUL_BASE,
  HANGUL_T_COUNT,
  SENTENCE_BREAK,
  SINGLE_GRAPHEMES_BELOW,
  SUPPRESSIONS,
  VERSION,
  WORD_BREAK,
} from "#generated";
import {
  G_CONSONANT,
  G_CONTROL,
  G_CR,
  G_EXTEND,
  G_EXTEND_INCB,
  G_L,
  G_LINKER,
  G_LV,
  G_LVT,
  G_OTHER_LINKER,
  G_PICTOGRAPHIC,
  G_PREPEND,
  G_RI,
  G_SPACING_MARK,
  G_T,
  G_V,
  G_ZWJ,
  S_ATERM,
  S_CLOSE,
  S_CR,
  S_FORMAT,
  S_LOWER,
  S_NUMERIC,
  S_OLETTER,
  S_OTHER,
  S_SCONTINUE,
  S_SEP,
  S_SP,
  S_UPPER,
  W_ALETTER,
  W_ALETTER_PICTOGRAPHIC,
  W_CR,
  W_DOUBLE_QUOTE,
  W_EXTEND,
  W_EXTEND_NUM_LET,
  W_HEBREW_LETTER,
  W_KATAKANA,
  W_MID_LETTER,
  W_MID_NUM,
  W_MID_NUM_LET,
  W_NEWLINE,
  W_NUMERIC,
  W_OTHER,
  W_OTHER_LETTER,
  W_PICTOGRAPHIC,
  W_RI,
  W_SINGLE_QUOTE,
  W_WSEG_SPACE,
  W_ZWJ,
} from "./classes.mjs";

export { VERSION };

// Planes 0 and 1 have nearly all the text; the rest is searched in the ranges
const DIRECT_LIMIT = 0x20000;
const GRAPHEME_DIRECT = /* @__PURE__ */ directTable(GRAPHEME_BREAK);
const WORD_DIRECT = /* @__PURE__ */ directTable(WORD_BREAK);
const SENTENCE_DIRECT = /* @__PURE__ */ directTable(SENTENCE_BREAK);

const CARRIAGE_RETURN = 0x0d;
const LINE_FEED = 0x0a;
const END = -1;
// Bits of the word classes that no rule from WB5 to WB16 joins to another
const UNJOINED =
  (1 << W_OTHER) |
  (1 << W_OTHER_LETTER) |
  (1 << W_PICTOGRAPHIC) |
  (1 << W_WSEG_SPACE);

/**
 * Finds the grapheme cluster boundaries of a text (UAX #29)
 * @param {string} text
 * @returns {number[]} UTF-16 offsets, ending with the length of the text
 */
export function findGraphemeBreaks(text) {
  assertString(text);
  const breaks = [];
  for (let i = 0; i < text.length; ) breaks.push((i = graphemeEnd(text, i)));
  return breaks;
}

/**
 * Finds the word boundaries of a text (UAX #29)
 * @param {string} text
 * @returns {number[]} UTF-16 offsets, ending with the length of the text
 */
export function findWordBreaks(text) {
  assertString(text);
  const breaks = [];
  for (let i = 0; i < text.length; ) breaks.push((i = wordEnd(text, i)));
  return breaks;
}

/**
 * Finds the sentence boundaries of a text (UAX #29)
 * @param {string} text
 * @param {SentenceOptions} [options]
 * @returns {number[]} UTF-16 offsets, ending with the length of the text
 */
export function findSentenceBreaks(text, options) {
  assertString(text);
  const breaks = [];
  for (let i = 0; i < text.length; ) breaks.push((i = sentenceEnd(text, i)));
  return options === undefined ? breaks : unsuppressed(text, breaks, options);
}

/**
 * Splits a text into its extended grapheme clusters
 * @param {string} text
 * @returns {string[]}
 */
export function splitGraphemes(text) {
  assertString(text);
  const segments = [];
  for (let start = 0; start < text.length; ) {
    const end = graphemeEnd(text, start);
    segments.push(segment(text, start, end));
    start = end;
  }
  return segments;
}

/**
 * Splits a text into words and the spaces and punctuation between them
 * @param {string} text
 * @returns {string[]}
 */
export function splitWords(text) {
  assertString(text);
  const segments = [];
  for (let start = 0; start < text.length; ) {
    const end = wordEnd(text, start);
    segments.push(segment(text, start, end));
    start = end;
  }
  return segments;
}

/**
 * Splits a text into sentences, each with the spaces after it
 * @param {string} text
 * @param {SentenceOptions} [options]
 * @returns {string[]}
 */
export function splitSentences(text, options) {
  assertString(text);
  const segments = [];
  if (options !== undefined) {
    let start = 0;
    for (const end of findSentenceBreaks(text, options)) {
      segments.push(text.slice(start, end));
      start = end;
    }
    return segments;
  }
  for (let start = 0; start < text.length; ) {
    const end = sentenceEnd(text, start);
    segments.push(text.slice(start, end));
    start = end;
  }
  return segments;
}

/**
 * Counts the extended grapheme clusters of a text
 * @param {string} text
 * @returns {number}
 */
export function countGraphemes(text) {
  assertString(text);
  let count = 0;
  for (let i = 0; i < text.length; count++) i = graphemeEnd(text, i);
  return count;
}

/**
 * Tells whether a word segment has a letter or a number, unlike spaces and
 * punctuation
 * @param {string} segment
 * @returns {boolean}
 */
export function isWordLike(segment) {
  assertString(segment);
  for (let i = 0; i < segment.length; ) {
    const codePoint = segment.codePointAt(i);
    if (wordClass(codePoint) <= W_OTHER_LETTER) return true;
    i += codePoint > 0xffff ? 2 : 1;
  }
  return false;
}

// Indexing is faster than slicing
function segment(text, start, end) {
  return end - start === 1 ? text[start] : text.slice(start, end);
}

// Small enough for the engine to inline it into the loops that call it
function graphemeEnd(text, start) {
  const first = text.charCodeAt(start);
  const next = start + 1;
  if (first < SINGLE_GRAPHEMES_BELOW) {
    if (next === text.length) return next;
    const second = text.charCodeAt(next);
    if (second < SINGLE_GRAPHEMES_BELOW) {
      // GB3
      return first === CARRIAGE_RETURN && second === LINE_FEED
        ? next + 1
        : next;
    }
  }
  return longGraphemeEnd(text, start);
}

function longGraphemeEnd(text, start) {
  const { length } = text;
  let codePoint = text.codePointAt(start);
  let i = start + (codePoint > 0xffff ? 2 : 1);
  let before = graphemeClass(codePoint);
  // GB3, GB4
  if (before >= G_CONTROL) {
    return before === G_CR && text.charCodeAt(i) === LINE_FEED ? i + 1 : i;
  }
  let regionalIndicators = before === G_RI ? 1 : 0;
  // InCB=Linker InCB=Extend* precedes (GB9c)
  let linked = before === G_LINKER || before === G_OTHER_LINKER;
  // 1 after Extended_Pictographic Extend*, 2 after the ZWJ that follows (GB11)
  let emoji = before === G_PICTOGRAPHIC ? 1 : 0;

  while (i < length) {
    codePoint = text.codePointAt(i);
    const after = graphemeClass(codePoint);
    // GB5
    if (after >= G_CONTROL) return i;
    // GB9, GB9a
    if (after < G_EXTEND_INCB || after > G_SPACING_MARK) {
      // GB9b
      if (before !== G_PREPEND) {
        if (after === G_CONSONANT) {
          // GB9c
          if (!linked) return i;
        } else if (after === G_PICTOGRAPHIC) {
          // GB11
          if (emoji !== 2) return i;
        } else if (after === G_RI) {
          // GB12, GB13
          if (regionalIndicators % 2 === 0) return i;
        } else if (!isHangulSequence(before, after)) {
          // GB999
          return i;
        }
      }
    }

    if (after === G_LINKER || after === G_OTHER_LINKER) linked = true;
    else if (after !== G_EXTEND_INCB && after !== G_ZWJ) linked = false;
    if (after === G_PICTOGRAPHIC) emoji = 1;
    else if (after === G_ZWJ && emoji === 1) emoji = 2;
    else if (emoji !== 1 || after < G_EXTEND_INCB || after > G_EXTEND)
      emoji = 0;
    regionalIndicators = after === G_RI ? regionalIndicators + 1 : 0;
    before = after;
    i += codePoint > 0xffff ? 2 : 1;
  }
  return length;
}

function graphemeClass(codePoint) {
  const value =
    codePoint < DIRECT_LIMIT
      ? GRAPHEME_DIRECT[codePoint]
      : lookupRange(GRAPHEME_BREAK, codePoint);
  // The table gives every Hangul syllable LVT; LV syllables have T index 0
  if (value === G_LVT && (codePoint - HANGUL_BASE) % HANGUL_T_COUNT === 0) {
    return G_LV;
  }
  return value;
}

// GB6, GB7, GB8
function isHangulSequence(before, after) {
  if (before === G_L) {
    return after === G_L || after === G_V || after === G_LV || after === G_LVT;
  }
  if (before === G_V || before === G_LV) return after === G_V || after === G_T;
  return (before === G_T || before === G_LVT) && after === G_T;
}

function wordEnd(text, start) {
  const { length } = text;
  let codePoint = text.codePointAt(start);
  let i = start + (codePoint > 0xffff ? 2 : 1);
  let before = wordClass(codePoint);
  // WB3, WB3a
  if (before >= W_NEWLINE) {
    return before === W_CR && text.charCodeAt(i) === LINE_FEED ? i + 1 : i;
  }
  let twoBefore = END;
  let followsJoiner = before === W_ZWJ;
  let hasIgnored = false;
  let regionalIndicators = before === W_RI ? 1 : 0;

  while (i < length) {
    // Shortcut for WB5; no surrogate code unit has the class of a letter
    if (before === W_ALETTER && WORD_DIRECT[text.charCodeAt(i)] === W_ALETTER) {
      twoBefore = W_ALETTER;
      followsJoiner = false;
      hasIgnored = false;
      i++;
      continue;
    }
    codePoint = text.codePointAt(i);
    const after = wordClass(codePoint);
    const next = i + (codePoint > 0xffff ? 2 : 1);
    // WB3b
    if (after >= W_NEWLINE) return i;
    // WB4
    if (after >= W_EXTEND) {
      followsJoiner = after === W_ZWJ;
      hasIgnored = true;
      i = next;
      continue;
    }
    if (
      // WB3c
      !(followsJoiner && isPictographic(after)) &&
      // WB3d
      !(before === W_WSEG_SPACE && after === W_WSEG_SPACE && !hasIgnored) &&
      !isWordJoined(text, next, twoBefore, before, after, regionalIndicators)
    ) {
      return i;
    }
    twoBefore = before;
    before = after;
    followsJoiner = false;
    hasIgnored = false;
    regionalIndicators = after === W_RI ? regionalIndicators + 1 : 0;
    i = next;
  }
  return length;
}

// WB5 to WB999, over classes without the characters that WB4 ignores
function isWordJoined(
  text,
  next,
  twoBefore,
  before,
  after,
  regionalIndicators,
) {
  if (((UNJOINED >> before) | (UNJOINED >> after)) & 1) return false;
  if (isAHLetter(before)) {
    // WB5, WB9
    if (isAHLetter(after) || after === W_NUMERIC) return true;
    // WB6
    if (isMidLetter(after) && isAHLetter(wordClassFrom(text, next))) {
      return true;
    }
    if (before === W_HEBREW_LETTER) {
      // WB7a
      if (after === W_SINGLE_QUOTE) return true;
      // WB7b
      if (
        after === W_DOUBLE_QUOTE &&
        wordClassFrom(text, next) === W_HEBREW_LETTER
      ) {
        return true;
      }
    }
  }
  if (isAHLetter(after)) {
    // WB7
    if (isMidLetter(before) && isAHLetter(twoBefore)) return true;
    // WB7c
    if (
      after === W_HEBREW_LETTER &&
      before === W_DOUBLE_QUOTE &&
      twoBefore === W_HEBREW_LETTER
    ) {
      return true;
    }
    // WB10
    if (before === W_NUMERIC) return true;
  }
  if (after === W_NUMERIC) {
    // WB8
    if (before === W_NUMERIC) return true;
    // WB11
    if (isMidNum(before) && twoBefore === W_NUMERIC) return true;
  }
  // WB12
  if (
    before === W_NUMERIC &&
    isMidNum(after) &&
    wordClassFrom(text, next) === W_NUMERIC
  ) {
    return true;
  }
  // WB13
  if (before === W_KATAKANA && after === W_KATAKANA) return true;
  // WB13a
  if (after === W_EXTEND_NUM_LET && takesExtender(before)) return true;
  // WB13b
  if (before === W_EXTEND_NUM_LET && takesExtender(after)) return true;
  // WB15, WB16
  return before === W_RI && after === W_RI && regionalIndicators % 2 === 1;
}

function wordClass(codePoint) {
  return codePoint < DIRECT_LIMIT
    ? WORD_DIRECT[codePoint]
    : lookupRange(WORD_BREAK, codePoint);
}

// The class of the first character from an offset that WB4 does not ignore
function wordClassFrom(text, i) {
  while (i < text.length) {
    const codePoint = text.codePointAt(i);
    const value = wordClass(codePoint);
    if (value < W_EXTEND || value > W_ZWJ) return value;
    i += codePoint > 0xffff ? 2 : 1;
  }
  return END;
}

function isAHLetter(value) {
  return value >= 0 && value <= W_HEBREW_LETTER;
}

function isMidLetter(value) {
  return value >= W_MID_LETTER && value <= W_SINGLE_QUOTE;
}

function isMidNum(value) {
  return value >= W_MID_NUM_LET && value <= W_MID_NUM;
}

function isPictographic(value) {
  return value === W_PICTOGRAPHIC || value === W_ALETTER_PICTOGRAPHIC;
}

function takesExtender(value) {
  return value <= W_EXTEND_NUM_LET && value !== W_OTHER_LETTER;
}

function sentenceEnd(text, start) {
  const { length } = text;
  let before = S_OTHER;
  let i = start;
  while (i < length) {
    const codePoint = text.codePointAt(i);
    const value = sentenceClass(codePoint);
    i += codePoint > 0xffff ? 2 : 1;
    if (value < S_ATERM) {
      // SB5
      if (value > S_FORMAT) before = value;
      continue;
    }
    // SB3, SB4
    if (value >= S_SEP) {
      return value === S_CR && text.charCodeAt(i) === LINE_FEED ? i + 1 : i;
    }

    i = skipIgnored(text, i);
    const wasLetter = before === S_UPPER || before === S_LOWER;
    before = value;
    if (value === S_ATERM) {
      const after = sentenceClassAt(text, i);
      // SB6, SB7
      if (after === S_NUMERIC || (after === S_UPPER && wasLetter)) continue;
    }

    const end = skipAll(text, skipAll(text, i, S_CLOSE), S_SP);
    const after = sentenceClassAt(text, end);
    if (
      // SB8
      (value === S_ATERM && continuesInLowercase(text, end)) ||
      // SB8a
      after === S_SCONTINUE ||
      after >= S_ATERM
    ) {
      // A ParaSep here ends the sentence in the next iteration (SB9, SB10)
      i = end;
      continue;
    }
    // SB9, SB10, SB11
    return end;
  }
  return length;
}

function sentenceClass(codePoint) {
  return codePoint < DIRECT_LIMIT
    ? SENTENCE_DIRECT[codePoint]
    : lookupRange(SENTENCE_BREAK, codePoint);
}

function sentenceClassAt(text, i) {
  return i < text.length ? sentenceClass(text.codePointAt(i)) : END;
}

// SB5
function skipIgnored(text, i) {
  while (i < text.length) {
    const codePoint = text.codePointAt(i);
    if (sentenceClass(codePoint) > S_FORMAT) break;
    i += codePoint > 0xffff ? 2 : 1;
  }
  return i;
}

function skipAll(text, i, skipped) {
  while (i < text.length) {
    const codePoint = text.codePointAt(i);
    if (sentenceClass(codePoint) !== skipped) break;
    i = skipIgnored(text, i + (codePoint > 0xffff ? 2 : 1));
  }
  return i;
}

// SB8: ( ¬(OLetter | Upper | Lower | ParaSep | SATerm) )* Lower
function continuesInLowercase(text, i) {
  while (i < text.length) {
    const codePoint = text.codePointAt(i);
    const value = sentenceClass(codePoint);
    if (value === S_LOWER) return true;
    if (value === S_OLETTER || value === S_UPPER || value >= S_ATERM) {
      return false;
    }
    i += codePoint > 0xffff ? 2 : 1;
  }
  return false;
}

function directTable([starts, values]) {
  const table = new Uint8Array(DIRECT_LIMIT);
  for (let i = 0; starts[i] < DIRECT_LIMIT; i++) {
    table.fill(values[i], starts[i], starts[i + 1]);
  }
  return table;
}

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
const LEADING_PUNCTUATION = /^[^\p{L}\p{N}]+/u;
const suppressionTables = new Map();

function unsuppressed(text, breaks, { locale }) {
  if (locale === undefined) return breaks;
  const table = suppressionTable(normalizeLocale(locale).split("-")[0]);
  return table === undefined
    ? breaks
    : breaks.filter(
        (end) => end === text.length || !isSuppressed(text, end, table),
      );
}

function isSuppressed(text, end, table) {
  let stop = end;
  while (stop > 0 && isBlank(text.charCodeAt(stop - 1))) stop--;
  let start = stop;
  while (start > 0 && !isWhitespace(text.charCodeAt(start - 1))) start--;
  const word = text.slice(start, stop).replace(LEADING_PUNCTUATION, "");
  const candidates = table.get(word);
  if (candidates === undefined) return false;
  for (let i = 0; i < candidates.length; i += 2) {
    const before = candidates[i];
    const from = stop - before.length;
    if (
      text.startsWith(candidates[i + 1], stop) &&
      (before === word ||
        (text.startsWith(before, from) &&
          (from === 0 || !LETTER_OR_DIGIT.test(text[from - 1]))))
    ) {
      return true;
    }
  }
  return false;
}

// Last word before a break → [the abbreviation up to it, the rest of it, …]:
// "n. Chr." is ["n.", " Chr."] under "n." and ["n. Chr.", ""] under "Chr."
function suppressionTable(language) {
  if (!suppressionTables.has(language)) {
    let table;
    if (Object.hasOwn(SUPPRESSIONS, language)) {
      table = new Map();
      for (const suppression of SUPPRESSIONS[language]) {
        for (
          let space = suppression.indexOf(" ");
          ;
          space = suppression.indexOf(" ", space + 1)
        ) {
          const before =
            space === -1 ? suppression : suppression.slice(0, space);
          const word = before.slice(before.lastIndexOf(" ") + 1);
          if (!table.has(word)) table.set(word, []);
          table.get(word).push(before, suppression.slice(before.length));
          if (space === -1) break;
        }
      }
    }
    suppressionTables.set(language, table);
  }
  return suppressionTables.get(language);
}

function isBlank(unit) {
  return (
    unit === 0x20 ||
    unit === 0x09 ||
    unit === 0xa0 ||
    unit === 0x202f ||
    unit === 0x3000 ||
    (unit >= 0x2000 && unit <= 0x200a)
  );
}

function isWhitespace(unit) {
  return (
    isBlank(unit) ||
    (unit >= 0x0a && unit <= 0x0d) ||
    unit === 0x85 ||
    unit === 0x2028 ||
    unit === 0x2029
  );
}

export default /* @__PURE__ */ Object.assign(splitGraphemes, {
  findGraphemeBreaks,
  findWordBreaks,
  findSentenceBreaks,
  splitGraphemes,
  splitWords,
  splitSentences,
  countGraphemes,
  isWordLike,
  VERSION,
});

/**
 * @typedef {object} SentenceOptions
 * @property {string | Intl.Locale} [locale] Keeps a sentence going after the
 *   abbreviations of the locale's language, such as "Mr." in English
 */
