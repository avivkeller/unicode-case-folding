import { assertString } from "@internal/helpers/assert";
import { lookupLocale } from "@internal/helpers/locale";
import { toLowercase } from "unicode-lowercase";
import { ANSWERS, VERSION } from "#generated";

export { VERSION };

/**
 * Interprets a yes/no answer in a locale's language, ignoring case
 * @param {string} answer
 * @param {string | Intl.Locale} locale
 * @returns {boolean | undefined} undefined if neither
 */
export function parseYesNo(answer, locale) {
  assertString(answer);
  const [yes, no] = lookupLocale(ANSWERS, locale);
  const normalized = toLowercase(answer.trim().normalize("NFC"), { locale });
  const matches = (candidate) =>
    toLowercase(candidate, { locale }) === normalized;
  if (yes.some(matches)) return true;
  if (no.some(matches)) return false;
  return undefined;
}

/**
 * Returns the answers a locale accepts
 * @param {string | Intl.Locale} locale
 * @returns {YesNo}
 */
export function getYesNo(locale) {
  const [yes, no] = lookupLocale(ANSWERS, locale);
  return { yes: [...yes], no: [...no] };
}

export default { parseYesNo, getYesNo, VERSION };

/**
 * @typedef {object} YesNo
 * @property {string[]} yes Full word first
 * @property {string[]} no Full word first
 */
