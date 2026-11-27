import {
  assertCodePoint,
  assertOption,
  assertString,
} from "@internal/helpers/assert";
import { normalizeLocale } from "@internal/helpers/locale";
import { findRun } from "@internal/helpers/tables";
import { READINGS, SYLLABLES, TAIWAN_READINGS, VERSION } from "#generated";

export { VERSION };

const TONE_MARKS = { "\u0304": 1, "\u0301": 2, "\u030c": 3, "\u0300": 4 };
const TONE_MARK = /[\u0304\u0301\u030c\u0300]/;
const TONES = ["mark", "number", "none"];
const WORD = /[\p{L}\p{N}]/u;

/**
 * Returns the Mandarin reading of a Chinese character, e.g. "zhōng" for 中
 * @param {number} codePoint
 * @param {PinyinOptions} [options]
 * @returns {string | undefined}
 */
export function getPinyin(codePoint, options = {}) {
  assertCodePoint(codePoint);
  const { tone, taiwan } = resolveOptions(options);
  const index = readingIndex(codePoint, taiwan);
  return index === undefined ? undefined : formatTone(SYLLABLES[index], tone);
}

/**
 * Converts the Chinese characters of a text to pinyin, e.g. "中文" → "zhōng wén"
 * @param {string} text
 * @param {PinyinOptions & { separator?: string }} [options]
 * @returns {string}
 */
export function toPinyin(text, options = {}) {
  assertString(text);
  const { tone, taiwan } = resolveOptions(options);
  const separator = options.separator ?? " ";
  assertString(separator);

  let result = "";
  let previous = "";
  for (const char of text) {
    const index = readingIndex(char.codePointAt(0), taiwan);
    const kind =
      index !== undefined ? "reading" : WORD.test(char) ? "word" : "other";
    if (
      (kind === "reading" && previous !== "" && previous !== "other") ||
      (kind === "word" && previous === "reading")
    ) {
      result += separator;
    }
    result += kind === "reading" ? formatTone(SYLLABLES[index], tone) : char;
    previous = kind;
  }
  return result;
}

function resolveOptions({ tone = "mark", locale }) {
  assertOption("tone", tone, TONES);
  let taiwan = false;
  if (locale !== undefined) {
    const subtags = normalizeLocale(locale).split("-");
    taiwan = subtags.includes("TW") || subtags.includes("Hant");
  }
  return { tone, taiwan };
}

function readingIndex(codePoint, taiwan) {
  if (taiwan && TAIWAN_READINGS.has(codePoint)) {
    return TAIWAN_READINGS.get(codePoint);
  }
  const [starts, runs] = READINGS;
  const run = findRun(starts, codePoint);
  const reading = runs[run]?.[codePoint - starts[run]];
  return reading ? reading - 1 : undefined;
}

function formatTone(syllable, tone) {
  if (tone === "mark") return syllable;
  const decomposed = syllable.normalize("NFD");
  const mark = TONE_MARK.exec(decomposed)?.[0];
  const plain = decomposed.replace(TONE_MARK, "").normalize("NFC");
  return tone === "number" && mark ? plain + TONE_MARKS[mark] : plain;
}

export default { getPinyin, toPinyin, VERSION };

/**
 * @typedef {object} PinyinOptions
 * @property {"mark" | "number" | "none"} [tone] "mark" by default
 * @property {string | Intl.Locale} [locale] "zh-TW" or "zh-Hant" selects Taiwan readings
 */
