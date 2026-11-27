import { assertString } from "@internal/helpers/assert";
import { directLookup, inSet } from "@internal/helpers/tables";
import {
  EAST_ASIAN,
  FINAL_QUOTATION_MARKS,
  HANGUL_BASE,
  HANGUL_T_COUNT,
  INITIAL_QUOTATION_MARKS,
  LINE_BREAK,
  UNASSIGNED_PICTOGRAPHIC,
  VERSION,
} from "#generated";
import {
  AK,
  AL,
  AP,
  AS,
  B2,
  BA,
  BB,
  BK,
  CB,
  CL,
  CM,
  CP,
  CR,
  EB,
  EM,
  EX,
  GL,
  H2,
  H3,
  HH,
  HL,
  HY,
  ID,
  IN,
  IS,
  JL,
  JT,
  JV,
  LF,
  NL,
  NS,
  NU,
  OP,
  PO,
  PR,
  QU,
  RI,
  SP,
  SY,
  VF,
  VI,
  WJ,
  ZW,
  ZWJ,
} from "./classes.mjs";

export { VERSION };

const tableClass = /* @__PURE__ */ directLookup(LINE_BREAK);

const LATIN_CAPITAL_LETTER_A = 0x41;
const DOTTED_CIRCLE = 0x25cc;

const BEFORE_INITIAL_QUOTE = new Set([BK, CR, LF, NL, OP, QU, GL, SP, ZW]);
// prettier-ignore
const AFTER_FINAL_QUOTE = new Set([
  SP, GL, WJ, CL, QU, CP, EX, IS, SY, BK, CR, LF, NL, ZW,
]);
const BEFORE_INITIAL_HYPHEN = new Set([BK, CR, LF, NL, SP, ZW, CB, GL]);

/**
 * Finds the line break opportunities in a text (UAX #14)
 * @param {string} text
 * @returns {LineBreak[]}
 */
export function findLineBreaks(text) {
  assertString(text);
  const units = toUnits(text);
  const { classes, offsets } = units;
  const breaks = [];
  let regionalIndicators = 0;
  for (let i = 1; i < classes.length; i++) {
    regionalIndicators = classes[i - 1] === RI ? regionalIndicators + 1 : 0;
    if (isMandatoryBreak(classes[i - 1], classes[i])) {
      breaks.push({ index: offsets[i], required: true });
    } else if (isBreakAllowed(units, i, regionalIndicators)) {
      breaks.push({ index: offsets[i], required: false });
    }
  }
  if (text.length > 0) breaks.push({ index: text.length, required: true });
  return breaks;
}

/**
 * Splits a text at its line break opportunities
 * @param {string} text
 * @returns {string[]}
 */
export function splitAtLineBreaks(text) {
  const segments = [];
  let start = 0;
  for (const { index } of findLineBreaks(text)) {
    segments.push(text.slice(start, index));
    start = index;
  }
  return segments;
}

// A unit is a character with the CM and ZWJ after it (LB9)
function toUnits(text) {
  const classes = [];
  const codePoints = [];
  const offsets = [];
  const endsWithJoiner = [];
  for (let offset = 0; offset < text.length; ) {
    const codePoint = text.codePointAt(offset);
    const lineBreak = lineBreakClass(codePoint);
    const isMark = lineBreak === CM || lineBreak === ZWJ;
    const last = classes.length - 1;
    if (isMark && last >= 0 && takesMarks(classes[last])) {
      endsWithJoiner[last] = lineBreak === ZWJ;
    } else {
      // LB10
      classes.push(isMark ? AL : lineBreak);
      codePoints.push(isMark ? LATIN_CAPITAL_LETTER_A : codePoint);
      offsets.push(offset);
      endsWithJoiner.push(lineBreak === ZWJ);
    }
    offset += codePoint > 0xffff ? 2 : 1;
  }
  return { classes, codePoints, offsets, endsWithJoiner };
}

