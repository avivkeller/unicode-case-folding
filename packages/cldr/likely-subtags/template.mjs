import { assertOption } from "@internal/helpers/assert";
import { LIKELY, TAGS, VERSION } from "#generated";

export { VERSION };

const CACHE_SIZE = 1000;
const FAVORS = ["region", "script"];

let likelySubtags;
const parsed = new Map();

/**
 * Adds the likely script and region of a locale, e.g. "zh-TW" → "zh-Hant-TW"
 * @param {string | Intl.Locale} locale
 * @returns {string} The locale as a BCP 47 language tag
 */
export function maximize(locale) {
  const { language, script, region, rest } = parse(locale);
  return join(addLikely(language, script, region)) + rest;
}

/**
 * Returns the subtags of a locale after maximize(), e.g. for "zh-TW":
 * { language: "zh", script: "Hant", region: "TW" }
 * @param {string | Intl.Locale} locale
 * @returns {LikelySubtags}
 */
export function getLikelySubtags(locale) {
  const parts = parse(locale);
  const [language, script, region] = addLikely(
    parts.language,
    parts.script,
    parts.region,
  );
  return { language, script, region };
}

/**
 * Removes the script and region that maximize() would add back,
 * e.g. "zh-Hant-TW" → "zh-TW"
 * @param {string | Intl.Locale} locale
 * @param {{ favor?: "region" | "script" }} [options] - Which to keep when only one can be removed; "region" by default
 * @returns {string} The locale as a BCP 47 language tag
 */
export function minimize(locale, { favor = "region" } = {}) {
  assertOption("favor", favor, FAVORS);
  const { language, script, region, rest } = parse(locale);
  const full = addLikely(language, script, region);
  const maximized = join(full);
  const withRegion = [full[0], undefined, full[2]];
  const withScript = [full[0], full[1]];
  for (const trial of [
    [full[0]],
    ...(favor === "region"
      ? [withRegion, withScript]
      : [withScript, withRegion]),
  ]) {
    if (join(addLikely(...trial)) === maximized) return join(trial) + rest;
  }
  return maximized + rest;
}

function addLikely(language, script, region) {
  if (script && region && language !== "und") {
    return [language, script, region];
  }
  likelySubtags ??= createTable();
  const match = lookup(language, script, region);
  if (match === undefined) return [language, script, region];
  const [likelyLanguage, likelyScript, likelyRegion] = match.split("-");
  return [
    language === "und" ? likelyLanguage : language,
    script ?? likelyScript,
    region ?? likelyRegion,
  ];
}

function createTable() {
  const likely = LIKELY.split("\t");
  return new Map(TAGS.split("\t").map((tag, i) => [tag, likely[i]]));
}

function lookup(language, script, region) {
  return (
    (script &&
      region &&
      likelySubtags.get(`${language}-${script}-${region}`)) ||
    (script && likelySubtags.get(`${language}-${script}`)) ||
    (region && likelySubtags.get(`${language}-${region}`)) ||
    likelySubtags.get(language)
  );
}

function join(subtags) {
  return subtags.filter(Boolean).join("-");
}

function parse(locale) {
  const key = typeof locale === "string" ? locale : undefined;
  let result = key === undefined ? undefined : parsed.get(key);
  if (result === undefined) {
    const { language, script, region, baseName } = new Intl.Locale(locale);
    const subtags = join([language, script, region]);
    const tag = new Intl.Locale(locale).toString();
    result = {
      language,
      script: script === "Zzzz" ? undefined : script,
      region: region === "ZZ" ? undefined : region,
      // Variants and extensions
      rest: baseName.slice(subtags.length) + tag.slice(baseName.length),
    };
    if (key !== undefined) {
      if (parsed.size >= CACHE_SIZE) parsed.clear();
      parsed.set(key, result);
    }
  }
  return result;
}

export default /* @__PURE__ */ Object.assign(maximize, {
  maximize,
  getLikelySubtags,
  minimize,
  VERSION,
});

/**
 * @typedef {object} LikelySubtags
 * @property {string} language "und" if unknown
 * @property {string} [script] Missing if nothing is likely
 * @property {string} [region] Missing if nothing is likely
 */
