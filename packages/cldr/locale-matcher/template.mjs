import { assertOption } from "@internal/helpers/assert";
import { canonicalizeLocale } from "cldr-canonicalize-locale";
import { getLikelySubtags } from "cldr-likely-subtags";
import {
  DEFAULT_LANGUAGE_DISTANCE,
  DEFAULT_REGION_DISTANCE,
  DEFAULT_SCRIPT_DISTANCE,
  LANGUAGE_DISTANCES,
  PARADIGM_LOCALES,
  REGION_PARTITIONS,
  REGION_RULES,
  SCRIPT_DISTANCES,
  VERSION,
} from "#generated";

export { VERSION };

const CACHE_SIZE = 2000;
const FAVORS = ["language", "script"];
// Distances are compared in eighths, to rank equal distances by which
// subtags the two locales spelled out
const SHIFT = 3;
const EXPLICIT_LANGUAGE = 4;
const EXPLICIT_SCRIPT = 2;
const EXPLICIT_REGION = 1;
const NO_PARTITION = [0];
const PRIVATE_USE = /^x-/i;
const LANGUAGE = /^([a-z]{2,3})((?:[-_].*)?)$/i;
const SCRIPT = /^[A-Z][a-z]{3}$/;
const REGION = /^(?:[A-Z]{2}|\d{3})$/;
// Pseudolocales only match themselves: their language and script get a prefix
const PSEUDO_REGIONS = { XA: "'", XB: '"', XC: "," };
const PSEUDO_VARIANTS = { psaccent: "XA", psbidi: "XB", pscrack: "XC" };

const maximized = new Map();
const likely = new Map();
let demotion;

/**
 * Returns the supported locale that best fits a user's preferred locales
 * @template {string | Intl.Locale} T
 * @param {string | Intl.Locale | Iterable<string | Intl.Locale>} desired - Most preferred first
 * @param {Iterable<T>} supported
 * @param {MatchOptions} [options]
 * @returns {T | string | Intl.Locale | undefined} The default locale if none is close enough; undefined if there is none either
 */
export function matchLocale(desired, supported, options = {}) {
  const list = [...supported];
  const match = findMatch(desired, list, options);
  return match === undefined
    ? (options.defaultLocale ?? list[0])
    : match.supported;
}

/**
 * Returns the best pair of a preferred and a supported locale, and how far apart they are
 * @template {string | Intl.Locale} T
 * @param {string | Intl.Locale | Iterable<string | Intl.Locale>} desired - Most preferred first
 * @param {Iterable<T>} supported
 * @param {MatchOptions} [options]
 * @returns {{ supported: T, desired: string | Intl.Locale, distance: number } | undefined} undefined if no supported locale is close enough
 */
export function getBestMatch(desired, supported, options = {}) {
  return findMatch(desired, [...supported], options);
}

function findMatch(desired, supported, options) {
  const { favor = "language", threshold = DEFAULT_SCRIPT_DISTANCE } = options;
  assertOption("favor", favor, FAVORS);
  if (typeof threshold !== "number" || !(threshold >= 0)) {
    throw new RangeError(`Invalid threshold: ${threshold}`);
  }
  const favorScript = favor === "script";
  const candidates = prepare(supported, options);
  const exact = new Map();
  for (const candidate of candidates) {
    if (!exact.has(candidate.lsr.id)) exact.set(candidate.lsr.id, candidate);
  }
  demotion ??=
    scriptRegionDistance(maximize("en-Latn-US"), maximize("en-Latn-GB")) <<
    SHIFT;

  const preferences =
    typeof desired === "string" || desired instanceof Intl.Locale
      ? [desired]
      : desired;
  let best;
  let limit = threshold << SHIFT;
  for (const preference of preferences) {
    const lsr = maximize(preference);
    const same = exact.get(lsr.id);
    if (same !== undefined) {
      return { supported: same.locale, desired: preference, distance: 0 };
    }
    let found;
    for (const candidate of candidates) {
      const other = candidate.lsr;
      let shifted = languageDistance(lsr, other, favorScript) << SHIFT;
      if (shifted > limit) continue;
      shifted += scriptRegionDistance(lsr, other) << SHIFT;
      if (shifted === 0) shifted = lsr.flags ^ other.flags;
      if (
        shifted < limit ||
        (shifted === limit &&
          shifted >= 1 << SHIFT &&
          found !== undefined &&
          isMoreLikely(other, found.lsr))
      ) {
        found = candidate;
        limit = shifted;
        if (shifted === 0) break;
      }
    }
    if (found !== undefined) {
      best = {
        supported: found.locale,
        desired: preference,
        distance: limit >> SHIFT,
      };
    }
    // A later preference has to be closer by more than a region
    limit -= demotion;
    if (limit <= 0) break;
  }
  return best;
}

