import * as ucd from "@internal/build/sources/ucd";
import { rangeTable } from "@internal/helpers/tables";

const TYPES_FILE = "HangulSyllableType.txt";
const DATA_FILE = "UnicodeData.txt";

export const VERSION = await ucd.version(TYPES_FILE);

const types = await ucd.values(TYPES_FILE);

const SYLLABLE_BASE = 0xac00;
const SYLLABLE_COUNT = 11172;
for (let i = 0; i < SYLLABLE_COUNT; i++) {
  if (types[SYLLABLE_BASE + i] !== (i % 28 === 0 ? "LV" : "LVT"))
    throw new Error("Hangul syllables are not arithmetic");
}
if (types.filter((type) => type.startsWith("LV")).length !== SYLLABLE_COUNT)
  throw new Error("Hangul syllables outside of their block");

export const JAMO_TYPE_NAMES = ["L", "V", "T"];
// -1 for what is not a conjoining jamo
export const JAMO_TYPES = rangeTable(
  (await ucd.records(TYPES_FILE))
    .filter(([, type]) => JAMO_TYPE_NAMES.includes(type))
    .map(([range, type]) => [
      ...ucd.parseRange(range),
      JAMO_TYPE_NAMES.indexOf(type),
    ]),
  -1,
);

const characters = (await ucd.records(DATA_FILE)).map((fields) => ({
  codePoint: parseInt(fields[0], 16),
  name: fields[1],
  decomposition: fields[5],
}));
const byName = new Map(
  characters.map(({ name, codePoint }) => [name, codePoint]),
);

export const COMPATIBILITY_BASE = 0x3131;
const COMPATIBILITY_END = 0x318e;
const FILLER = 0x3164;

// For each compatibility jamo from COMPATIBILITY_BASE: the conjoining jamo of
// the same letter as an initial, a vowel and a final, or 0
export const COMPATIBILITY_INITIALS = [];
export const COMPATIBILITY_VOWELS = [];
export const COMPATIBILITY_FINALS = [];
for (const { codePoint, name, decomposition } of characters) {
  if (codePoint < COMPATIBILITY_BASE || codePoint > COMPATIBILITY_END) continue;
  const letter = name.replace("HANGUL LETTER ", "");
  const forms = [
    byName.get(`HANGUL CHOSEONG ${letter}`) ?? 0,
    byName.get(`HANGUL JUNGSEONG ${letter}`) ?? 0,
    byName.get(`HANGUL JONGSEONG ${letter}`) ?? 0,
  ];
  if (codePoint === FILLER) forms.fill(0);
  else {
    const [, target] = /^<compat> ([0-9A-F]+)$/.exec(decomposition);
    const conjoining = parseInt(target, 16);
    const type = JAMO_TYPE_NAMES.indexOf(types[conjoining]);
    if (forms[type] !== 0 && forms[type] !== conjoining)
      throw new Error(`${name} does not decompose to the jamo of its name`);
    forms[type] = conjoining;
  }
  const index = codePoint - COMPATIBILITY_BASE;
  [
    COMPATIBILITY_INITIALS[index],
    COMPATIBILITY_VOWELS[index],
    COMPATIBILITY_FINALS[index],
  ] = forms;
}
if (COMPATIBILITY_INITIALS.includes(undefined))
  throw new Error("Unassigned compatibility jamo");
