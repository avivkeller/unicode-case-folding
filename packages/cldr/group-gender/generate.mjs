import * as cldr from "@internal/build/sources/cldr";

export const VERSION = await cldr.version();

const { personList } = (
  await cldr.json("cldr-core", "supplemental/gender.json")
).supplemental.gender;

export const DEFAULT_RULE = "neutral";

// Locale → rule, where not the default
export const RULES = new Map(
  Object.entries(personList).filter(([, rule]) => rule !== DEFAULT_RULE),
);
