import { assertString } from "@internal/helpers/assert";
import { IANA_INDEX, VERSION, WINDOWS_INDEX, WINDOWS_ZONES } from "#generated";

export { VERSION };

/**
 * Returns the IANA time zone for a Windows time zone, case-insensitively
 * @param {string} windowsZone
 * @param {object} [options]
 * @param {string} [options.region] - ISO 3166 code
 * @returns {string | undefined}
 */
export function windowsToIana(windowsZone, { region } = {}) {
  assertString(windowsZone);
  const regions = regionsOf(windowsZone);
  if (!regions) return undefined;
  const regional =
    region === undefined ? undefined : regions[region.toUpperCase()];
  return (regional ?? regions["001"])[0];
}

/**
 * Returns all IANA time zones for a Windows time zone in a region
 * @param {string} windowsZone
 * @param {string} region - ISO 3166 code, or "001" for the default
 * @returns {string[]}
 */
export function windowsToIanaZones(windowsZone, region) {
  assertString(windowsZone);
  assertString(region);
  return [...(regionsOf(windowsZone)?.[region.toUpperCase()] ?? [])];
}

/**
 * Returns the Windows time zone for an IANA time zone or alias
 * @param {string} ianaZone
 * @returns {string | undefined}
 */
export function ianaToWindows(ianaZone) {
  assertString(ianaZone);
  return WINDOWS_ZONES[IANA_INDEX.get(ianaZone.toLowerCase())]?.[0];
}

/**
 * Lists the Windows time zone names
 * @returns {string[]}
 */
export function getWindowsZones() {
  return WINDOWS_ZONES.map(([name]) => name);
}

function regionsOf(windowsZone) {
  return WINDOWS_ZONES[WINDOWS_INDEX.get(windowsZone.toLowerCase())]?.[1];
}

export default {
  windowsToIana,
  windowsToIanaZones,
  ianaToWindows,
  getWindowsZones,
  VERSION,
};
