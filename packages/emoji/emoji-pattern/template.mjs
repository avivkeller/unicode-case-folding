import { assertString } from "@internal/helpers/assert";
import { PATTERN, VERSION } from "#generated";

export { VERSION };

let whole;
let shared;

/**
 * Creates a regular expression that matches each emoji (RGI_Emoji) of a text
 * @param {string} [flags] "gu" by default; needs "u" or "v"
 * @returns {RegExp}
 */
export function emojiRegex(flags = "gu") {
  assertString(flags);
  if (!/[uv]/.test(flags)) {
    throw new RangeError('The flags must include "u" or "v"');
  }
  return new RegExp(PATTERN, flags);
}

/**
 * Checks whether a text is exactly one emoji, e.g. "👍🏽" or "🇯🇵"
 * @param {string} text
 * @returns {boolean}
 */
export function isEmoji(text) {
  assertString(text);
  whole ??= new RegExp(`^(?:${PATTERN})$`, "u");
  return whole.test(text);
}

/**
 * Finds the emoji of a text, in order
 * @param {string} text
 * @returns {EmojiMatch[]}
 */
export function findEmoji(text) {
  assertString(text);
  const regex = sharedRegex();
  const matches = [];
  for (let match; (match = regex.exec(text)); ) {
    matches.push({ emoji: match[0], index: match.index });
  }
  return matches;
}

/**
 * Counts the emoji of a text: a flag or a family is one emoji
 * @param {string} text
 * @returns {number}
 */
export function countEmoji(text) {
  assertString(text);
  const regex = sharedRegex();
  let count = 0;
  while (regex.test(text)) count++;
  return count;
}

/**
 * Removes the emoji of a text
 * @param {string} text
 * @returns {string}
 */
export function stripEmoji(text) {
  assertString(text);
  return text.replace(sharedRegex(), "");
}

function sharedRegex() {
  shared ??= new RegExp(PATTERN, "gu");
  shared.lastIndex = 0;
  return shared;
}

export default /* @__PURE__ */ Object.assign(emojiRegex, {
  emojiRegex,
  isEmoji,
  findEmoji,
  countEmoji,
  stripEmoji,
  VERSION,
});

/**
 * @typedef {object} EmojiMatch
 * @property {string} emoji
 * @property {number} index UTF-16 offset in the text
 */
