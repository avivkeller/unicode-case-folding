import {
  localeRegion,
  normalizeLocale,
  unicodeKeywords,
} from "@internal/helpers/locale";
import {
  DEFAULT_CALENDARS,
  LIKELY_REGIONS,
  REGION_CALENDARS,
  VERSION,
} from "#generated";

export { VERSION };

/**
 * Returns the calendars in use in the region of a locale, preferred first,
 * like Intl.Locale's getCalendars()
 * @param {string | Intl.Locale} locale
 * @returns {string[]} Calendar identifiers, e.g. ["gregory", "japanese"]
 */
export function getCalendars(locale) {
  const tag = normalizeLocale(locale);
  const keywords = unicodeKeywords(new Intl.Locale(locale).toString());
  const calendar = keywords.get("ca");
  if (calendar) return [calendar];
  return (
    REGION_CALENDARS.get(
      localeRegion(tag, keywords.get("rg"), LIKELY_REGIONS),
    ) ?? DEFAULT_CALENDARS
  ).split(" ");
}

export default /* @__PURE__ */ Object.assign(getCalendars, {
  getCalendars,
  VERSION,
});
