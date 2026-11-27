import * as cldr from "@internal/build/sources/cldr";

export const VERSION = await cldr.version();

const { paradigmLocales, matchVariables, languageMatch } = (
  await cldr.json("cldr-core", "supplemental/languageMatching.json")
).supplemental.languageMatching["written-new"];
const { territoryContainment } = (
  await cldr.json("cldr-core", "supplemental/territoryContainment.json")
).supplemental;
const likelySubtags = await cldr.likelySubtags();

const rules = languageMatch.map((rule) => ({
  desired: rule._desired.split("-"),
  supported: rule._supported.split("-"),
  distance: Number(rule._distance),
  oneway: rule._oneway === true || rule._oneway === "true",
}));
const fallback = (fields) => {
  const rule = rules.find(
    ({ desired, supported }) =>
      desired.length === fields &&
      [...desired, ...supported].every((field) => field === "*"),
  );
  if (rule !== rules.findLast(({ desired }) => desired.length === fields)) {
    throw new Error(`The ${fields}-field default is not the last rule`);
  }
  return rule.distance;
};
export const DEFAULT_LANGUAGE_DISTANCE = fallback(1);
export const DEFAULT_SCRIPT_DISTANCE = fallback(2);
export const DEFAULT_REGION_DISTANCE = fallback(3);

// "desired supported" → distance; the first rule of a pair applies
const pairs = (fields) => {
  const distances = new Map();
  for (const { desired, supported, distance, oneway } of rules) {
    if (desired.length !== fields || desired[0] === "*") continue;
    if ([...desired, ...supported].includes("*")) {
      throw new Error(`Unsupported rule: ${desired} ${supported}`);
    }
    const [from, to] = [desired.join("-"), supported.join("-")];
    if (!distances.has(`${from} ${to}`))
      distances.set(`${from} ${to}`, distance);
    if (!oneway && !distances.has(`${to} ${from}`)) {
      distances.set(`${to} ${from}`, distance);
    }
  }
  return distances;
};
// Desired language → supported language → distance
export const LANGUAGE_DISTANCES = {};
for (const [pair, distance] of pairs(1)) {
  const [desired, supported] = pair.split(" ");
  (LANGUAGE_DISTANCES[desired] ??= {})[supported] = distance;
}
export const SCRIPT_DISTANCES = pairs(2);

const leaves = (region) => {
  const groups = [region, `${region}-status-grouping`]
    .map((key) => territoryContainment[key]?._contains)
    .filter(Boolean);
  return groups.length ? groups.flat().flatMap(leaves) : [region];
};

// A region set is a bit: the match variables, then the regions rules name
const sets = Object.entries(matchVariables).map(([name, { _value }]) => {
  if (!/^[A-Z0-9+]+$/.test(_value)) {
    throw new Error(`Unsupported match variable: ${_value}`);
  }
  return [name.slice(1), new Set(_value.split("+").flatMap(leaves))];
});
const setIndex = (name, regions) => {
  let index = sets.findIndex(([other]) => other === name);
  if (index === -1) index = sets.push([name, new Set(regions)]) - 1;
  return index;
};
// A region field as [bit, 1 if it must be set or 0 if clear], or [] for "*"
const pattern = (field) => {
  if (field === "*") return [];
  if (field.startsWith("$!")) return [setIndex(field.slice(2)), 0];
  if (field.startsWith("$")) return [setIndex(field.slice(1)), 1];
  return [setIndex(field, leaves(field)), 1];
};

// Language → [script or "*", desired pattern, supported pattern, distance,
// one-way] in the order of the rules
export const REGION_RULES = {};
for (const { desired, supported, distance, oneway } of rules) {
  if (desired.length !== 3 || desired[0] === "*") continue;
  const [language, script] = desired;
  if (language !== supported[0] || script !== supported[1]) {
    throw new Error(`Unsupported rule: ${desired} ${supported}`);
  }
  (REGION_RULES[language] ??= []).push([
    script,
    pattern(desired[2]),
    pattern(supported[2]),
    distance,
    oneway,
  ]);
}

const mask = (region) =>
  sets.reduce((bits, [, regions], i) => bits | (regions.has(region) << i), 0);
// Region → the masks of the regions it has, where not just 0
export const REGION_PARTITIONS = new Map();
const regions = new Set(
  Object.entries(territoryContainment).flatMap(([key, { _contains }]) => [
    key.split("-")[0],
    ..._contains,
  ]),
);
for (const region of [...regions].sort()) {
  const masks = [...new Set(leaves(region).map(mask))].sort((a, b) => a - b);
  if (masks.join() !== "0") REGION_PARTITIONS.set(region, masks);
}

export const PARADIGM_LOCALES = paradigmLocales._locales.map((locale) => {
  const [language, region] = locale.split("-");
  const [, script, likelyRegion] = likelySubtags[language].split("-");
  return `${language}-${script}-${region ?? likelyRegion}`;
});
