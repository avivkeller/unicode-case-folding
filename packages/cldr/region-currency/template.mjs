import { assertString } from "@internal/helpers/assert";
import { CURRENCY_ROUNDING, REGION_CURRENCIES, VERSION } from "#generated";

export { VERSION };

const CURRENCY = /^[A-Z]{3}$/;

/**
 * Returns a region's legal tender currencies on a date, primary first
 * @param {string} region - ISO 3166 code
 * @param {Date} [date] - Defaults to now
 * @returns {string[]} ISO 4217 codes
 */
export function getCurrencies(region, date = new Date()) {
  assertString(region);
  const code = region.toUpperCase();

  const day = date.toISOString().slice(0, 10);
  return (REGION_CURRENCIES.get(code) ?? [])
    .filter(
      ([, from, to]) =>
        (from === null || from <= day) && (to === null || day <= to),
    )
    .map(([currency]) => currency);
}

/**
 * Returns the primary currency of a region on a date
 * @param {string} region - ISO 3166 code
 * @param {Date} [date] - Defaults to now
 * @returns {string | undefined} ISO 4217 code
 */
export function getCurrency(region, date) {
  return getCurrencies(region, date)[0];
}

/**
 * Returns how a currency is rounded, as Intl.NumberFormat options
 * @param {string} currency - ISO 4217 code
 * @returns {CurrencyRounding}
 */
export function getCurrencyRounding(currency) {
  assertString(currency);
  const code = currency.toUpperCase();
  if (!CURRENCY.test(code))
    throw new RangeError(`Invalid currency: ${currency}`);
  const [
    fractionDigits,
    roundingIncrement,
    cashFractionDigits,
    cashRoundingIncrement,
  ] = CURRENCY_ROUNDING.get(code) ?? CURRENCY_ROUNDING.get("DEFAULT");
  return {
    fractionDigits,
    roundingIncrement,
    cashFractionDigits,
    cashRoundingIncrement,
  };
}

export default /* @__PURE__ */ Object.assign(getCurrency, {
  getCurrency,
  getCurrencies,
  getCurrencyRounding,
  VERSION,
});

/**
 * @typedef {object} CurrencyRounding
 * @property {number} fractionDigits
 * @property {number} roundingIncrement In units of the last decimal place
 * @property {number} cashFractionDigits
 * @property {number} cashRoundingIncrement
 */
