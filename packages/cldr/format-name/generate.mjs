import * as cldr from "@internal/build/sources/cldr";
import { encodeLocaleTable } from "@internal/helpers/locale";

export const VERSION = await cldr.version();

// Slot order must match the slot index that template.mjs computes
const ORDERS = ["givenFirst", "surnameFirst"];
const LENGTHS = ["long", "medium", "short"];
const USAGES = ["referring", "addressing", "monogram"];
const FORMALITIES = ["formal", "informal"];

const personNames = await cldr.localeData(
  "cldr-person-names-full",
  "personNames",
);
const likelySubtags = await cldr.likelySubtags();

export const PATTERNS = [];
const patternIndexes = new Map();
const intern = (pattern) => {
  if (!patternIndexes.has(pattern)) {
    patternIndexes.set(pattern, PATTERNS.push(pattern) - 1);
  }
  return patternIndexes.get(pattern);
};

const slot = (patterns, usage, formality) =>
  Object.keys(patterns[usage])
    .filter((key) => key === formality || key.startsWith(`${formality}-alt-`))
    .sort()
    .map((key) => intern(patterns[usage][key]));

const byLocale = new Map();
for (const [locale, data] of personNames) {
  const slots = [];
  for (const order of ORDERS) {
    for (const length of LENGTHS) {
      for (const usage of USAGES) {
        for (const formality of FORMALITIES) {
          slots.push(slot(data.personName[order][length], usage, formality));
        }
      }
    }
  }
  for (const length of LENGTHS) {
    for (const formality of FORMALITIES) {
      slots.push(slot(data.personName.sorting[length], "referring", formality));
    }
  }

  // In the order of the FIELD_* constants in template.mjs
  byLocale.set(locale, [
    data.givenFirst,
    data.surnameFirst,
    data.length,
    data.formality,
    data.nativeSpaceReplacement,
    data.foreignSpaceReplacement,
    data.initial,
    data.initialSequence,
    slots,
  ]);
}

export const PERSON_NAMES = encodeLocaleTable(byLocale, likelySubtags);