// The default locale first, then the paradigm locales, then the others:
// the first of equally distant locales is chosen
function prepare(supported, { defaultLocale }) {
  const first =
    defaultLocale === undefined
      ? supported.length > 0 && maximize(supported[0]).tag
      : maximize(defaultLocale).tag;
  const groups = [[], [], []];
  for (const locale of supported) {
    const lsr = maximize(locale);
    groups[lsr.tag === first ? 0 : lsr.paradigm ? 1 : 2].push({ locale, lsr });
  }
  return groups.flat();
}

function maximize(locale) {
  if (typeof locale !== "string") return createLsr(locale.toString());
  let lsr = maximized.get(locale);
  if (lsr === undefined) {
    lsr = createLsr(locale);
    if (maximized.size >= CACHE_SIZE) maximized.clear();
    maximized.set(locale, lsr);
  }
  return lsr;
}

function createLsr(locale) {
  if (PRIVATE_USE.test(locale)) return newLsr(locale.toLowerCase(), "", "", 7);
  const subtags = languageId(locale).split("-");
  let language = subtags[0];
  let i = 1;
  let script = SCRIPT.test(subtags[i]) ? subtags[i++] : "";
  let region = REGION.test(subtags[i]) ? subtags[i++] : "";
  // "und" alone means no language, rather than the most likely one
  if (language === "und" && !script && !region) return newLsr("und", "", "", 7);

  let flags =
    (language === "und" ? 0 : EXPLICIT_LANGUAGE) |
    (script ? EXPLICIT_SCRIPT : 0) |
    (region ? EXPLICIT_REGION : 0);
  let pseudo = PSEUDO_REGIONS[region];
  for (; pseudo === undefined && i < subtags.length; i++) {
    const pseudoRegion = PSEUDO_VARIANTS[subtags[i]];
    if (pseudoRegion !== undefined) {
      pseudo = PSEUDO_REGIONS[pseudoRegion];
      flags =
        EXPLICIT_LANGUAGE | EXPLICIT_SCRIPT | (region ? EXPLICIT_REGION : 0);
      region ||= pseudoRegion;
    }
  }
  if (pseudo !== undefined) {
    return newLsr(pseudo + language, pseudo + script, region, flags);
  }

  if (!script || !region || language === "und") {
    const rest = (script && `-${script}`) + (region && `-${region}`);
    let subtags = getLikelySubtags(language + rest);
    if (language === "und") language = subtags.language;
    // An unknown language gets the script and region likely without it
    if (!subtags.script || !subtags.region) {
      const { script, region } = getLikelySubtags(`und${rest}`);
      subtags = {
        script: subtags.script ?? script,
        region: subtags.region ?? region,
      };
    }
    script = subtags.script ?? "";
    region = subtags.region ?? "";
  }
  return newLsr(language, script, region, flags);
}

