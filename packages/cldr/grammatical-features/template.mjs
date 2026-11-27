import { normalizeLocale } from "@internal/helpers/locale";
import { LANGUAGES, VALUES, VERSION } from "#generated";

export { VERSION };

/**
 * Returns the grammatical forms that the nouns of a language have
 * @param {string | Intl.Locale} locale
 * @returns {GrammaticalFeatures | undefined} undefined if CLDR has no data for the language
 */
export function getGrammaticalFeatures(locale) {
  const features = LANGUAGES.get(normalizeLocale(locale).split("-")[0]);
  if (features === undefined) return undefined;
  const [cases, genders, definiteness] = features.map((indexes) =>
    indexes.map((index) => VALUES[index]),
  );
  return { cases, genders, definiteness };
}

export default /* @__PURE__ */ Object.assign(getGrammaticalFeatures, {
  getGrammaticalFeatures,
  VERSION,
});

/**
 * Each list is empty if nouns do not vary that way
 * @typedef {object} GrammaticalFeatures
 * @property {string[]} cases e.g. ["nominative", "genitive", "dative", "accusative"]
 * @property {string[]} genders e.g. ["masculine", "feminine", "neuter"]
 * @property {string[]} definiteness e.g. ["definite", "indefinite"]
 */
