import {
  localeRegion,
  normalizeLocale,
  unicodeKeywords,
} from "@internal/helpers/locale";
import {
  CYCLES_BY_REGION,
  DEFAULT_CYCLES,
  LIKELY_REGIONS,
  VERSION,
} from "#generated";

export { VERSION };

const HOUR_CYCLES = ["h11", "h12", "h23", "h24"];

/**
 * Returns the hour cycle a locale prefers: "h12" (1–12), "h23" (0–23),
 * "h11" (0–11) or "h24" (1–24)
 * @param {string | Intl.Locale} locale
 * @returns {HourCycle}
 */
export function getHourCycle(locale) {
  return getHourCycles(locale)[0];
}

/**
 * Returns the hour cycles in use in a locale, preferred first, like
 * Intl.Locale's getHourCycles()
 * @param {string | Intl.Locale} locale
 * @returns {HourCycle[]}
 */
export function getHourCycles(locale) {
  const tag = normalizeLocale(locale);
  const keywords = unicodeKeywords(new Intl.Locale(locale).toString());
  const [language] = tag.split("-");
  const region = localeRegion(tag, keywords.get("rg"), LIKELY_REGIONS);
  const cycles = (
    CYCLES_BY_REGION.get(`${language}-${region}`) ??
    CYCLES_BY_REGION.get(region) ??
    DEFAULT_CYCLES
  ).split(" ");

  const hc = keywords.get("hc");
  return HOUR_CYCLES.includes(hc) ? [hc] : cycles;
}

export default /* @__PURE__ */ Object.assign(getHourCycle, {
  getHourCycle,
  getHourCycles,
  VERSION,
});

/** @typedef {"h11" | "h12" | "h23" | "h24"} HourCycle */
