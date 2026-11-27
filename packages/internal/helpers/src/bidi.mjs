// Rule names (P2, X5a, N0, …) are those of UAX #9
import { directLookup, findRun, inSet } from "./tables.mjs";

/** Most frequent first, so most class table values are one digit */
export const BIDI_CLASS_NAMES = [
  "L",
  "NSM",
  "ON",
  "R",
  "AL",
  "BN",
  "ET",
  "EN",
  "CS",
  "ES",
  "AN",
  "WS",
  "B",
  "S",
  "LRE",
  "RLE",
  "LRO",
  "RLO",
  "PDF",
  "LRI",
  "RLI",
  "FSI",
  "PDI",
];

const {
  L,
  R,
  AL,
  EN,
  ES,
  ET,
  AN,
  CS,
  NSM,
  BN,
  B,
  S,
  WS,
  ON,
  LRE,
  RLE,
  LRO,
  RLO,
  PDF,
  LRI,
  RLI,
  FSI,
  PDI,
} = Object.fromEntries(BIDI_CLASS_NAMES.map((name, index) => [name, index]));

const ISOLATE_INITIATORS = classSet(LRI, RLI, FSI);
const ISOLATE_CONTROLS = classSet(LRI, RLI, FSI, PDI);
const REMOVED_BY_X9 = classSet(LRE, RLE, LRO, RLO, PDF, BN);
const NEUTRALS_AND_ISOLATES = classSet(B, S, WS, ON, LRI, RLI, FSI, PDI);
const SEPARATORS = classSet(B, S);
// L1
const TRAILING_WHITESPACE = classSet(
  WS,
  LRI,
  RLI,
  FSI,
  PDI,
  LRE,
  RLE,
  LRO,
  RLO,
  PDF,
  BN,
);
const RIGHT_TO_LEFT_OR_EXPLICIT = classSet(
  R,
  AL,
  AN,
  LRE,
  RLE,
  LRO,
  RLO,
  PDF,
  LRI,
  RLI,
  FSI,
  PDI,
);

const MAX_DEPTH = 125;
const BRACKET_STACK_SIZE = 63;
// X9
const NO_LEVEL = 0xff;
const CARRIAGE_RETURN = 0x0d;
const LINE_FEED = 0x0a;

/** @param {BidiData} data */
export function bidiClass(data, codePoint) {
  data.classOf ??= directLookup(data.classes);
  return data.classOf(codePoint);
}

export function mirroringGlyph(data, codePoint) {
  const [codePoints, glyphs] = data.mirroring;
  const index = findRun(codePoints, codePoint);
  // codePoints[-1] is undefined too, but much slower to read
  return index >= 0 && codePoints[index] === codePoint
    ? glyphs[index]
    : undefined;
}

export function isMirrored(data, codePoint) {
  return (
    mirroringGlyph(data, codePoint) !== undefined ||
    inSet(data.mirrored, codePoint)
  );
}

export function hasRightToLeftOrExplicit(data, text) {
  for (const char of text) {
    const type = bidiClass(data, char.codePointAt(0));
    if (inClassSet(RIGHT_TO_LEFT_OR_EXPLICIT, type)) return true;
  }
  return false;
}

export function isRemovedByX9(type) {
  return inClassSet(REMOVED_BY_X9, type);
}

/**
 * @param {BidiData} data
 * @returns {ResolvedText}
 */
export function resolveLevels(data, text, direction) {
  const state = analyze(data, text);
  const paragraphs = [];
  for (let start = 0; start < state.length; ) {
    const end = paragraphEnd(state, start);
    const level = resolveParagraph(data, state, start, end, direction);
    paragraphs.push([start, end, level]);
    start = end;
  }
  return {
    length: state.length,
    codePoints: state.codePoints,
    offsets: state.offsets,
    classes: state.originalTypes,
    levels: state.levels,
    paragraphs,
  };
}

/** L1 */
export function lineLevels(data, text, levels, start, end, paragraphLevel) {
  let trailingStart = end;
  while (trailingStart > start) {
    let charStart = trailingStart - 1;
    if (charStart > start && text.codePointAt(charStart - 1) > 0xffff) {
      charStart--;
    }
    const type = bidiClass(data, text.codePointAt(charStart));
    if (!inClassSet(TRAILING_WHITESPACE, type)) break;
    trailingStart = charStart;
  }
  const line = levels.slice(start, end);
  line.fill(paragraphLevel, trailingStart - start);
  return line;
}

