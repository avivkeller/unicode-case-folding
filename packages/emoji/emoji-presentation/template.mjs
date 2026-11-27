import { assertCodePoint, assertString } from "@internal/helpers/assert";
import { inSet } from "@internal/helpers/tables";
import {
  EMOJI,
  EMOJI_PRESENTATION,
  VARIATION_BASES,
  VERSION,
} from "#generated";

export { VERSION };

const TEXT_SELECTOR = "︎";
const EMOJI_SELECTOR = "️";
const KEYCAP = 0x20e3;

let bases;

/**
 * Returns how a character shows without a variation selector
 * @param {number} codePoint
 * @returns {"emoji" | "text" | undefined} undefined if it is not an emoji
 */
export function getDefaultPresentation(codePoint) {
  assertCodePoint(codePoint);
  if (inSet(EMOJI_PRESENTATION, codePoint)) return "emoji";
  return inSet(EMOJI, codePoint) ? "text" : undefined;
}

/**
 * Makes the characters of a text that have both presentations show as emoji,
 * e.g. "☺" → "☺️"
 * @param {string} text
 * @returns {string}
 */
export function toEmojiPresentation(text) {
  assertString(text);
  return text.replace(basesRegex(), (match, base, selector, offset) => {
    const codePoint = base.codePointAt(0);
    const after = text.codePointAt(offset + match.length);
    if (isModifier(after)) return match;
    if (codePoint < 0x80) {
      return selector || after === KEYCAP ? base + EMOJI_SELECTOR : match;
    }
    if (inSet(EMOJI_PRESENTATION, codePoint)) {
      return selector === TEXT_SELECTOR ? base : match;
    }
    return base + EMOJI_SELECTOR;
  });
}

/**
 * Makes the characters of a text that have both presentations show as text,
 * e.g. "☺️" → "☺︎"
 * @param {string} text
 * @returns {string}
 */
export function toTextPresentation(text) {
  assertString(text);
  return text.replace(basesRegex(), (match, base, selector, offset) => {
    const after = text.codePointAt(offset + match.length);
    if (isModifier(after)) return match;
    if (base.codePointAt(0) < 0x80 && !selector && after !== KEYCAP) {
      return match;
    }
    return base + TEXT_SELECTOR;
  });
}

function isModifier(codePoint) {
  return codePoint >= 0x1f3fb && codePoint <= 0x1f3ff;
}

function basesRegex() {
  if (bases === undefined) {
    let ranges = "";
    for (let i = 0; i < VARIATION_BASES.length; i += 2) {
      const start = VARIATION_BASES[i].toString(16);
      const end = (VARIATION_BASES[i + 1] - 1).toString(16);
      ranges += `\\u{${start}}-\\u{${end}}`;
    }
    bases = new RegExp(`([${ranges}])([\\uFE0E\\uFE0F]?)`, "gu");
  }
  return bases;
}

export default /* @__PURE__ */ Object.assign(toEmojiPresentation, {
  toEmojiPresentation,
  toTextPresentation,
  getDefaultPresentation,
  VERSION,
});
