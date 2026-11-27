import { assertString } from "@internal/helpers/assert";
import {
  PAIR_BASES,
  PAIR_VARIANTS,
  SINGLE_BASES,
  SINGLE_VARIANTS,
  VERSION,
} from "#generated";

export { VERSION };

const SKIN_TONES = ["light", "medium-light", "medium", "medium-dark", "dark"];

const SELECTORS = /️/g;
const UNTONED = 25;

// Emoji without U+FE0F → 32 × its base + 5 × the first tone + the second,
// or + UNTONED; the pair bases follow the single ones
let forms;

/**
 * Applies a skin tone to an emoji, e.g. "👋" → "👋🏽", replacing the one it has
 * @param {string} emoji
 * @param {SkinTone | [SkinTone, SkinTone]} tone - Two tones for an emoji of
 *   two people, such as "🧑‍🤝‍🧑"
 * @returns {string} The emoji itself if it takes no skin tone
 */
export function setSkinTone(emoji, tone) {
  assertString(emoji);
  const pair = Array.isArray(tone);
  if (pair && tone.length !== 2) {
    throw new RangeError("Expected one skin tone, or two");
  }
  const first = toneIndex(pair ? tone[0] : tone);
  const second = pair ? toneIndex(tone[1]) : first;
  const form = lookup(emoji);
  if (form === undefined) return emoji;
  const base = form >> 5;
  if (base >= SINGLE_BASES.length) {
    return PAIR_VARIANTS[
      25 * (base - SINGLE_BASES.length) + 5 * first + second
    ];
  }
  if (pair) throw new RangeError(`${emoji} takes one skin tone`);
  return SINGLE_VARIANTS[5 * base + first];
}

/**
 * Removes the skin tones of an emoji, e.g. "👋🏽" → "👋"
 * @param {string} emoji
 * @returns {string} The emoji itself if it takes no skin tone
 */
export function removeSkinTone(emoji) {
  assertString(emoji);
  const form = lookup(emoji);
  if (form === undefined) return emoji;
  const base = form >> 5;
  return base < SINGLE_BASES.length
    ? SINGLE_BASES[base]
    : PAIR_BASES[base - SINGLE_BASES.length];
}

/**
 * Returns the skin tones of an emoji: one for each person of an emoji of two
 * people, and none for an emoji without skin tone
 * @param {string} emoji
 * @returns {SkinTone[]}
 */
export function getSkinTones(emoji) {
  assertString(emoji);
  const form = lookup(emoji);
  const tones = form === undefined ? UNTONED : form & 31;
  if (tones === UNTONED) return [];
  const first = SKIN_TONES[Math.floor(tones / 5)];
  return form >> 5 < SINGLE_BASES.length
    ? [first]
    : [first, SKIN_TONES[tones % 5]];
}

/**
 * Checks whether an emoji takes a skin tone
 * @param {string} emoji
 * @returns {boolean}
 */
export function supportsSkinTone(emoji) {
  assertString(emoji);
  return lookup(emoji) !== undefined;
}

function toneIndex(tone) {
  const index = SKIN_TONES.indexOf(tone);
  if (index === -1) {
    throw new RangeError(
      `Invalid skin tone: ${tone} (expected ${SKIN_TONES.join(", ")})`,
    );
  }
  return index;
}

function lookup(emoji) {
  if (forms === undefined) {
    forms = new Map();
    const add = (form, code) => forms.set(form.replace(SELECTORS, ""), code);
    SINGLE_BASES.forEach((base, i) => {
      add(base, 32 * i + UNTONED);
      for (let tone = 0; tone < 5; tone++) {
        add(SINGLE_VARIANTS[5 * i + tone], 32 * i + 5 * tone);
      }
    });
    PAIR_BASES.forEach((base, i) => {
      const code = 32 * (SINGLE_BASES.length + i);
      add(base, code + UNTONED);
      for (let tones = 0; tones < 25; tones++) {
        add(PAIR_VARIANTS[25 * i + tones], code + tones);
      }
    });
  }
  return forms.get(emoji.replace(SELECTORS, ""));
}

export default /* @__PURE__ */ Object.assign(setSkinTone, {
  setSkinTone,
  removeSkinTone,
  getSkinTones,
  supportsSkinTone,
  VERSION,
});

/** @typedef {"light" | "medium-light" | "medium" | "medium-dark" | "dark"} SkinTone */