/** L2 */
export function visualRuns(levels) {
  const runs = [];
  let highest = 0;
  let lowestOdd = Infinity;
  for (let start = 0; start < levels.length; ) {
    const level = levels[start];
    let end = start + 1;
    while (end < levels.length && levels[end] === level) end++;
    runs.push([start, end, level]);
    highest = Math.max(highest, level);
    if (level % 2 === 1) lowestOdd = Math.min(lowestOdd, level);
    start = end;
  }

  for (let level = highest; level >= lowestOdd; level--) {
    for (let first = 0; first < runs.length; first++) {
      if (runs[first][2] < level) continue;
      let last = first;
      while (last + 1 < runs.length && runs[last + 1][2] >= level) last++;
      for (let i = first, j = last; i < j; i++, j--) {
        [runs[i], runs[j]] = [runs[j], runs[i]];
      }
      first = last + 1;
    }
  }
  return runs;
}

function analyze(data, text) {
  const codePoints = new Int32Array(text.length);
  const offsets = new Int32Array(text.length + 1);
  const originalTypes = new Uint8Array(text.length);
  let length = 0;
  for (let offset = 0; offset < text.length; length++) {
    const codePoint = text.codePointAt(offset);
    codePoints[length] = codePoint;
    offsets[length] = offset;
    originalTypes[length] = bidiClass(data, codePoint);
    offset += codePoint > 0xffff ? 2 : 1;
  }
  offsets[length] = text.length;

  return {
    length,
    codePoints,
    offsets,
    originalTypes,
    // X1–X8
    types: originalTypes.slice(),
    levels: new Uint8Array(text.length),
    // BD9
    matchingPdi: new Int32Array(length).fill(-1),
    pdiMatched: new Uint8Array(length),
  };
}

/** P1 */
function paragraphEnd(state, start) {
  for (let i = start; i < state.length; i++) {
    if (state.originalTypes[i] !== B) continue;
    const isCrLf =
      state.codePoints[i] === CARRIAGE_RETURN &&
      state.codePoints[i + 1] === LINE_FEED;
    return isCrLf ? i + 2 : i + 1;
  }
  return state.length;
}

function resolveParagraph(data, state, start, end, direction) {
  matchIsolates(state, start, end);
  // P2–P3, or HL1
  let paragraphLevel;
  if (direction === "auto") {
    paragraphLevel = firstStrongLevel(state, start, end) ?? 0;
  } else {
    paragraphLevel = direction === "rtl" ? 1 : 0;
  }

  // Section 5.1
  if (
    paragraphLevel === 0 &&
    !paragraphHasRightToLeftOrExplicit(state, start, end)
  ) {
    return paragraphLevel;
  }

  resolveExplicitLevels(state, start, end, paragraphLevel);
  // Find all sequences first: I1–I2 change the levels sos and eos depend on
  const sequences = isolatingRunSequences(state, start, end, paragraphLevel);
  for (const [indices, types, level, sos, eos] of sequences) {
    resolveWeakTypes(types, sos);
    resolveBracketPairs(data, state, indices, types, level, sos);
    resolveNeutralTypes(types, level, sos, eos);
    resolveImplicitLevels(state.levels, indices, types, level);
  }
  resetWhitespaceLevels(state, start, end, paragraphLevel);
  assignRemovedLevels(state, start, end, paragraphLevel);
  return paragraphLevel;
}

/** BD9 */
function matchIsolates(state, start, end) {
  const openInitiators = [];
  for (let i = start; i < end; i++) {
    const type = state.originalTypes[i];
    if (inClassSet(ISOLATE_INITIATORS, type)) {
      openInitiators.push(i);
    } else if (type === PDI && openInitiators.length > 0) {
      state.matchingPdi[openInitiators.pop()] = i;
      state.pdiMatched[i] = 1;
    }
  }
}

/** P2–P3 */
function firstStrongLevel(state, start, end) {
  for (let i = start; i < end; i++) {
    const type = state.originalTypes[i];
    if (type === L) return 0;
    if (type === R || type === AL) return 1;
    if (inClassSet(ISOLATE_INITIATORS, type)) {
      if (state.matchingPdi[i] === -1) return undefined;
      i = state.matchingPdi[i];
    }
  }
  return undefined;
}

