import { assertString } from "@internal/helpers/assert";
import { LANGUAGES, STATUSES, VERSION } from "#generated";

export { VERSION };

const OFFICIAL_REGIONAL = 2;

/**
 * Lists the languages spoken in a region, most spoken first
 * @param {string} region - ISO 3166 code
 * @returns {RegionLanguage[]}
 */
export function getRegionLanguages(region) {
  return languagesOf(region).map(([language, populationPercent, status]) => {
    const result = { language, populationPercent };
    if (status !== -1) result.officialStatus = STATUSES[status];
    return result;
  });
}

/**
 * Lists the official languages of a region, most spoken first
 * @param {string} region - ISO 3166 code
 * @param {object} [options]
 * @param {boolean} [options.regional] - Also the languages that are official
 *   in part of the region only
 * @returns {string[]} Language tags, e.g. ["de", "fr", "it"] for "CH"
 */
export function getOfficialLanguages(region, { regional = false } = {}) {
  return languagesOf(region)
    .filter(
      ([, , status]) =>
        status !== -1 && (regional || status !== OFFICIAL_REGIONAL),
    )
    .map(([language]) => language);
}

function languagesOf(region) {
  assertString(region);
  return LANGUAGES[region.toUpperCase()] ?? [];
}

export default /* @__PURE__ */ Object.assign(getRegionLanguages, {
  getRegionLanguages,
  getOfficialLanguages,
  VERSION,
});

/**
 * @typedef {object} RegionLanguage
 * @property {string} language Language tag, e.g. "fr" or "zh-Hant"
 * @property {number} populationPercent Share of the population that uses it
 * @property {"official" | "de_facto_official" | "official_regional"} [officialStatus]
 */