// The canonical language, script, region and variants. A language that is
// short for a language and a script or region is kept, as the matching data
// has it: "sh" is not "sr-Latn" here
function languageId(locale) {
  const canonical = canonicalizeLocale(locale).split(/-[a-z0-9]-/)[0];
  const [, primary, rest] = LANGUAGE.exec(locale) ?? [];
  if (
    primary === undefined ||
    canonical.split("-")[0] === primary.toLowerCase() ||
    !canonicalizeLocale(primary).includes("-")
  ) {
    return canonical;
  }
  const others = canonicalizeLocale(`und${rest}`).split(/-[a-z0-9]-/)[0];
  return primary.toLowerCase() + others.slice(3);
}

function newLsr(language, script, region, flags) {
  const tag = `${language}-${script}-${region}`;
  return {
    language,
    script,
    region,
    flags,
    tag,
    id: `${tag}-${flags}`,
    distances: Object.hasOwn(LANGUAGE_DISTANCES, language)
      ? LANGUAGE_DISTANCES[language]
      : undefined,
    paradigm: PARADIGM_LOCALES.includes(tag),
  };
}

function languageDistance(desired, supported, favorScript) {
  if (desired.language === supported.language) return 0;
  const distance =
    desired.distances?.[supported.language] ?? DEFAULT_LANGUAGE_DISTANCE;
  return favorScript ? distance >> 2 : distance;
}

function scriptRegionDistance(desired, supported) {
  let total = 0;
  if (desired.script !== supported.script) {
    total =
      SCRIPT_DISTANCES.get(
        `${desired.language}-${desired.script} ${supported.language}-${supported.script}`,
      ) ?? DEFAULT_SCRIPT_DISTANCE;
  }
  if (desired.region !== supported.region) {
    const rules =
      desired.language === supported.language &&
      desired.script === supported.script
        ? REGION_RULES[desired.language]
        : undefined;
    total +=
      rules === undefined
        ? DEFAULT_REGION_DISTANCE
        : regionDistance(rules, desired, supported.region);
  }
  return total;
}

// A region that spans several sets of regions is as far as the farthest one
function regionDistance(rules, { script, region }, supportedRegion) {
  let farthest = 0;
  for (const from of REGION_PARTITIONS.get(region) ?? NO_PARTITION) {
    for (const to of REGION_PARTITIONS.get(supportedRegion) ?? NO_PARTITION) {
      const rule = rules.find(
        ([ruleScript, desired, supported, , oneway]) =>
          (ruleScript === "*" || ruleScript === script) &&
          ((inPartition(desired, from) && inPartition(supported, to)) ||
            (!oneway &&
              inPartition(desired, to) &&
              inPartition(supported, from))),
      );
      farthest = Math.max(farthest, rule?.[3] ?? DEFAULT_REGION_DISTANCE);
    }
  }
  return farthest;
}

function inPartition([bit, set], partition) {
  return bit === undefined || ((partition >> bit) & 1) === set;
}

// Whether a locale has the likely script or region of its language, when
// the other one does not
function isMoreLikely(lsr, other) {
  if (lsr.language !== other.language) return false;
  if (lsr.script !== other.script) {
    return lsr.script === likelyOf(lsr.language).script;
  }
  return (
    lsr.region !== other.region &&
    lsr.region === likelyOf(`${lsr.language}-${lsr.script}`).region
  );
}

function likelyOf(tag) {
  let subtags = likely.get(tag);
  if (subtags === undefined) {
    try {
      subtags = getLikelySubtags(tag);
    } catch {
      subtags = {};
    }
    likely.set(tag, subtags);
  }
  return subtags;
}

export default /* @__PURE__ */ Object.assign(matchLocale, {
  matchLocale,
  getBestMatch,
  VERSION,
});

/**
 * @typedef {object} MatchOptions
 * @property {string | Intl.Locale} [defaultLocale] What matchLocale() returns if nothing matches; the first supported locale by default
 * @property {number} [threshold] The distance from which a locale no longer matches; 50 by default
 * @property {"language" | "script"} [favor] "script" prefers another language in the same script to the same language in another script; "language" by default
 */