function paragraphHasRightToLeftOrExplicit(state, start, end) {
  for (let i = start; i < end; i++) {
    if (inClassSet(RIGHT_TO_LEFT_OR_EXPLICIT, state.originalTypes[i])) {
      return true;
    }
  }
  return false;
}

/** X1–X8 */
function resolveExplicitLevels(state, start, end, paragraphLevel) {
  const { originalTypes, types, levels, matchingPdi } = state;
  // The top of the status stack; `stack` holds [level, override, isolate]
  let level = paragraphLevel;
  let override;
  let isolate = false;
  const stack = [];
  let overflowIsolates = 0;
  let overflowEmbeddings = 0;
  let validIsolates = 0;

  for (let i = start; i < end; i++) {
    const type = originalTypes[i];
    switch (type) {
      case RLE:
      case LRE:
      case RLO:
      case LRO: {
        levels[i] = NO_LEVEL;
        const newLevel = nextLevel(level, type === RLE || type === RLO);
        if (
          newLevel <= MAX_DEPTH &&
          overflowIsolates === 0 &&
          overflowEmbeddings === 0
        ) {
          stack.push([level, override, isolate]);
          level = newLevel;
          override = type === RLO ? R : type === LRO ? L : undefined;
          isolate = false;
        } else if (overflowIsolates === 0) {
          overflowEmbeddings++;
        }
        break;
      }
      case RLI:
      case LRI:
      case FSI: {
        levels[i] = level;
        if (override !== undefined) types[i] = override;
        let isRightToLeft = type === RLI;
        if (type === FSI) {
          const isolateEnd = matchingPdi[i] === -1 ? end : matchingPdi[i];
          isRightToLeft = firstStrongLevel(state, i + 1, isolateEnd) === 1;
        }
        const newLevel = nextLevel(level, isRightToLeft);
        if (
          newLevel <= MAX_DEPTH &&
          overflowIsolates === 0 &&
          overflowEmbeddings === 0
        ) {
          validIsolates++;
          stack.push([level, override, isolate]);
          level = newLevel;
          override = undefined;
          isolate = true;
        } else {
          overflowIsolates++;
        }
        break;
      }
      case PDI:
        if (overflowIsolates > 0) {
          overflowIsolates--;
        } else if (validIsolates > 0) {
          overflowEmbeddings = 0;
          while (!isolate) [, , isolate] = stack.pop();
          [level, override, isolate] = stack.pop();
          validIsolates--;
        }
        levels[i] = level;
        if (override !== undefined) types[i] = override;
        break;
      case PDF:
        levels[i] = NO_LEVEL;
        if (overflowIsolates > 0) {
          // The PDF is within an overflow isolate
        } else if (overflowEmbeddings > 0) {
          overflowEmbeddings--;
        } else if (!isolate && stack.length > 0) {
          [level, override, isolate] = stack.pop();
        }
        break;
      case B:
        levels[i] = paragraphLevel;
        break;
      case BN:
        levels[i] = NO_LEVEL;
        break;
      default:
        levels[i] = level;
        if (override !== undefined) types[i] = override;
    }
  }
}

function nextLevel(level, isRightToLeft) {
  return isRightToLeft ? (level + 1) | 1 : (level + 2) & ~1;
}

