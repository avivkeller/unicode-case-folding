import * as cldr from "@internal/build/sources/cldr";

export const VERSION = await cldr.version();

const { alias } = (await cldr.json("cldr-core", "supplemental/aliases.json"))
  .supplemental.metadata;
const likelySubtags = await cldr.likelySubtags();

const LANGUAGE = /^(?:[a-z]{2,3}|[a-z]{5,8})$/;
const SCRIPT = /^[a-z]{4}$/;
const REGION = /^(?:[a-z]{2}|\d{3})$/;
const VARIANT = /^(?:[a-z0-9]{5,8}|\d[a-z0-9]{3})$/;

// [language, script, region, variants], or undefined if not a languageId
function parse(tag) {
  const subtags = tag.toLowerCase().split("-");
  let i = 0;
  if (!LANGUAGE.test(subtags[i])) return undefined;
  const language = subtags[i++] === "und" ? "" : subtags[i - 1];
  const script = SCRIPT.test(subtags[i]) ? subtags[i++] : "";
  const region = REGION.test(subtags[i]) ? subtags[i++] : "";
  const variants = subtags.slice(i);
  if (!variants.every((variant) => VARIANT.test(variant))) return undefined;
  return [language, script, region, variants.sort()];
}

const rules = [];
// Types that are not languageIds replace a whole tag
export const LEGACY = new Map();
const addRule = (type, replacement) => {
  const parsed = parse(type);
  if (parsed !== undefined) {
    rules.push([parsed, replacement.split(" ").map(parse)]);
  }
  return parsed !== undefined;
};
for (const [type, { _replacement }] of Object.entries(alias.languageAlias)) {
  if (!addRule(type, _replacement)) {
    LEGACY.set(type.toLowerCase(), _replacement.toLowerCase());
  }
}
for (const field of ["scriptAlias", "territoryAlias", "variantAlias"]) {
  for (const [type, { _replacement }] of Object.entries(alias[field])) {
    addRule(
      `und-${type}`,
      _replacement
        .split(" ")
        .map((value) => `und-${value}`)
        .join(" "),
    );
  }
}

const count = ([language, script, region, variants]) =>
  (language ? 1 : 0) + (script ? 1 : 0) + (region ? 1 : 0) + variants.length;
const key = ([language, script, region, variants]) => [
  language,
  script,
  region,
  variants.join("-"),
];
rules.sort(([a], [b]) => {
  if (count(a) !== count(b)) return count(b) - count(a);
  const [aKey, bKey] = [key(a), key(b)];
  for (let i = 0; i < 4; i++) {
    if (!aKey[i] !== !bKey[i]) return aKey[i] ? -1 : 1;
  }
  for (let i = 0; i < 4; i++) {
    if (aKey[i] !== bKey[i]) return aKey[i] < bKey[i] ? -1 : 1;
  }
  return 0;
});

const single = (index) =>
  rules.filter(([type]) => count(type) === 1 && type[index].length > 0);
// A replacement as "language-script-region-variants", fields possibly empty
const encode = ([language, script, region, variants]) =>
  [language, script, region, ...variants].join("-");
const table = (index, keyOf = (type) => type[index]) => {
  const entries = single(index);
  return [
    entries.map(([type]) => keyOf(type)).join("\t"),
    entries
      .map(([, replacements]) => replacements.map(encode).join(" "))
      .join("\t"),
  ];
};

// [keys, replacements]: tab-separated and parallel
export const LANGUAGES = table(0);
export const SCRIPTS = table(1);
export const REGIONS = table(2);
export const VARIANTS = table(3, (type) => type[3][0]);

// Sorted as UTS #35 orders the alias rules; all precede the one-field rules
export const COMPLEX_RULES = rules
  .filter(([type]) => count(type) > 1)
  .map(([type, [replacement]]) => [encode(type), encode(replacement)]);

// The likely region of "language" or "language-script" where it is a successor
// of a region that was split up; "" hides the entry of the language alone
const successors = new Set(
  single(2)
    .filter(([, replacements]) => replacements.length > 1)
    .flatMap(([, replacements]) => replacements.map(([, , region]) => region)),
);
export const LIKELY_REGIONS = new Map();
for (const [from, to] of Object.entries(likelySubtags)) {
  if (!/^[a-z]{2,3}(?:-[A-Z][a-z]{3})?$/.test(from)) continue;
  const region = to.split("-")[2].toLowerCase();
  const [language, script] = from.toLowerCase().split("-");
  if (successors.has(region)) {
    LIKELY_REGIONS.set(from.toLowerCase(), region);
  } else if (script !== undefined) {
    const alone = likelySubtags[language]?.split("-")[2].toLowerCase();
    if (successors.has(alone)) LIKELY_REGIONS.set(from.toLowerCase(), "");
  }
}

const TYPE = /^[a-z0-9]{3,8}(?:-[a-z0-9]{3,8})*$/;
// "key value" → canonical value, for the keys of the -u- and -t- extensions
export const EXTENSION_TYPES = new Map();
for (const file of [
  "calendar",
  "collation",
  "currency",
  "measure",
  "number",
  "segmentation",
  "timezone",
  "transform",
  "transform-destination",
  "transform_hybrid",
  "transform_ime",
  "transform_keyboard",
  "transform_mt",
  "transform_private_use",
  "variant",
]) {
  const { keyword } = await cldr.json("cldr-bcp47", `bcp47/${file}.json`);
  for (const keys of Object.values(keyword)) {
    for (const [key, types] of Object.entries(keys)) {
      for (const [name, type] of Object.entries(types)) {
        if (name.startsWith("_")) continue;
        const canonical = type._preferred ?? name;
        if (canonical !== name)
          EXTENSION_TYPES.set(`${key} ${name}`, canonical);
        for (const other of (type._alias ?? "").toLowerCase().split(" ")) {
          if (TYPE.test(other) && other !== canonical) {
            EXTENSION_TYPES.set(`${key} ${other}`, canonical);
          }
        }
      }
    }
  }
}

export const SUBDIVISIONS = new Map(
  Object.entries(alias.subdivisionAlias).map(([type, { _replacement }]) => {
    const [replacement] = _replacement.split(" ");
    return [
      type,
      /^[A-Z]{2}$/.test(replacement)
        ? `${replacement.toLowerCase()}zzzz`
        : replacement,
    ];
  }),
);
