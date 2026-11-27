import { assertOption } from "@internal/helpers/assert";
import { lookupLocale } from "@internal/helpers/locale";
import { LOCALES, SETS, VERSION } from "#generated";

export { VERSION };

const TYPES = ["main", "auxiliary", "index", "numbers", "punctuation"];

const sets = new Map();

/**
 * Returns the letters of a language in alphabetical order, e.g. "a", "ä", "b"… for German
 * @param {string | Intl.Locale} locale
 * @returns {string[]} Lowercase; a letter can be several characters, like the Czech "ch"
 */
export function getAlphabet(locale) {
  return getExemplarCharacters(locale, "main");
}

/**
 * Returns the labels of an alphabetical index, e.g. "A", "B", "C"… for English
 * @param {string | Intl.Locale} locale
 * @returns {string[]}
 */
export function getIndexCharacters(locale) {
  return getExemplarCharacters(locale, "index");
}

/**
 * Returns the exemplar characters of a language
 * @param {string | Intl.Locale} locale
 * @param {ExemplarType} [type] "main" by default
 * @returns {string[]}
 */
export function getExemplarCharacters(locale, type = "main") {
  assertOption("type", type, TYPES);
  const index = lookupLocale(LOCALES, locale)[TYPES.indexOf(type)];
  let set = sets.get(index);
  if (set === undefined) {
    set = SETS[index] === "" ? [] : SETS[index].split("\t");
    sets.set(index, set);
  }
  return set.slice();
}

export default /* @__PURE__ */ Object.assign(getAlphabet, {
  getAlphabet,
  getIndexCharacters,
  getExemplarCharacters,
  VERSION,
});

/**
 * "main": the letters of the language. "auxiliary": letters of foreign
 * words and names. "index": the labels of an alphabetical index.
 * "numbers": digits and number symbols. "punctuation": punctuation marks.
 * @typedef {"main" | "auxiliary" | "index" | "numbers" | "punctuation"} ExemplarType
 */