/** X9–X10, BD13 */
function isolatingRunSequences(state, start, end, paragraphLevel) {
  const { originalTypes, levels, matchingPdi, pdiMatched } = state;

  // BD7: run r is kept[runStarts[r]] up to kept[runStarts[r + 1]]
  const kept = [];
  const runStarts = [];
  const runStartingWith = new Map();
  let runLevel = -1;
  for (let i = start; i < end; i++) {
    if (inClassSet(REMOVED_BY_X9, originalTypes[i])) continue;
    if (levels[i] !== runLevel) {
      runLevel = levels[i];
      runStartingWith.set(i, runStarts.length);
      runStarts.push(kept.length);
    }
    kept.push(i);
  }
  const runCount = runStarts.length;
  runStarts.push(kept.length);

  const sequences = [];
  for (let run = 0; run < runCount; run++) {
    const first = kept[runStarts[run]];
    if (originalTypes[first] === PDI && pdiMatched[first]) continue;
    const indices = kept.slice(runStarts[run], runStarts[run + 1]);
    let lastRun = run;
    let last = indices.at(-1);
    while (
      inClassSet(ISOLATE_INITIATORS, originalTypes[last]) &&
      matchingPdi[last] !== -1
    ) {
      lastRun = runStartingWith.get(matchingPdi[last]);
      for (let k = runStarts[lastRun]; k < runStarts[lastRun + 1]; k++) {
        indices.push(kept[k]);
      }
      last = indices.at(-1);
    }

    const level = levels[first];
    const before = runStarts[run];
    const after = runStarts[lastRun + 1];
    const levelBefore = before > 0 ? levels[kept[before - 1]] : paragraphLevel;
    const levelAfter =
      after < kept.length &&
      !inClassSet(ISOLATE_INITIATORS, originalTypes[last])
        ? levels[kept[after]]
        : paragraphLevel;

    const types = new Uint8Array(indices.length);
    for (let i = 0; i < indices.length; i++) types[i] = state.types[indices[i]];

    sequences.push([
      indices,
      types,
      level,
      directionOfLevel(Math.max(level, levelBefore)),
      directionOfLevel(Math.max(level, levelAfter)),
    ]);
  }
  return sequences;
}

/** W1–W7 */
function resolveWeakTypes(types, sos) {
  const length = types.length;

  // W1
  for (let i = 0; i < length; i++) {
    if (types[i] !== NSM) continue;
    if (i === 0) {
      types[i] = sos;
    } else {
      types[i] = inClassSet(ISOLATE_CONTROLS, types[i - 1]) ? ON : types[i - 1];
    }
  }

  // W2
  let lastStrong = sos;
  for (let i = 0; i < length; i++) {
    const type = types[i];
    if (type === L || type === R || type === AL) {
      lastStrong = type;
    } else if (type === EN && lastStrong === AL) {
      types[i] = AN;
    }
  }

  // W3
  for (let i = 0; i < length; i++) {
    if (types[i] === AL) types[i] = R;
  }

  // W4
  for (let i = 1; i < length - 1; i++) {
    const before = types[i - 1];
    const after = types[i + 1];
    if (types[i] === ES && before === EN && after === EN) {
      types[i] = EN;
    } else if (
      types[i] === CS &&
      (before === EN || before === AN) &&
      after === before
    ) {
      types[i] = before;
    }
  }

  // W5
  for (let i = 0; i < length; i++) {
    if (types[i] !== ET) continue;
    let runEnd = i;
    while (runEnd < length && types[runEnd] === ET) runEnd++;
    const enBefore = i > 0 && types[i - 1] === EN;
    const enAfter = runEnd < length && types[runEnd] === EN;
    if (enBefore || enAfter) types.fill(EN, i, runEnd);
    i = runEnd;
  }

  // W6
  for (let i = 0; i < length; i++) {
    if (types[i] === ES || types[i] === ET || types[i] === CS) {
      types[i] = ON;
    }
  }

  // W7
  lastStrong = sos;
  for (let i = 0; i < length; i++) {
    const type = types[i];
    if (type === L || type === R) {
      lastStrong = type;
    } else if (type === EN && lastStrong === L) {
      types[i] = L;
    }
  }
}

/** N0 */
function resolveBracketPairs(data, state, indices, types, level, sos) {
  const embedding = directionOfLevel(level);
  for (const [open, close] of bracketPairs(data, state, indices, types)) {
    let hasEmbedding = false;
    let hasOpposite = false;
    for (let i = open + 1; i < close && !hasEmbedding; i++) {
      const direction = strongDirection(types[i]);
      if (direction === embedding) hasEmbedding = true;
      else if (direction !== undefined) hasOpposite = true;
    }

    let direction;
    if (hasEmbedding) {
      direction = embedding;
    } else if (hasOpposite) {
      // N0 c
      direction = sos;
      for (let i = open - 1; i >= 0; i--) {
        const before = strongDirection(types[i]);
        if (before !== undefined) {
          direction = before;
          break;
        }
      }
    } else {
      continue;
    }

    for (const bracket of [open, close]) {
      types[bracket] = direction;
      // state.types are the types before W1
      for (
        let i = bracket + 1;
        i < indices.length && state.types[indices[i]] === NSM;
        i++
      ) {
        types[i] = direction;
      }
    }
  }
}

