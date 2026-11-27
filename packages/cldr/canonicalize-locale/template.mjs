import {
  COMPLEX_RULES,
  EXTENSION_TYPES,
  LANGUAGES,
  LEGACY,
  LIKELY_REGIONS,
  REGIONS,
  SCRIPTS,
  SUBDIVISIONS,
  VARIANTS,
  VERSION,
} from "#generated";

export { VERSION };

const CACHE_SIZE = 1000;
const LANGUAGE = /^(?:[a-z]{2,3}|[a-z]{5,8})$/;
const EXTLANG = /^[a-z]{3}$/;
const SCRIPT = /^[a-z]{4}$/;
const REGION = /^(?:[a-z]{2}|\d{3})$/;
const VARIANT = /^(?:[a-z0-9]{5,8}|\d[a-z0-9]{3})$/;
const SINGLETON = /^[a-wy-z0-9]$/;
const EXTENSION_SUBTAG = /^[a-z0-9]{2,8}$/;
const PRIVATE_SUBTAG = /^[a-z0-9]{1,8}$/;
const KEY = /^[a-z0-9][a-z]$/;
const TKEY = /^[a-z]\d$/;
const TYPE_SUBTAG = /^[a-z0-9]{3,8}$/;

const cache = new Map();
let tables;

/**
 * Canonicalizes a locale identifier, e.g. "iw-IL" → "he-IL", "sgn-US" → "ase"
 * @param {string | Intl.Locale} locale - BCP 47 language tag; "_" may separate subtags
 * @returns {string}
 * @throws {RangeError} If the locale is not well-formed
 */
export function canonicalizeLocale(locale) {
  if (typeof locale !== "string") {
    if (!(locale instanceof Intl.Locale)) {
      throw new TypeError("Locale must be a string or an Intl.Locale");
    }
    locale = locale.toString();
  }
  let result = cache.get(locale);
  if (result === undefined) {
    result = canonicalize(locale);
    if (cache.size >= CACHE_SIZE) cache.clear();
    cache.set(locale, result);
  }
  return result;
}

function canonicalize(locale) {
  tables ??= createTables();
  let tag = locale.toLowerCase().replaceAll("_", "-");
  tag = LEGACY.get(tag) ?? tag;
  const subtags = tag.split("-");
  if (subtags[0] === "x" || SCRIPT.test(subtags[0])) subtags.unshift("und");

  const id = parseLanguageId(subtags, 0, true);
  if (id === undefined) throw invalid(locale);
  applyAliases(id);
  let result = formatLanguageId(id);

  const extensions = [];
  let i = id.end;
  while (i < subtags.length && subtags[i] !== "x") {
    const singleton = subtags[i];
    let end = i + 1;
    while (end < subtags.length && EXTENSION_SUBTAG.test(subtags[end])) end++;
    if (
      !SINGLETON.test(singleton) ||
      end === i + 1 ||
      extensions.some(([other]) => other === singleton)
    ) {
      throw invalid(locale);
    }
    const body = subtags.slice(i + 1, end);
    extensions.push([
      singleton,
      singleton === "u"
        ? unicodeExtension(body, locale)
        : singleton === "t"
          ? transformExtension(body, locale)
          : body.join("-"),
    ]);
    i = end;
  }
  extensions.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  for (const [singleton, body] of extensions) result += `-${singleton}-${body}`;

  if (i < subtags.length) {
    const rest = subtags.slice(i + 1);
    if (rest.length === 0 || !rest.every((s) => PRIVATE_SUBTAG.test(s))) {
      throw invalid(locale);
    }
    result += `-x-${rest.join("-")}`;
  }
  return result;
}

function invalid(locale) {
  return new RangeError(`Invalid locale: ${locale}`);
}

function parseLanguageId(subtags, start, allowExtlang) {
  let i = start;
  let language = subtags[i++];
  if (language === undefined || !LANGUAGE.test(language)) return undefined;
  // BCP 47: an extended language replaces its prefix, "zh-yue" → "yue"
  if (allowExtlang && language.length < 4 && EXTLANG.test(subtags[i] ?? "")) {
    language = subtags[i++];
  }
  const id = {
    language: language === "und" ? "" : language,
    script: "",
    region: "",
    variants: [],
    end: 0,
  };
  if (i < subtags.length && SCRIPT.test(subtags[i])) id.script = subtags[i++];
  if (i < subtags.length && REGION.test(subtags[i])) id.region = subtags[i++];
  while (i < subtags.length && VARIANT.test(subtags[i])) {
    if (id.variants.includes(subtags[i])) return undefined;
    id.variants.push(subtags[i++]);
  }
  id.variants.sort();
  id.end = i;
  return id;
}

function formatLanguageId({ language, script, region, variants }) {
  let result = language || "und";
  if (script) result += `-${script[0].toUpperCase()}${script.slice(1)}`;
  if (region) result += `-${region.toUpperCase()}`;
  for (const variant of variants) result += `-${variant}`;
  return result;
}

