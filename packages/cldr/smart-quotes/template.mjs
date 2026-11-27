import { assertString } from "@internal/helpers/assert";
import { lookupLocale } from "@internal/helpers/locale";
import { VERSION, QUOTES } from "#generated";

export { VERSION };

const APOSTROPHE = "\u2019"; // RIGHT SINGLE QUOTATION MARK
const WORD = /[\p{L}\p{N}\p{M}]/u;
const BEFORE_OPENING = /[\s\p{Ps}\p{Pi}\p{Pd}]/u;
const SPACE = /\s/u;
const DIGIT = /\p{Nd}/u;

/**
 * Returns the quotation marks of a locale
 * @param {string | Intl.Locale} locale
 * @returns {Quotes}
 */
export function getQuotes(locale) {
  const [start, end, alternateStart, alternateEnd] = lookupLocale(
    QUOTES,
    locale,
  );
  return { start, end, alternateStart, alternateEnd };
}

/**
 * Wraps text in the quotation marks of a locale
 * @param {string} text
 * @param {string | Intl.Locale} locale
 * @param {object} [options]
 * @param {boolean} [options.alternate] - Use the marks for nested quotes
 * @returns {string}
 */
export function quote(text, locale, { alternate = false } = {}) {
  assertString(text);
  const [start, end, alternateStart, alternateEnd] = lookupLocale(
    QUOTES,
    locale,
  );
  return alternate ? alternateStart + text + alternateEnd : start + text + end;
}

/**
 * Replaces straight quotes and apostrophes with a locale's typographic ones
 * @param {string} text
 * @param {string | Intl.Locale} locale
 * @returns {string}
 */
export function smartQuotes(text, locale) {
  assertString(text);
  const [start, end, alternateStart, alternateEnd] = lookupLocale(
    QUOTES,
    locale,
  );
  const chars = Array.from(text);

  let result = "";
  let openSingles = 0;
  let afterOpeningQuote = false;
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    if (char !== '"' && char !== "'") {
      result += char;
      afterOpeningQuote = false;
      continue;
    }

    const before = chars[i - 1];
    const after = chars[i + 1];
    const opens =
      (before === undefined ||
        afterOpeningQuote ||
        BEFORE_OPENING.test(before)) &&
      after !== undefined &&
      !SPACE.test(after);

    let mark;
    let opened = false;
    if (char === '"') {
      mark = opens ? start : end;
      opened = opens;
    } else if (opens && isAbbreviatedYear(chars, i)) {
      mark = APOSTROPHE; // '90s
    } else if (opens) {
      mark = alternateStart;
      opened = true;
      openSingles++;
    } else if (WORD.test(before) && after !== undefined && WORD.test(after)) {
      mark = APOSTROPHE; // don't, l'homme
    } else if (openSingles > 0) {
      mark = alternateEnd;
      openSingles--;
    } else {
      mark = APOSTROPHE; // students', goin'
    }

    result += mark;
    // Not `mark === start`: some locales open and close with the same mark
    afterOpeningQuote = opened;
  }
  return result;
}

function isAbbreviatedYear(chars, i) {
  return (
    DIGIT.test(chars[i + 1] ?? "") &&
    DIGIT.test(chars[i + 2] ?? "") &&
    !DIGIT.test(chars[i + 3] ?? "")
  );
}

export default { getQuotes, quote, smartQuotes, VERSION };

/**
 * @typedef {object} Quotes
 * @property {string} start
 * @property {string} end
 * @property {string} alternateStart For nested quotes
 * @property {string} alternateEnd
 */
