import * as cldr from "@internal/build/sources/cldr";

export const VERSION = await cldr.version();

const { grammaticalData } = (
  await cldr.json("cldr-core", "supplemental/grammaticalFeatures.json")
).supplemental;

const TARGET = "-targets-nominal";
const FEATURES = [
  "grammaticalCase",
  "grammaticalGender",
  "grammaticalDefiniteness",
];

export const VALUES = [];
const index = (value) => {
  if (!VALUES.includes(value)) VALUES.push(value);
  return VALUES.indexOf(value);
};

// Language → the indexes in VALUES of its cases, genders and definiteness
export const LANGUAGES = new Map();
for (const [key, features] of Object.entries(grammaticalData)) {
  if (!key.endsWith(TARGET)) continue;
  const language = key.slice(0, -TARGET.length);
  if (!/^[a-z]{2,3}$/.test(language)) {
    throw new Error(`Unsupported locale: ${language}`);
  }
  for (const name of Object.keys(features)) {
    if (!FEATURES.includes(name.replace("-scope-units", ""))) {
      throw new Error(`Unsupported feature: ${name}`);
    }
  }
  LANGUAGES.set(
    language,
    FEATURES.map((name) => (features[name] ?? []).map(index)),
  );
}
