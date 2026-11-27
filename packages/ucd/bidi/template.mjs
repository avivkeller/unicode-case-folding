import {
  assertCodePoint,
  assertOption,
  assertString,
} from "@internal/helpers/assert";
import {
  BIDI_CLASS_NAMES,
  bidiClass,
  isMirrored,
  lineLevels,
  mirroringGlyph,
  resolveLevels,
  visualRuns,
} from "@internal/helpers/bidi";
import { splitGraphemes } from "unicode-text-segmentation";
import { BIDI, VERSION } from "#generated";

export { VERSION };

const DIRECTIONS = ["ltr", "rtl", "auto"];
const CARRIAGE_RETURN = 0x0d;
const LINE_FEED = 0x0a;
const LINE_SEPARATOR = 0x2028;
// Unchanged since Unicode 6.3, so the engine's Unicode version does not matter
const BIDI_CONTROLS = /\p{Bidi_Control}/gu;

/**
 * Resolves the embedding levels of text with the Unicode Bidirectional Algorithm
 * @param {string} text
 * @param {{ direction?: "ltr" | "rtl" | "auto" }} [options] - "auto" by default
 * @returns {EmbeddingLevels}
 */
export function getEmbeddingLevels(text, { direction = "auto" } = {}) {
  assertString(text);
  assertOption("direction", direction, DIRECTIONS);

  const { length, offsets, levels, paragraphs } = resolveLevels(
    BIDI,
    text,
    direction,
  );
  let codeUnitLevels = levels;
  if (length < text.length) {
    codeUnitLevels = new Uint8Array(text.length);
    for (let i = 0; i < length; i++) {
      codeUnitLevels[offsets[i]] = levels[i];
      codeUnitLevels[offsets[i + 1] - 1] = levels[i];
    }
  }
  return {
    paragraphs: paragraphs.map(([start, end, level]) => ({
      start: offsets[start],
      end: offsets[end],
      level,
    })),
    levels: codeUnitLevels,
  };
}

/**
 * Reorders a line of text for display and finds its mirrored characters
 * @param {string} text
 * @param {EmbeddingLevels} embeddingLevels - From getEmbeddingLevels(text)
 * @param {number} [start]
 * @param {number} [end]
 * @returns {ReorderedLine}
 */
export function reorderLine(text, embeddingLevels, start = 0, end) {
  assertString(text);
  if (embeddingLevels?.levels?.length !== text.length) {
    throw new TypeError(
      "Embedding levels must be the result of getEmbeddingLevels() for the same text",
    );
  }
  end ??= text.length;
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    start > end ||
    end > text.length
  ) {
    throw new RangeError(`Invalid line: ${start} to ${end}`);
  }

  const order = [];
  const mirrored = [];
  for (const paragraph of embeddingLevels.paragraphs) {
    const lineStart = Math.max(start, paragraph.start);
    const lineEnd = Math.min(end, paragraph.end);
    if (lineStart >= lineEnd) continue;

    const levels = lineLevels(
      BIDI,
      text,
      embeddingLevels.levels,
      lineStart,
      lineEnd,
      paragraph.level,
    );
    for (const [runStart, runEnd, level] of visualRuns(levels)) {
      if (level % 2 === 0) {
        for (let i = runStart; i < runEnd; i++) order.push(lineStart + i);
      } else {
        pushReversed(text, order, lineStart + runStart, lineStart + runEnd);
      }
    }

    for (let i = lineStart; i < lineEnd; i++) {
      const codePoint = text.codePointAt(i);
      if (levels[i - lineStart] % 2 === 1 && isMirrored(BIDI, codePoint)) {
        mirrored.push(i);
      }
      if (codePoint > 0xffff) i++;
    }
  }
  return { order, mirrored };
}

/**
 * Converts text to display order, for output that does not reorder it
 * @param {string} text
 * @param {{ direction?: "ltr" | "rtl" | "auto" }} [options] - "auto" by default
 * @returns {string}
 */
