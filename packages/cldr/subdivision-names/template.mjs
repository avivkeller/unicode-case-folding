import { assertString } from "@internal/helpers/assert";
import { lookupLocale } from "@internal/helpers/locale";
import { CODES, CONTAINS, LOCALIZED, NAMES, VERSION } from "#generated";

export { VERSION };

const SUBDIVISION = /^([a-z]{2})-?([a-z0-9]{1,4})$/;
const REGION = /^[a-z]{2}$/;

let english;

/**
 * Returns the name of a country subdivision, e.g. "US-CA" → "California"
 * @param {string} code - ISO 3166-2 code, or Unicode subdivision id ("usca")
 * @param {string | Intl.Locale} [locale] - "en" by default; names are in
 *   English where the locale has none
 * @returns {string | undefined}
 */
export function getSubdivisionName(code, locale = "en") {
  const id = subdivisionId(code);
  const localized = lookupLocale(LOCALIZED, locale);
  if (id === undefined) return undefined;
  if (english === undefined) {
    english = new Map(CODES.map((key, index) => [key, NAMES[index]]));
  }
  return localized[id] ?? english.get(id);
}

/**
 * Lists the subdivisions of a country, or of a subdivision
 * @param {string} code - ISO 3166 region ("US") or ISO 3166-2 code ("GB-ENG")
 * @returns {string[]} ISO 3166-2 codes, e.g. ["US-AK", "US-AL", …]
 */
export function getSubdivisions(code) {
  assertString(code);
  const key = REGION.test(code.toLowerCase())
    ? code.toUpperCase()
    : subdivisionId(code);
  const list = CONTAINS.get(key);
  return list === undefined ? [] : list.split(" ").map(toIsoCode);
}

function subdivisionId(code) {
  assertString(code);
  const match = SUBDIVISION.exec(code.toLowerCase());
  return match ? match[1] + match[2] : undefined;
}

function toIsoCode(id) {
  return `${id.slice(0, 2)}-${id.slice(2)}`.toUpperCase();
}

export default /* @__PURE__ */ Object.assign(getSubdivisionName, {
  getSubdivisionName,
  getSubdivisions,
  VERSION,
});
