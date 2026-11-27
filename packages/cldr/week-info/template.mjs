import { normalizeLocale, unicodeKeywords } from "@internal/helpers/locale";
import {
  CLDR_LANGUAGES,
  DEFAULT_WEEK,
  LIKELY_REGIONS,
  REGION_WEEKS,
  VERSION,
} from "#generated";

export { VERSION };

const FIRST_DAY = 0;
const MINIMAL_DAYS = 1;
const WEEKEND_START = 2;
const WEEKEND_END = 3;

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const REGION = /^(?:[A-Z]{2}|\d{3})$/;

/**
 * Returns the week conventions of a locale, like Intl.Locale's getWeekInfo()
 * @param {string | Intl.Locale} locale
 * @returns {WeekInfo}
 */
export function getWeekInfo(locale) {
  const tag = normalizeLocale(locale);
  const keywords = unicodeKeywords(new Intl.Locale(locale).toString());
  const week =
    REGION_WEEKS.get(regionOf(tag, keywords.get("rg"))) ?? DEFAULT_WEEK;

  const firstDay = DAYS.indexOf(keywords.get("fw")) + 1 || week[FIRST_DAY];
  const weekend = [];
  for (let day = week[WEEKEND_START]; ; day = (day % 7) + 1) {
    weekend.push(day);
    if (day === week[WEEKEND_END]) break;
  }
  return { firstDay, weekend: weekend.sort(), minimalDays: week[MINIMAL_DAYS] };
}

function regionOf(tag, rg) {
  // "gbzzzz": region GB, no subdivision
  if (rg && /^[a-z]{2}[a-z0-9]{1,4}$/.test(rg))
    return rg.slice(0, 2).toUpperCase();

  const [language, ...subtags] = tag.split("-");
  const region = subtags.find((subtag) => REGION.test(subtag));
  if (region) return region;
  const script = subtags.find((subtag) => /^[A-Z][a-z]{3}$/.test(subtag));
  const likely =
    (script && LIKELY_REGIONS.get(`${language}-${script}`)) ??
    LIKELY_REGIONS.get(language);
  if (likely || CLDR_LANGUAGES.has(language)) return likely;

  return new Intl.Locale(tag).maximize().region;
}

export default { getWeekInfo, VERSION };

/**
 * Days are numbered from 1 (Monday) to 7 (Sunday)
 * @typedef {object} WeekInfo
 * @property {number} firstDay
 * @property {number[]} weekend
 * @property {number} minimalDays Fewest days in a year's first week
 */
