import { lookupLocale, normalizeLocale } from "@internal/helpers/locale";
import { VERSION, DIRECTIONS, RTL_SCRIPTS } from "#generated";

export { VERSION };

const SCRIPT = /^[A-Z][a-z]{3}$/;

/**
 * Returns the direction a locale's text is written in
 * @param {string | Intl.Locale} locale
 * @returns {"ltr" | "rtl"}
 */
export function getTextDirection(locale) {
  const script = normalizeLocale(locale).split("-")[1];
  if (script !== undefined && SCRIPT.test(script)) {
    return RTL_SCRIPTS.has(script) ? "rtl" : "ltr";
  }
  return /** @type {"ltr" | "rtl"} */ (lookupLocale(DIRECTIONS, locale));
}

/**
 * Checks whether a locale's text is written right-to-left
 * @param {string | Intl.Locale} locale
 * @returns {boolean}
 */
export function isRightToLeft(locale) {
  return getTextDirection(locale) === "rtl";
}

export default /* @__PURE__ */ Object.assign(getTextDirection, {
  getTextDirection,
  isRightToLeft,
  VERSION,
});
