import * as cldr from "@internal/build/sources/cldr";

export const VERSION = await cldr.version();

const { scriptMetadata } = await cldr.json("cldr-core", "scriptMetadata.json");
const { scriptVariants } = (
  await cldr.json("cldr-core", "supplemental/scriptData.json")
).supplemental.scriptData;
const { languageData } = (
  await cldr.json("cldr-core", "supplemental/languageData.json")
).supplemental;

const values = (field, names) => (value) => {
  if (!(value in names)) throw new Error(`Unsupported ${field}: ${value}`);
  return names[value];
};
const flag = values("flag", { YES: true, NO: false, UNKNOWN: null });
const shaping = values("shapingReq", {
  YES: "required",
  MIN: "minimal",
  NO: "none",
  UNKNOWN: null,
});
// Script → [sample character, has case, needs an input method, breaks
// between letters, shaping]; null where unknown
export const SCRIPTS = new Map(
  Object.entries(scriptMetadata)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([script, info]) => [
      script,
      [
        info.sampleChar,
        flag(info.hasCase),
        flag(info.ime),
        flag(info.lbLetters),
        shaping(info.shapingReq),
      ],
    ]),
);

// A script that combines, is a subset of or is a style of other scripts
export const BASE_SCRIPTS = new Map(
  Object.values(scriptVariants).flatMap((variants) =>
    Object.entries(variants).map(([script, { _base }]) => [script, _base]),
  ),
);

const SECONDARY = "-alt-secondary";
const languageScripts = new Map();
for (const [key, { _scripts }] of Object.entries(languageData)) {
  if (_scripts === undefined) continue;
  const language = key.replace(SECONDARY, "");
  if (!languageScripts.has(language)) languageScripts.set(language, [[], []]);
  languageScripts.get(language)[key === language ? 0 : 1] = _scripts;
}
// Tab-separated and parallel; a language's scripts are "primary|secondary",
// each space-separated
export const LANGUAGES = [...languageScripts.keys()].join("\t");
export const LANGUAGE_SCRIPTS = [...languageScripts.values()]
  .map(([primary, secondary]) => `${primary.join(" ")}|${secondary.join(" ")}`)
  .join("\t");