export function toVisualString(text, options) {
  const { paragraphs, levels } = getEmbeddingLevels(text, options);
  let visual = "";
  for (const paragraph of paragraphs) {
    const separatorStart = paragraph.end - separatorLength(text, paragraph.end);
    let lineStart = paragraph.start;
    for (let i = lineStart; i < separatorStart; i++) {
      if (text.charCodeAt(i) === LINE_SEPARATOR) {
        visual += visualLine(text, levels, lineStart, i, paragraph.level);
        visual += text[i];
        lineStart = i + 1;
      }
    }
    visual += visualLine(
      text,
      levels,
      lineStart,
      separatorStart,
      paragraph.level,
    );
    visual += text.slice(separatorStart, paragraph.end);
  }
  return visual;
}

/**
 * Returns the Bidi_Mirroring_Glyph of a code point, e.g. ")" for "("
 * @param {number} codePoint
 * @returns {number | undefined}
 */
export function getMirroredCharacter(codePoint) {
  assertCodePoint(codePoint);
  return mirroringGlyph(BIDI, codePoint);
}

/**
 * Returns the Bidi_Class property of a code point
 * @param {number} codePoint
 * @returns {BidiClass}
 */
export function getBidiClass(codePoint) {
  assertCodePoint(codePoint);
  return /** @type {BidiClass} */ (
    BIDI_CLASS_NAMES[bidiClass(BIDI, codePoint)]
  );
}

function pushReversed(text, order, start, end) {
  for (let i = end - 1; i >= start; i--) {
    if (i > start && text.codePointAt(i - 1) > 0xffff) {
      order.push(i - 1, i);
      i--;
    } else {
      order.push(i);
    }
  }
}

function visualLine(text, levels, start, end, paragraphLevel) {
  const line = lineLevels(BIDI, text, levels, start, end, paragraphLevel);
  let visual = "";
  for (const [runStart, runEnd, level] of visualRuns(line)) {
    const runText = text
      .slice(start + runStart, start + runEnd)
      .replace(BIDI_CONTROLS, "");
    if (level % 2 === 0) {
      visual += runText;
      continue;
    }
    const clusters = splitGraphemes(runText);
    for (let i = clusters.length - 1; i >= 0; i--) {
      for (const char of clusters[i]) {
        const mirror = mirroringGlyph(BIDI, char.codePointAt(0));
        visual += mirror === undefined ? char : String.fromCodePoint(mirror);
      }
    }
  }
  return visual;
}

function separatorLength(text, end) {
  if (end === 0 || getBidiClass(text.charCodeAt(end - 1)) !== "B") return 0;
  const isCrLf =
    text.charCodeAt(end - 1) === LINE_FEED &&
    text.charCodeAt(end - 2) === CARRIAGE_RETURN;
  return isCrLf ? 2 : 1;
}

export default /* @__PURE__ */ Object.assign(getEmbeddingLevels, {
  getEmbeddingLevels,
  reorderLine,
  toVisualString,
  getMirroredCharacter,
  getBidiClass,
  VERSION,
});

/**
 * Even levels are left-to-right, odd levels right-to-left
 * @typedef {object} EmbeddingLevels
 * @property {Paragraph[]} paragraphs
 * @property {Uint8Array} levels One per UTF-16 code unit
 */

/**
 * @typedef {object} Paragraph
 * @property {number} start
 * @property {number} end Exclusive, after the paragraph separator
 * @property {number} level 0 for left-to-right, 1 for right-to-left
 */

/**
 * @typedef {object} ReorderedLine
 * @property {number[]} order Code unit indices in display order
 * @property {number[]} mirrored Indices of characters shown with mirrored glyphs
 */

/** @typedef {"L" | "R" | "AL" | "EN" | "ES" | "ET" | "AN" | "CS" | "NSM" | "BN" | "B" | "S" | "WS" | "ON" | "LRE" | "LRO" | "RLE" | "RLO" | "PDF" | "LRI" | "RLI" | "FSI" | "PDI"} BidiClass */
