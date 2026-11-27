import * as cldr from "@internal/build/sources/cldr";

export const VERSION = await cldr.version();

const { parentLocale } = (
  await cldr.json("cldr-core", "supplemental/parentLocales.json")
).supplemental.parentLocales;
const likelySubtags = await cldr.likelySubtags();

// "und" is the root locale
export const PARENTS = new Map(Object.entries(parentLocale));

const DEFAULT_SCRIPT = "Latn";
const languageScripts = new Map();
for (const [from, to] of Object.entries(likelySubtags)) {
  if (/^[a-z]{2,3}$/.test(from) && from !== "und") {
    languageScripts.set(from, to.split("-")[1]);
  }
}

// Script → the languages it is likely for, space-separated; not Latin's
export const LIKELY_SCRIPTS = {};
for (const [language, script] of languageScripts) {
  if (script === DEFAULT_SCRIPT) continue;
  LIKELY_SCRIPTS[script] = `${LIKELY_SCRIPTS[script] ?? ""} ${language}`.trim();
}

// "language-region" → its likely script, where not that of the language
export const REGION_SCRIPTS = new Map();
for (const [from, to] of Object.entries(likelySubtags)) {
  if (!/^[a-z]{2,3}-(?:[A-Z]{2}|\d{3})$/.test(from)) continue;
  const [language, script] = to.split("-");
  if (from.startsWith("und-") || language !== from.split("-")[0]) continue;
  if (script !== (languageScripts.get(language) ?? DEFAULT_SCRIPT)) {
    REGION_SCRIPTS.set(from, script);
  }
}
