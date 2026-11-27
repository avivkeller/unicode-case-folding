import * as cldr from "@internal/build/sources/cldr";

export const VERSION = await cldr.version();

const { territoryInfo } = (
  await cldr.json("cldr-core", "supplemental/territoryInfo.json")
).supplemental;

export const STATUSES = ["official", "de_facto_official", "official_regional"];

// Region → [tag, population %, index in STATUSES or -1], most spoken first
export const LANGUAGES = Object.fromEntries(
  Object.entries(territoryInfo)
    .filter(([region, info]) => region !== "ZZ" && info.languagePopulation)
    .map(([region, info]) => [
      region,
      Object.entries(info.languagePopulation)
        .map(([language, data]) => [
          language.replaceAll("_", "-"),
          Number(data._populationPercent),
          STATUSES.indexOf(data._officialStatus),
        ])
        .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)),
    ]),
);
