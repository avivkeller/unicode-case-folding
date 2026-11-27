import { assertString } from "@internal/helpers/assert";
import {
  GOLDEN_ZONES,
  METAZONES,
  PERIODS,
  VERSION,
  ZONES,
  ZONE_INDEX,
} from "#generated";

export { VERSION };

/**
 * Returns the metazone a time zone is in, e.g. "America_Pacific"
 * @param {string} timeZone - IANA time zone or alias, case-insensitive
 * @param {Date} [date] - Defaults to now
 * @returns {string | undefined} undefined if the zone has no metazone then
 */
export function getMetazone(timeZone, date = new Date()) {
  assertString(timeZone);
  const periods = PERIODS[ZONE_INDEX.get(timeZone.toLowerCase())];
  return periods && METAZONES[metazoneAt(periods, toSeconds(date))];
}

/**
 * Lists the time zones that are in a metazone
 * @param {string} metazone - e.g. "Europe_Central"
 * @param {Date} [date] - Defaults to now
 * @returns {string[]} IANA time zones, sorted
 */
export function getMetazoneTimeZones(metazone, date = new Date()) {
  assertString(metazone);
  const index = METAZONES.indexOf(metazone);
  if (index === -1) return [];
  const time = toSeconds(date);
  return ZONES.filter((_, zone) => metazoneAt(PERIODS[zone], time) === index);
}

/**
 * Returns the time zone that stands for a metazone, in general or in a region
 * @param {string} metazone - e.g. "Europe_Central"
 * @param {string} [region] - ISO 3166 code, e.g. "DE" for "Europe/Berlin"
 * @returns {string | undefined} IANA time zone, "Europe/Paris" in general
 */
export function getGoldenZone(metazone, region) {
  assertString(metazone);
  const zones = GOLDEN_ZONES[METAZONES.indexOf(metazone)];
  if (!zones) return undefined;
  if (region === undefined) return zones["001"];
  assertString(region);
  return zones[region.toUpperCase()] ?? zones["001"];
}

/**
 * Lists the metazones
 * @returns {string[]} Sorted
 */
export function getMetazones() {
  return [...METAZONES];
}

function toSeconds(date) {
  const time = date.getTime();
  if (Number.isNaN(time)) throw new RangeError("Invalid date");
  return time / 1000;
}

function metazoneAt(periods, time) {
  for (let i = periods.length - 3; i >= 0; i -= 3) {
    const from = periods[i + 1];
    const to = periods[i + 2];
    if ((from === null || from <= time) && (to === null || time < to)) {
      return periods[i];
    }
  }
  return undefined;
}

export default /* @__PURE__ */ Object.assign(getMetazone, {
  getMetazone,
  getMetazoneTimeZones,
  getGoldenZone,
  getMetazones,
  VERSION,
});
