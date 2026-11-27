import * as cldr from "@internal/build/sources/cldr";

export const VERSION = await cldr.version();

const { calendarPreferenceData } = (
  await cldr.json("cldr-core", "supplemental/calendarPreferenceData.json")
).supplemental;
const { ca } = (await cldr.json("cldr-bcp47", "bcp47/calendar.json")).keyword.u;
const likelySubtags = await cldr.likelySubtags();

// The data has CLDR names ("gregorian"); locales have identifiers ("gregory")
const identifiers = new Map();
for (const [identifier, { _alias, _deprecated }] of Object.entries(ca)) {
  if (identifier.startsWith("_") || _deprecated) continue;
  identifiers.set(identifier, identifier);
  if (_alias) identifiers.set(_alias, identifier);
}

function calendarsOf(names) {
  return names
    .map((name) => {
      if (!identifiers.has(name)) throw new Error(`Unknown calendar: ${name}`);
      return identifiers.get(name);
    })
    .join(" ");
}

export const DEFAULT_CALENDARS = calendarsOf(calendarPreferenceData["001"]);

export const REGION_CALENDARS = new Map(
  Object.entries(calendarPreferenceData)
    .filter(([region]) => region !== "001")
    .map(([region, names]) => [region, calendarsOf(names)])
    .sort(([a], [b]) => (a < b ? -1 : 1)),
);

export const LIKELY_REGIONS = new Map();
for (const [from, to] of Object.entries(likelySubtags)) {
  if (!/^[a-z]{2,3}(?:-[A-Z][a-z]{3})?$/.test(from)) continue;
  const region = to.split("-")[2];
  if (REGION_CALENDARS.has(region)) LIKELY_REGIONS.set(from, region);
}
