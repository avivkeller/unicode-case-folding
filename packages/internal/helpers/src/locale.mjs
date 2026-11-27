/**
 * @template T
 * @typedef {object} LocaleTable
 * @property {T[]} values
 * @property {Map<string, number>} locales - Locale → index in values
 * @property {Map<string, string>} aliases
 */

// Intl.Locale is slow to construct; the size cap is for tags from user input
const normalized = new Map();

/** "zh-hant-tw-u-nu-hanidec" → "zh-Hant-TW" */
export function normalizeLocale(locale) {
  if (typeof locale !== "string") return new Intl.Locale(locale).baseName;
  let tag = normalized.get(locale);
  if (tag === undefined) {
    if (normalized.size >= 1000) normalized.clear();
    tag = new Intl.Locale(locale).baseName;
    normalized.set(locale, tag);
  }
  return tag;
}

export function resolveLocale(table, locale) {
  let tag = normalizeLocale(locale);
  while (!table.locales.has(tag)) {
    const dash = tag.lastIndexOf("-");
    tag = table.aliases.get(tag) ?? (dash === -1 ? "und" : tag.slice(0, dash));
  }
  return tag;
}

/**
 * @template T
 * @param {LocaleTable<T>} table
 * @returns {T}
 */
export function lookupLocale(table, locale) {
  return table.values[table.locales.get(resolveLocale(table, locale))];
}

export function unicodeKeywords(tag) {
  const keywords = new Map();
  const subtags = tag.split("-x-")[0].split("-");
  let i = subtags.indexOf("u") + 1;
  if (i === 0) return keywords;
  // Keys have two letters; a one-letter subtag starts the next extension
  while (i < subtags.length && subtags[i].length > 1) {
    const key = subtags[i++];
    const value = [];
    while (i < subtags.length && subtags[i].length > 2) {
      value.push(subtags[i++]);
    }
    if (key.length === 2) keywords.set(key, value.join("-"));
  }
  return keywords;
}

export function encodeLocaleTable(byLocale, likelySubtags) {
  if (!byLocale.has("und")) throw new Error('Locale data has no "und"');
  const values = [];
  const indexes = new Map();
  const locales = new Map();
  for (const [locale, value] of byLocale) {
    const key = JSON.stringify(value);
    if (!indexes.has(key)) indexes.set(key, values.push(value) - 1);
    locales.set(locale, indexes.get(key));
  }
  const index = (table, locale) =>
    table.locales.get(resolveLocale(table, locale));

  // Without an alias, "zh-TW" would fall back to "zh" (Simplified Chinese)
  const aliases = new Map();
  const full = { values, locales, aliases };
  for (const [from, to] of Object.entries(likelySubtags)) {
    const isLanguageRegion = /^[a-z]{2,3}-(?:[A-Z]{2}|\d{3})$/.test(from);
    if (
      isLanguageRegion &&
      !from.startsWith("und-") &&
      index(full, from) !== index(full, to)
    ) {
      aliases.set(from, to);
    }
  }

  // Parents first: each locale is compared with what is left of its ancestors
  const table = {
    values,
    locales: new Map([["und", locales.get("und")]]),
    aliases,
  };
  const byDepth = [...locales.keys()].sort(
    (a, b) => a.split("-").length - b.split("-").length || a.localeCompare(b),
  );
  for (const locale of byDepth) {
    if (index(table, locale) !== locales.get(locale)) {
      table.locales.set(locale, locales.get(locale));
    }
  }
  for (const [from, to] of [...aliases]) {
    aliases.delete(from);
    if (index(table, from) !== index(table, to)) aliases.set(from, to);
  }
  return table;
}
