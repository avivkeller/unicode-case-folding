import * as cldr from "@internal/build/sources/cldr";

export const VERSION = await cldr.version();

const { weekData } = (
  await cldr.json("cldr-core", "supplemental/weekData.json")
).supplemental;
const likelySubtags = await cldr.likelySubtags();

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const day = (name) => DAYS.indexOf(name) + 1; // 1 is Monday, 7 is Sunday

const weekOf = (region) => [
  day(weekData.firstDay[region] ?? weekData.firstDay["001"]),
  Number(weekData.minDays[region] ?? weekData.minDays["001"]),
  day(weekData.weekendStart[region] ?? weekData.weekendStart["001"]),
  day(weekData.weekendEnd[region] ?? weekData.weekendEnd["001"]),
];

export const DEFAULT_WEEK = weekOf("001");

export const REGION_WEEKS = new Map();
const regions = new Set(
  ["firstDay", "minDays", "weekendStart", "weekendEnd"].flatMap((field) =>
    Object.keys(weekData[field]),
  ),
);
for (const region of [...regions].sort()) {
  const week = weekOf(region);
  if (week.join() !== DEFAULT_WEEK.join()) REGION_WEEKS.set(region, week);
}

const { availableLocales } = await cldr.json(
  "cldr-core",
  "availableLocales.json",
);
const cldrLanguages = new Set(
  availableLocales.full.map((locale) => locale.split("-")[0]),
);

// Only languages with CLDR data; template.mjs asks the engine about others
export const LIKELY_REGIONS = new Map();
for (const [from, to] of Object.entries(likelySubtags)) {
  if (!/^[a-z]{2,3}(?:-[A-Z][a-z]{3})?$/.test(from)) continue;
  if (!cldrLanguages.has(from.split("-")[0])) continue;
  const region = to.split("-")[2];
  if (REGION_WEEKS.has(region)) LIKELY_REGIONS.set(from, region);
}

export const CLDR_LANGUAGES = cldrLanguages;
