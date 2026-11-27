import * as cldr from "@internal/build/sources/cldr";

export const VERSION = await cldr.version();

const { codeMappings } = (
  await cldr.json("cldr-core", "supplemental/codeMappings.json")
).supplemental;
const { territoryContainment } = (
  await cldr.json("cldr-core", "supplemental/territoryContainment.json")
).supplemental;

const deprecated = new Set(
  Object.entries(territoryContainment)
    .filter(([key]) => key.endsWith("-status-deprecated"))
    .flatMap(([, { _contains }]) => _contains),
);

// The file also has currencies, under three-letter keys
const regions = Object.entries(codeMappings)
  .filter(([code]) => /^[A-Z]{2}$/.test(code))
  .sort(
    ([a], [b]) => deprecated.has(a) - deprecated.has(b) || (a < b ? -1 : 1),
  );

// Deprecated regions come last: MM wins over BU for "104"
export const ALPHA2 = regions.map(([code]) => code);
export const ALPHA3 = regions.map(([, codes]) => codes._alpha3 ?? "");
export const NUMERIC = regions.map(([, codes]) => codes._numeric ?? "");