/** BD16 */
function bracketPairs(data, state, indices, types) {
  // [pair number, position] of each opening bracket
  const openings = [];
  const pairs = [];
  for (let i = 0; i < indices.length; i++) {
    // BD14–BD15
    if (types[i] !== ON) continue;
    const codePoint = state.codePoints[indices[i]];
    const opening = data.openingBrackets.get(codePoint);
    if (opening !== undefined) {
      if (openings.length === BRACKET_STACK_SIZE) return [];
      openings.push([opening, i]);
      continue;
    }
    const closing = data.closingBrackets.get(codePoint);
    if (closing === undefined) continue;
    for (let depth = openings.length - 1; depth >= 0; depth--) {
      const [pair, position] = openings[depth];
      if (pair === closing) {
        pairs.push([position, i]);
        openings.length = depth;
        break;
      }
    }
  }
  return pairs.sort((a, b) => a[0] - b[0]);
}

/** N1–N2 */
function resolveNeutralTypes(types, level, sos, eos) {
  const length = types.length;
  for (let i = 0; i < length; i++) {
    if (!inClassSet(NEUTRALS_AND_ISOLATES, types[i])) continue;
    let runEnd = i;
    while (
      runEnd < length &&
      inClassSet(NEUTRALS_AND_ISOLATES, types[runEnd])
    ) {
      runEnd++;
    }
    const before = i === 0 ? sos : strongDirection(types[i - 1]);
    const after = runEnd === length ? eos : strongDirection(types[runEnd]);
    types.fill(before === after ? before : directionOfLevel(level), i, runEnd);
    i = runEnd;
  }
}

/** I1–I2 */
function resolveImplicitLevels(levels, indices, types, level) {
  for (let i = 0; i < indices.length; i++) {
    const type = types[i];
    let resolved = level;
    if (level % 2 === 0) {
      if (type === R) resolved = level + 1;
      else if (type === AN || type === EN) resolved = level + 2;
    } else if (type === L || type === EN || type === AN) {
      resolved = level + 1;
    }
    levels[indices[i]] = resolved;
  }
}

/** L1 */
function resetWhitespaceLevels(state, start, end, paragraphLevel) {
  let trailing = true;
  for (let i = end - 1; i >= start; i--) {
    const type = state.originalTypes[i];
    if (inClassSet(SEPARATORS, type)) {
      state.levels[i] = paragraphLevel;
      trailing = true;
    } else if (trailing && inClassSet(TRAILING_WHITESPACE, type)) {
      state.levels[i] = paragraphLevel;
    } else {
      trailing = false;
    }
  }
}

/** Section 5.2 */
function assignRemovedLevels(state, start, end, paragraphLevel) {
  for (let i = start; i < end; i++) {
    if (state.levels[i] === NO_LEVEL) {
      state.levels[i] = i === start ? paragraphLevel : state.levels[i - 1];
    }
  }
}

function directionOfLevel(level) {
  return level % 2 === 0 ? L : R;
}

/** N0–N2 */
function strongDirection(type) {
  if (type === L) return L;
  if (type === R || type === EN || type === AN) return R;
  return undefined;
}

function classSet(...classes) {
  let set = 0;
  for (const type of classes) set |= 1 << type;
  return set;
}

function inClassSet(set, type) {
  return (set & (1 << type)) !== 0;
}

/**
 * @typedef {object} BidiData
 * @property {[number[], number[]]} classes
 * @property {(codePoint: number) => number} [classOf]
 * @property {Map<number, number>} openingBrackets
 * @property {Map<number, number>} closingBrackets
 * @property {[number[], number[]]} mirroring
 * @property {number[]} [mirrored]
 */

/**
 * @typedef {object} ResolvedText
 * @property {number} length In code points
 * @property {Int32Array} codePoints
 * @property {Int32Array} offsets Code unit offsets
 * @property {Uint8Array} classes
 * @property {Uint8Array} levels
 * @property {Array<[number, number, number]>} paragraphs [start, end, level]
 */
