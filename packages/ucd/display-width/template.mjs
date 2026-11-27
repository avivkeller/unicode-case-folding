import { assertCodePoint, assertString } from "@internal/helpers/assert";
import { inSet } from "@internal/helpers/tables";
import { AMBIGUOUS, EMOJI, VERSION, WIDE, ZERO_WIDTH } from "#generated";

export { VERSION };

const VARIATION_SELECTOR_16 = "\ufe0f";
const ESCAPE = String.fromCharCode(0x1b);
const ANSI = new RegExp(
  `${ESCAPE}\\[[0-?]*[ -/]*[@-~]|${ESCAPE}\\][^${ESCAPE}\\u0007]*(?:\\u0007|${ESCAPE}\\\\)`,
  "g",
);
const PRINTABLE_ASCII = /^[ -~]*$/;

// Before U+0300, each character is a grapheme cluster (but zero-width CR LF)
const HAS_CLUSTERS = /[^\0-\u02ff]/;

let graphemes;

/**
 * Returns how many columns a string takes in a terminal, like wcwidth
 * @param {string} text
 * @param {DisplayWidthOptions} [options]
 * @returns {number}
 */
export function displayWidth(text, options = {}) {
  assertString(text);
  if (PRINTABLE_ASCII.test(text)) return text.length;

  const ambiguousWidth = options.ambiguousIsWide ? 2 : 1;
  const plain = text.includes(ESCAPE) ? text.replace(ANSI, "") : text;
  let width = 0;
  if (!HAS_CLUSTERS.test(plain)) {
    for (let i = 0; i < plain.length; i++) {
      width += characterWidth(plain.charCodeAt(i), ambiguousWidth);
    }
    return width;
  }
  graphemes ??= new Intl.Segmenter("und", { granularity: "grapheme" });
  for (const { segment } of graphemes.segment(plain)) {
    width += clusterWidth(segment, ambiguousWidth);
  }
  return width;
}

/**
 * Returns how many columns (0, 1 or 2) a character takes in a terminal
 * @param {number} codePoint
 * @param {DisplayWidthOptions} [options]
 * @returns {number}
 */
export function codePointWidth(codePoint, options = {}) {
  assertCodePoint(codePoint);
  return characterWidth(codePoint, options.ambiguousIsWide ? 2 : 1);
}

function characterWidth(codePoint, ambiguousWidth) {
  if (inSet(ZERO_WIDTH, codePoint)) return 0;
  if (inSet(WIDE, codePoint)) return 2;
  if (inSet(AMBIGUOUS, codePoint)) return ambiguousWidth;
  return 1;
}

function clusterWidth(cluster, ambiguousWidth) {
  for (const char of cluster) {
    const codePoint = char.codePointAt(0);
    const width = characterWidth(codePoint, ambiguousWidth);
    if (width === 0) continue;
    // Emoji style ("❤\ufe0f") is wide even where text style ("❤") is narrow
    if (
      width === 1 &&
      inSet(EMOJI, codePoint) &&
      cluster.includes(VARIATION_SELECTOR_16)
    ) {
      return 2;
    }
    return width;
  }
  return 0;
}

export default { displayWidth, codePointWidth, VERSION };

/**
 * @typedef {object} DisplayWidthOptions
 * @property {boolean} [ambiguousIsWide] East Asian Ambiguous characters take two columns
 */
