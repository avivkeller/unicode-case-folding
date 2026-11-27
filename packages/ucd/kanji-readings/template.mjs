import { assertCodePoint } from "@internal/helpers/assert";
import { FIRST_CODE_UNIT, KANJI, READINGS, VERSION } from "#generated";

export { VERSION };

const HIRAGANA_END = 0x30a0;

/**
 * Returns the Japanese readings of a kanji, e.g. on ["サン", "セン"] and kun ["やま"] for 山
 * @param {number} codePoint
 * @returns {KanjiReadings | undefined}
 */
export function getKanjiReadings(codePoint) {
  assertCodePoint(codePoint);
  const encoded = KANJI.get(codePoint);
  if (encoded === undefined) return undefined;
  const on = [];
  const kun = [];
  for (let i = 0; i < encoded.length; i++) {
    const reading = READINGS[encoded.charCodeAt(i) - FIRST_CODE_UNIT];
    (reading.charCodeAt(0) < HIRAGANA_END ? kun : on).push(reading);
  }
  return { on, kun };
}

export default /* @__PURE__ */ Object.assign(getKanjiReadings, {
  getKanjiReadings,
  VERSION,
});

/**
 * @typedef {object} KanjiReadings
 * @property {string[]} on Sino-Japanese readings, in katakana
 * @property {string[]} kun Native Japanese readings, in hiragana
 */
