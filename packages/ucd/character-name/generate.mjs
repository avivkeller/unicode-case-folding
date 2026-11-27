import * as ucd from "@internal/build/sources/ucd";
import { packInts } from "@internal/helpers/tables";

const NAMES_FILE = "extracted/DerivedName.txt";
const ALIASES_FILE = "NameAliases.txt";
const SEQUENCES_FILE = "NamedSequences.txt";
const JAMO_FILE = "Jamo.txt";

export const VERSION = await ucd.version(
  NAMES_FILE,
  ALIASES_FILE,
  SEQUENCES_FILE,
  JAMO_FILE,
);

const S_BASE = 0xac00;
const S_COUNT = 11172;
const HANGUL_PREFIX = "HANGUL SYLLABLE ";

const jamo = new Map(
  (await ucd.records(JAMO_FILE)).map(([code, short]) => [
    parseInt(code, 16),
    short,
  ]),
);
const jamoNames = (start, count) =>
  Array.from({ length: count }, (_, i) => {
    if (!jamo.has(start + i)) throw new Error(`${JAMO_FILE}: missing jamo`);
    return jamo.get(start + i);
  });
// [initials, vowels, finals]: the short names of the jamo of syllables
export const JAMO_NAMES = [
  jamoNames(0x1100, 19),
  jamoNames(0x1161, 21),
  ["", ...jamoNames(0x11a8, 27)],
];

const names = [];
// [first, last, index in PREFIXES]: names that end with the code point in hex
export const PREFIX_RANGES = [];
export const PREFIXES = [];
let syllables = 0;
for (const [range, name] of await ucd.records(NAMES_FILE)) {
  const [start, end] = ucd.parseRange(range);
  if (name.endsWith("-*")) {
    const prefix = name.slice(0, -1);
    if (!PREFIXES.includes(prefix)) PREFIXES.push(prefix);
    PREFIX_RANGES.push([start, end, PREFIXES.indexOf(prefix)]);
  } else if (start !== end) {
    throw new Error(`${NAMES_FILE}: ${range} has one name`);
  } else if (name.startsWith(HANGUL_PREFIX)) {
    const index = start - S_BASE;
    const [initials, vowels, finals] = JAMO_NAMES;
    const expected =
      HANGUL_PREFIX +
      initials[Math.floor(index / 588)] +
      vowels[Math.floor((index % 588) / 28)] +
      finals[index % 28];
    if (name !== expected) throw new Error(`Unexpected name: ${name}`);
    syllables++;
  } else {
    if (!/^[A-Z0-9][A-Z0-9 -]*$/.test(name))
      throw new Error(`Unexpected name: ${name}`);
    names.push([start, name]);
  }
}
if (syllables !== S_COUNT) throw new Error("Hangul syllables without a name");
names.sort((a, b) => a[0] - b[0]);
PREFIX_RANGES.sort((a, b) => a[0] - b[0]);

// Runs of consecutive named code points; names are in code point order
const runStarts = [];
const runLengths = [];
for (const [codePoint] of names) {
  if (codePoint === runStarts.at(-1) + runLengths.at(-1)) {
    runLengths[runLengths.length - 1]++;
  } else {
    runStarts.push(codePoint);
    runLengths.push(1);
  }
}
export const RUN_STARTS = packInts(runStarts);
export const RUN_LENGTHS = packInts(runLengths);

// Each word of a name is one UTF-16 code unit: FIRST_UNIT + its index in
// WORDS, most frequent first. Indexes whose unit would be a quote, a
// backslash, a control or a format character are left empty.
export const FIRST_UNIT = 0x21;
const isUsable = (unit) =>
  unit !== 0x22 &&
  unit !== 0x5c &&
  !(unit >= 0x7f && unit <= 0xa0) &&
  unit !== 0xad &&
  !(unit >= 0x2000 && unit <= 0x206f) &&
  unit < 0xd800;

const uses = new Map();
for (const [, name] of names) {
  for (const word of name.split(" ")) uses.set(word, (uses.get(word) ?? 0) + 1);
}
const byFrequency = [...uses.keys()].sort(
  (a, b) => uses.get(b) - uses.get(a) || (a < b ? -1 : 1),
);
const words = [];
const units = new Map();
for (const word of byFrequency) {
  while (!isUsable(FIRST_UNIT + words.length)) words.push("");
  units.set(word, String.fromCharCode(FIRST_UNIT + words.length));
  words.push(word);
}
if (!isUsable(FIRST_UNIT + words.length - 1)) throw new Error("Too many words");

export const WORDS = words.join(" ");
export const NAMES = names
  .map(([, name]) =>
    name
      .split(" ")
      .map((word) => units.get(word))
      .join(""),
  )
  .join(" ");

const aliases = (await ucd.records(ALIASES_FILE)).map(([code, alias, type]) => [
  parseInt(code, 16),
  alias,
  type,
]);
export const ALIAS_TYPES = [...new Set(aliases.map(([, , type]) => type))];
export const ALIAS_CODE_POINTS = packInts(aliases.map(([code]) => code));
export const ALIAS_NAMES = aliases.map(([, alias]) => alias).join("\t");
export const ALIAS_TYPE_INDEXES = packInts(
  aliases.map(([, , type]) => ALIAS_TYPES.indexOf(type)),
);

const sequences = await ucd.records(SEQUENCES_FILE);
export const SEQUENCE_NAMES = sequences.map(([name]) => name).join("\t");
export const SEQUENCES = sequences
  .map(([, codes]) => String.fromCodePoint(...ucd.parseCodePoints(codes)))
  .join("\t");

// UAX44-LM2, as in template.mjs; U+1180 is its one exception
const loose = (name) =>
  name.replace(/(?<=[A-Z0-9])-(?=[A-Z0-9])/g, "").replaceAll(" ", "");
const seen = new Map();
const claim = (name, value) => {
  const key = loose(name);
  if (seen.has(key) && seen.get(key) !== value && value !== "ᆀ")
    throw new Error(`"${name}" is not unique when matched loosely`);
  if (value !== "ᆀ") seen.set(key, value);
};
for (const [codePoint, name] of names) {
  claim(name, String.fromCodePoint(codePoint));
}
for (const [codePoint, alias] of aliases) {
  claim(alias, String.fromCodePoint(codePoint));
}
for (const [name, codes] of sequences) {
  claim(name, String.fromCodePoint(...ucd.parseCodePoints(codes)));
}
if (seen.get("HANGULJUNGSEONGOE") !== "ᅬ")
  throw new Error("U+116C and U+1180 no longer need an exception");
