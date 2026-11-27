import { normalizeLocale } from "@internal/helpers/locale";
import { LIKELY_SCRIPTS, PARENTS, REGION_SCRIPTS, VERSION } from "#generated";

export { VERSION };

const SCRIPT = /^[A-Z][a-z]{3}$/;
const REGION = /^(?:[A-Z]{2}|\d{3})$/;
const EXTENSION = /-[a-z0-9]-/;

let likelyScripts;

/**
 * Returns the locale that a locale inherits from, e.g. "es-MX" → "es-419"
 * @param {string | Intl.Locale} locale
 * @returns {string | undefined} undefined if it is the root locale
 */
export function getParentLocale(locale) {
  return parentOf(baseName(locale));
}

/**
 * Returns a locale followed by its ancestors, e.g. "es-MX" → ["es-MX", "es-419", "es"]
 * @param {string | Intl.Locale} locale
 * @returns {string[]}
 */
export function getFallbackChain(locale) {
  const chain = [];
  for (
    let tag = baseName(locale);
    tag !== undefined && !chain.includes(tag);
    tag = parentOf(tag)
  ) {
    chain.push(tag);
  }
  return chain;
}

// Engines turn the "posix" variant into an extension, and keep it
function baseName(locale) {
  const tag = normalizeLocale(locale);
  const extension = tag.search(EXTENSION);
  return extension === -1 ? tag : tag.slice(0, extension);
}

function parentOf(tag) {
  const explicit = PARENTS.get(tag);
  if (explicit !== undefined) return root(explicit);

  const subtags = tag.split("-");
  const language = subtags[0];
  let i = 1;
  const script = SCRIPT.test(subtags[i]) ? subtags[i++] : undefined;
  const region = REGION.test(subtags[i]) ? subtags[i++] : undefined;
  if (i < subtags.length) return subtags.slice(0, -1).join("-");

  if (region === undefined) {
    return script === undefined || script !== likelyScript(language)
      ? undefined
      : language;
  }
  // "zh-TW" is short for "zh-Hant-TW", and inherits like it
  const implied = REGION_SCRIPTS.get(`${language}-${region}`);
  if (script === undefined) {
    if (implied === undefined) return root(language);
    const parent = PARENTS.get(`${language}-${implied}-${region}`);
    return parent === undefined ? `${language}-${implied}` : root(parent);
  }
  if (script === (implied ?? likelyScript(language))) {
    const parent = PARENTS.get(`${language}-${region}`);
    if (parent !== undefined) return root(parent);
  }
  return `${language}-${script}`;
}

function root(parent) {
  return parent === "und" ? undefined : parent;
}

function likelyScript(language) {
  if (likelyScripts === undefined) {
    likelyScripts = new Map();
    for (const [script, languages] of Object.entries(LIKELY_SCRIPTS)) {
      for (const each of languages.split(" ")) likelyScripts.set(each, script);
    }
  }
  return likelyScripts.get(language) ?? "Latn";
}

export default /* @__PURE__ */ Object.assign(getFallbackChain, {
  getFallbackChain,
  getParentLocale,
  VERSION,
});