function lineBreakClass(codePoint) {
  const lineBreak = tableClass(codePoint);
  // The table gives every Hangul syllable H3; LV syllables have T index 0
  if (lineBreak === H3 && (codePoint - HANGUL_BASE) % HANGUL_T_COUNT === 0) {
    return H2;
  }
  return lineBreak;
}

// LB4, LB5
function isMandatoryBreak(before, after) {
  if (before === CR) return after !== LF;
  return before === BK || before === LF || before === NL;
}

function isBreakAllowed(units, i, regionalIndicators) {
  const { classes, codePoints, endsWithJoiner } = units;
  const before = classes[i - 1];
  const after = classes[i];
  const next = classes[i + 1];

  // LB6
  if (after === BK || after === CR || after === LF || after === NL) {
    return false;
  }
  // LB7
  if (after === SP || after === ZW) return false;

  let beforeSpaces = i - 1;
  while (beforeSpaces >= 0 && classes[beforeSpaces] === SP) beforeSpaces--;
  const classBeforeSpaces = classes[beforeSpaces];

  // LB8
  if (classBeforeSpaces === ZW) return true;
  // LB8a
  if (endsWithJoiner[i - 1]) return false;

  // Shortcuts for the most common pairs, to which no rule in between applies
  // LB28
  if (isAlphabetic(before) && isAlphabetic(after)) return false;
  // LB31
  if (before === ID && after === ID) return true;

  // LB11
  if (after === WJ || before === WJ) return false;
  // LB12
  if (before === GL) return false;
  // LB12a
  if (after === GL && before !== SP && before !== HY && before !== HH) {
    return false;
  }
  // LB13
  if (after === CL || after === CP || after === EX || after === SY) {
    return false;
  }
  // LB14
  if (classBeforeSpaces === OP) return false;
  // LB15a
  if (
    classBeforeSpaces === QU &&
    INITIAL_QUOTATION_MARKS.has(codePoints[beforeSpaces]) &&
    (beforeSpaces === 0 || BEFORE_INITIAL_QUOTE.has(classes[beforeSpaces - 1]))
  ) {
    return false;
  }
  // LB15b
  if (
    after === QU &&
    FINAL_QUOTATION_MARKS.has(codePoints[i]) &&
    (next === undefined || AFTER_FINAL_QUOTE.has(next))
  ) {
    return false;
  }
  // LB15c
  if (before === SP && after === IS && next === NU) return true;
  // LB15d
  if (after === IS) return false;
  // LB16
  if (after === NS && (classBeforeSpaces === CL || classBeforeSpaces === CP)) {
    return false;
  }
  // LB17
  if (after === B2 && classBeforeSpaces === B2) return false;
  // LB18
  if (before === SP) return true;

  // LB19
  if (after === QU && !INITIAL_QUOTATION_MARKS.has(codePoints[i])) {
    return false;
  }
  if (before === QU && !FINAL_QUOTATION_MARKS.has(codePoints[i - 1])) {
    return false;
  }
  // LB19a
  if (
    after === QU &&
    (!isEastAsian(codePoints[i - 1]) ||
      next === undefined ||
      !isEastAsian(codePoints[i + 1]))
  ) {
    return false;
  }
  if (
    before === QU &&
    (!isEastAsian(codePoints[i]) || i === 1 || !isEastAsian(codePoints[i - 2]))
  ) {
    return false;
  }
  // LB20
  if (after === CB || before === CB) return true;
  // LB20a
  if (
    (before === HY || before === HH) &&
    isAlphabetic(after) &&
    (i === 1 || BEFORE_INITIAL_HYPHEN.has(classes[i - 2]))
  ) {
    return false;
  }
  // LB21
  if (
    after === BA ||
    after === HH ||
    after === HY ||
    after === NS ||
    before === BB
  ) {
    return false;
  }
  // LB21a
  if (
    (before === HY || before === HH) &&
    classes[i - 2] === HL &&
    after !== HL
  ) {
    return false;
  }
  // LB21b
  if (before === SY && after === HL) return false;
  // LB22
  if (after === IN) return false;

  // LB23
  if (isAlphabetic(before) && after === NU) return false;
  if (before === NU && isAlphabetic(after)) return false;
  // LB23a
  if (before === PR && isIdeographic(after)) return false;
  if (isIdeographic(before) && after === PO) return false;
  // LB24
  if ((before === PR || before === PO) && isAlphabetic(after)) return false;
  if (isAlphabetic(before) && (after === PR || after === PO)) return false;
  // LB25
  if (
    (after === PO || after === PR) &&
    (endsNumber(classes, i - 1) ||
      ((before === CL || before === CP) && endsNumber(classes, i - 2)))
  ) {
    return false;
  }
  if (
    (before === PO || before === PR) &&
    (after === NU ||
      (after === OP && (next === NU || (next === IS && classes[i + 2] === NU))))
  ) {
    return false;
  }
  if (
    after === NU &&
    (before === HY || before === IS || endsNumber(classes, i - 1))
  ) {
    return false;
  }

  // LB26
  if (
    before === JL &&
    (after === JL || after === JV || after === H2 || after === H3)
  ) {
    return false;
  }
  if ((before === JV || before === H2) && (after === JV || after === JT)) {
    return false;
  }
  if ((before === JT || before === H3) && after === JT) return false;
  // LB27
  if (isKorean(before) && after === PO) return false;
  if (before === PR && isKorean(after)) return false;

  // LB28a
  if (before === AP && isAksara(units, i)) return false;
  if (isAksara(units, i - 1) && (after === VF || after === VI)) return false;
  if (
    before === VI &&
    isAksara(units, i - 2) &&
    (after === AK || codePoints[i] === DOTTED_CIRCLE)
  ) {
    return false;
  }
  if (isAksara(units, i - 1) && isAksara(units, i) && next === VF) {
    return false;
  }
  // LB29
  if (before === IS && isAlphabetic(after)) return false;
  // LB30
  if (
    (isAlphabetic(before) || before === NU) &&
    after === OP &&
    !isEastAsian(codePoints[i])
  ) {
    return false;
  }
  if (
    before === CP &&
    !isEastAsian(codePoints[i - 1]) &&
    (isAlphabetic(after) || after === NU)
  ) {
    return false;
  }
  // LB30a
  if (before === RI && after === RI && regionalIndicators % 2 === 1) {
    return false;
  }
  // LB30b
  if (
    after === EM &&
    (before === EB || inSet(UNASSIGNED_PICTOGRAPHIC, codePoints[i - 1]))
  ) {
    return false;
  }
  // LB31
  return true;
}

function takesMarks(lineBreak) {
  return (
    lineBreak !== BK &&
    lineBreak !== CR &&
    lineBreak !== LF &&
    lineBreak !== NL &&
    lineBreak !== SP &&
    lineBreak !== ZW
  );
}

function isAlphabetic(lineBreak) {
  return lineBreak === AL || lineBreak === HL;
}

function isIdeographic(lineBreak) {
  return lineBreak === ID || lineBreak === EB || lineBreak === EM;
}

function isKorean(lineBreak) {
  return (
    lineBreak === JL ||
    lineBreak === JV ||
    lineBreak === JT ||
    lineBreak === H2 ||
    lineBreak === H3
  );
}

function isAksara({ classes, codePoints }, i) {
  return (
    classes[i] === AK || classes[i] === AS || codePoints[i] === DOTTED_CIRCLE
  );
}

function endsNumber(classes, i) {
  while (classes[i] === SY || classes[i] === IS) i--;
  return classes[i] === NU;
}

function isEastAsian(codePoint) {
  return inSet(EAST_ASIAN, codePoint);
}

export default { findLineBreaks, splitAtLineBreaks, VERSION };

/**
 * @typedef {object} LineBreak
 * @property {number} index UTF-16 offset
 * @property {boolean} required
 */