function createTables() {
  const table = ([keys, values]) => {
    const replacements = values.split("\t");
    return new Map(keys.split("\t").map((key, i) => [key, replacements[i]]));
  };
  const fields = (encoded) => {
    const [language, script, region, ...variants] = encoded.split("-");
    return { language, script, region, variants };
  };
  return {
    complex: COMPLEX_RULES.map(([type, replacement]) => [
      fields(type),
      fields(replacement),
    ]),
    languages: table(LANGUAGES),
    scripts: table(SCRIPTS),
    regions: table(REGIONS),
    variants: table(VARIANTS),
    fields,
  };
}

function applyAliases(id) {
  const { complex, languages, scripts, regions, variants, fields } = tables;
  // Each rule removes what it matched, so the loop ends; the bound is a guard
  for (let round = 0; round < 20; round++) {
    let type;
    let replacement;
    const rule = complex.find(
      ([{ language, script, region, variants }]) =>
        (!language || language === id.language) &&
        (!script || script === id.script) &&
        (!region || region === id.region) &&
        variants.every((variant) => id.variants.includes(variant)),
    );
    if (rule !== undefined) {
      [type, replacement] = rule;
    } else if ((replacement = languages.get(id.language)) !== undefined) {
      type = { language: id.language, script: "", region: "", variants: [] };
      replacement = fields(replacement);
    } else if ((replacement = scripts.get(id.script)) !== undefined) {
      type = { language: "", script: id.script, region: "", variants: [] };
      replacement = fields(replacement);
    } else if ((replacement = regions.get(id.region)) !== undefined) {
      type = { language: "", script: "", region: id.region, variants: [] };
      replacement = fields(likelyRegion(id, replacement.split(" ")));
    } else {
      const variant = id.variants.find((variant) => variants.has(variant));
      if (variant === undefined) return;
      type = { language: "", script: "", region: "", variants: [variant] };
      replacement = fields(variants.get(variant));
    }

    for (const field of ["language", "script", "region"]) {
      if (type[field] || !id[field]) id[field] = replacement[field];
    }
    if (type.variants.length > 0) {
      id.variants = [
        ...new Set([
          ...id.variants.filter((variant) => !type.variants.includes(variant)),
          ...replacement.variants,
        ]),
      ].sort();
    } else if (id.variants.length === 0) {
      id.variants = replacement.variants;
    }
  }
}

// A region that was split up becomes the likely one of its successors
function likelyRegion({ language, script }, replacements) {
  if (replacements.length === 1) return replacements[0];
  language ||= "und";
  const likely =
    LIKELY_REGIONS.get(`${language}-${script}`) ?? LIKELY_REGIONS.get(language);
  return (
    replacements.find((encoded) => encoded === `--${likely}`) ?? replacements[0]
  );
}

function unicodeExtension(subtags, locale) {
  let i = 0;
  while (i < subtags.length && !KEY.test(subtags[i])) {
    if (!TYPE_SUBTAG.test(subtags[i])) throw invalid(locale);
    i++;
  }
  const attributes = [...new Set(subtags.slice(0, i))].sort();
  const keywords = new Map();
  while (i < subtags.length) {
    const key = subtags[i++];
    const start = i;
    while (i < subtags.length && !KEY.test(subtags[i])) {
      if (!TYPE_SUBTAG.test(subtags[i])) throw invalid(locale);
      i++;
    }
    if (keywords.has(key)) continue;
    let value = subtags.slice(start, i).join("-");
    value = EXTENSION_TYPES.get(`${key} ${value}`) ?? value;
    if (key === "sd" || key === "rg") value = SUBDIVISIONS.get(value) ?? value;
    keywords.set(key, value === "true" ? "" : value);
  }
  return [
    ...attributes,
    ...[...keywords]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([key, value]) => (value ? `${key}-${value}` : key)),
  ].join("-");
}

function transformExtension(subtags, locale) {
  let result = [];
  let i = 0;
  if (!TKEY.test(subtags[0])) {
    const id = parseLanguageId(subtags, 0, false);
    if (id === undefined) throw invalid(locale);
    applyAliases(id);
    result = [formatLanguageId(id).toLowerCase()];
    i = id.end;
  }
  const fields = new Map();
  while (i < subtags.length) {
    const key = subtags[i++];
    const start = i;
    while (i < subtags.length && TYPE_SUBTAG.test(subtags[i])) i++;
    if (!TKEY.test(key) || i === start || fields.has(key)) {
      throw invalid(locale);
    }
    const value = subtags.slice(start, i).join("-");
    fields.set(key, EXTENSION_TYPES.get(`${key} ${value}`) ?? value);
  }
  for (const [key, value] of [...fields].sort((a, b) => (a[0] < b[0] ? -1 : 1)))
    result.push(key, value);
  return result.join("-");
}

export default /* @__PURE__ */ Object.assign(canonicalizeLocale, {
  canonicalizeLocale,
  VERSION,
});
