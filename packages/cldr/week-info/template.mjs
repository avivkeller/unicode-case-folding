import {
  localeRegion,
  normalizeLocale,
  unicodeKeywords,
} from "@internal/helpers/locale";
import {
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

/**
 * Returns the week conventions of a locale, like Intl.Locale's getWeekInfo()
 * @param {string | Intl.Locale} locale
 * @returns {WeekInfo}
 */
export function getWeekInfo(locale) {
  const tag = normalizeLocale(locale);
  const keywords = unicodeKeywords(new Intl.Locale(locale).toString());
  const week =
    REGION_WEEKS.get(localeRegion(tag, keywords.get("rg"), LIKELY_REGIONS)) ??
    DEFAULT_WEEK;

  const firstDay = DAYS.indexOf(keywords.get("fw")) + 1 || week[FIRST_DAY];
  const weekend = [];
  for (let day = week[WEEKEND_START]; ; day = (day % 7) + 1) {
    weekend.push(day);
    if (day === week[WEEKEND_END]) break;
  }
  return { firstDay, weekend: weekend.sort(), minimalDays: week[MINIMAL_DAYS] };
}

export default /* @__PURE__ */ Object.assign(getWeekInfo, {
  getWeekInfo,
  VERSION,
});

/**
 * Days are numbered from 1 (Monday) to 7 (Sunday)
 * @typedef {object} WeekInfo
 * @property {number} firstDay
 * @property {number[]} weekend
 * @property {number} minimalDays Fewest days in a year's first week
 */
