import { assertString } from "@internal/helpers/assert";
import { normalizeLocale } from "@internal/helpers/locale";
import {
  BASE_SCRIPTS,
  LANGUAGE_SCRIPTS,
  LANGUAGES,
  SCRIPTS,
  VERSION,
} from "#generated";

export { VERSION };

const SCRIPT = /^[A-Za-z]{4}$/;

let languageScripts;

/**
 * Returns what handling the text of a script takes
 * @param {string} script - ISO 15924 code, e.g. "Arab"
 * @returns {ScriptInfo | undefined} undefined if CLDR has no data for the script
 */
export function getScriptInfo(script) {
  const info = SCRIPTS.get(scriptCode(script));
  if (info === undefined) return undefined;
  const [
    sampleCharacter,
    hasCase,
    needsInputMethod,
    breaksBetweenLetters,
    shaping,
  ] = info;
  return {
    sampleCharacter,
    hasCase: hasCase ?? undefined,
    needsInputMethod: needsInputMethod ?? undefined,
    breaksBetweenLetters: breaksBetweenLetters ?? undefined,
    shaping: shaping ?? undefined,
  };
}

/**
 * Returns the scripts that a script code stands for, e.g. "Jpan" → ["Hani", "Hira", "Kana"]
 * @param {string} script - ISO 15924 code
 * @returns {string[]} The script itself unless it combines, is a subset of or is a style of others
 */
export function getBaseScripts(script) {
  const code = scriptCode(script);
  return [...(BASE_SCRIPTS.get(code) ?? [code])];
}

/**
 * Returns the scripts that a language is written in
 * @param {string | Intl.Locale} locale - Only its language is used
 * @returns {LanguageScripts}
 */
export function getLanguageScripts(locale) {
  if (languageScripts === undefined) {
    const scripts = LANGUAGE_SCRIPTS.split("\t");
    languageScripts = new Map(
      LANGUAGES.split("\t").map((language, i) => [language, scripts[i]]),
    );
  }
  const [primary = "", secondary = ""] = (
    languageScripts.get(normalizeLocale(locale).split("-")[0]) ?? ""
  ).split("|");
  return {
    primary: primary ? primary.split(" ") : [],
    secondary: secondary ? secondary.split(" ") : [],
  };
}

function scriptCode(script) {
  assertString(script);
  if (!SCRIPT.test(script)) {
    throw new RangeError(`Invalid script code: ${script}`);
  }
  return script[0].toUpperCase() + script.slice(1).toLowerCase();
}

export default /* @__PURE__ */ Object.assign(getScriptInfo, {
  getScriptInfo,
  getBaseScripts,
  getLanguageScripts,
  VERSION,
});

/**
 * A property is undefined where it is unknown, as for "Zyyy"
 * @typedef {object} ScriptInfo
 * @property {string} sampleCharacter A character that stands for the script
 * @property {boolean} [hasCase] Whether it has uppercase and lowercase letters
 * @property {boolean} [needsInputMethod] Whether typing its major languages takes an input method (IME)
 * @property {boolean} [breaksBetweenLetters] Whether lines break between letters rather than at spaces
 * @property {"none" | "minimal" | "required"} [shaping] "required": letters join, reorder or change form; "minimal": only marks are positioned
 */

/**
 * @typedef {object} LanguageScripts
 * @property {string[]} primary The scripts in customary modern use
 * @property {string[]} secondary Historic, minority or other less common scripts
 */
