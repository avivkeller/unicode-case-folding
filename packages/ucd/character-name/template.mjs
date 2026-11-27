import { assertCodePoint, assertString } from "@internal/helpers/assert";
import { findRun, unpackInts } from "@internal/helpers/tables";
import {
  ALIAS_CODE_POINTS,
  ALIAS_NAMES,
  ALIAS_TYPE_INDEXES,
  ALIAS_TYPES,
  FIRST_UNIT,
  JAMO_NAMES,
  NAMES,
  PREFIX_RANGES,
  PREFIXES,
  RUN_LENGTHS,
  RUN_STARTS,
  SEQUENCE_NAMES,
  SEQUENCES,
  VERSION,
  WORDS,
} from "#generated";

export { VERSION };

const S_BASE = 0xac00;
const S_COUNT = 11172;
const N_COUNT = 588;
const T_COUNT = 28;
const HANGUL_PREFIX = "HANGUL SYLLABLE ";
const LOOSE_HANGUL_PREFIX = "HANGULSYLLABLE";

const ASCII = /^[\x20-\x7e\s]*$/;
const SEPARATORS = /[\s_]+/g;
const MEDIAL_HYPHEN = /(?<=[A-Z0-9])-(?=[A-Z0-9])/g;
const HEX = /^[0-9A-F]{4,6}$/;

// { starts, offsets, names, words }: names[offsets[i] + codePoint - starts[i]]
// is the name, as one UTF-16 code unit per word, of a code point in run i
let table;
let aliases;
let byLooseName;
let loosePrefixes;

/**
 * Returns the name of a character, e.g. "LATIN SMALL LETTER A" for U+0061
 * @param {number} codePoint
 * @returns {string | undefined} undefined for controls and unassigned code points
 */
export function getName(codePoint) {
  assertCodePoint(codePoint);
  const syllable = codePoint - S_BASE;
  if (syllable >= 0 && syllable < S_COUNT) {
    const [initials, vowels, finals] = JAMO_NAMES;
    return (
      HANGUL_PREFIX +
      initials[Math.floor(syllable / N_COUNT)] +
      vowels[Math.floor((syllable % N_COUNT) / T_COUNT)] +
      finals[syllable % T_COUNT]
    );
  }
  const range = prefixRange(codePoint);
  if (range !== undefined) return PREFIXES[range[2]] + toHex(codePoint);

  const { starts, offsets, names } = loadNames();
  const run = findRun(starts, codePoint);
  if (run === -1) return undefined;
  const index = offsets[run] + codePoint - starts[run];
  return index < offsets[run + 1] ? decodeName(names[index]) : undefined;
}

/**
 * Returns the formal aliases of a character, e.g. "LINE FEED" and "LF" for U+000A
 * @param {number} codePoint
 * @returns {NameAlias[]}
 */
export function getAliases(codePoint) {
  assertCodePoint(codePoint);
  return (loadAliases().get(codePoint) ?? []).map(([alias, type]) => ({
    alias,
    type: ALIAS_TYPES[type],
  }));
}

/**
 * Finds the character or named sequence with a name or an alias, matched loosely (UAX44-LM2)
 * @param {string} name - e.g. "latin small letter a", "NBSP", "KEYCAP DIGIT ONE"
 * @returns {string | undefined}
 */
export function fromName(name) {
  assertString(name);
  if (!ASCII.test(name)) return undefined;
  const spaced = name.toUpperCase().replace(SEPARATORS, " ").trim();
  // The one name whose hyphen tells it from another: U+116C is "… OE"
  if (spaced.replaceAll(" ", "") === "HANGULJUNGSEONGO-E") return "ᆀ";
  const loose = spaced.replace(MEDIAL_HYPHEN, "").replaceAll(" ", "");

  const found = loadLooseNames().get(loose);
  if (found !== undefined) return found;
  if (loose.startsWith(LOOSE_HANGUL_PREFIX)) {
    return syllableFromName(loose.slice(LOOSE_HANGUL_PREFIX.length));
  }
  for (let i = 0; i < PREFIXES.length; i++) {
    const prefix = loosePrefixes[i];
    if (!loose.startsWith(prefix)) continue;
    const hex = loose.slice(prefix.length);
    if (!HEX.test(hex)) continue;
    const codePoint = parseInt(hex, 16);
    if (prefixRange(codePoint)?.[2] === i && toHex(codePoint) === hex) {
      return String.fromCodePoint(codePoint);
    }
  }
  return undefined;
}

function toHex(codePoint) {
  return codePoint.toString(16).toUpperCase().padStart(4, "0");
}

function prefixRange(codePoint) {
  for (const range of PREFIX_RANGES) {
    if (codePoint < range[0]) return undefined;
    if (codePoint <= range[1]) return range;
  }
  return undefined;
}

function loadNames() {
  if (table === undefined) {
    const starts = unpackInts(RUN_STARTS);
    const offsets = [0];
    for (const length of unpackInts(RUN_LENGTHS)) {
      offsets.push(offsets.at(-1) + length);
    }
    table = {
      starts,
      offsets,
      names: NAMES.split(" "),
      words: WORDS.split(" "),
    };
  }
  return table;
}

function decodeName(encoded) {
  const { words } = table;
  let name = words[encoded.charCodeAt(0) - FIRST_UNIT];
  for (let i = 1; i < encoded.length; i++) {
    name += " " + words[encoded.charCodeAt(i) - FIRST_UNIT];
  }
  return name;
}

function loadAliases() {
  if (aliases === undefined) {
    aliases = new Map();
    const names = ALIAS_NAMES.split("\t");
    const types = unpackInts(ALIAS_TYPE_INDEXES);
    unpackInts(ALIAS_CODE_POINTS).forEach((codePoint, i) => {
      if (!aliases.has(codePoint)) aliases.set(codePoint, []);
      aliases.get(codePoint).push([names[i], types[i]]);
    });
  }
  return aliases;
}

function loadLooseNames() {
  if (byLooseName === undefined) {
    const toLoose = (name) =>
      (name.includes("-") ? name.replace(MEDIAL_HYPHEN, "") : name).replaceAll(
        " ",
        "",
      );
    byLooseName = new Map();
    loosePrefixes = PREFIXES.map((prefix) => toLoose(prefix.slice(0, -1)));

    const sequences = SEQUENCES.split("\t");
    SEQUENCE_NAMES.split("\t").forEach((name, i) => {
      byLooseName.set(toLoose(name), sequences[i]);
    });
    for (const [codePoint, list] of loadAliases()) {
      const char = String.fromCodePoint(codePoint);
      for (const [alias] of list) byLooseName.set(toLoose(alias), char);
    }
    const { starts, offsets, names } = loadNames();
    for (let run = 0; run < starts.length; run++) {
      for (let i = offsets[run]; i < offsets[run + 1]; i++) {
        const codePoint = starts[run] + i - offsets[run];
        if (codePoint === 0x1180) continue;
        byLooseName.set(
          toLoose(decodeName(names[i])),
          String.fromCodePoint(codePoint),
        );
      }
    }
  }
  return byLooseName;
}

function syllableFromName(short) {
  const [initials, vowels, finals] = JAMO_NAMES;
  for (let l = 0; l < initials.length; l++) {
    if (!short.startsWith(initials[l])) continue;
    for (let v = 0; v < vowels.length; v++) {
      if (!short.startsWith(vowels[v], initials[l].length)) continue;
      const t = finals.indexOf(
        short.slice(initials[l].length + vowels[v].length),
      );
      if (t !== -1) {
        return String.fromCharCode(S_BASE + l * N_COUNT + v * T_COUNT + t);
      }
    }
  }
  return undefined;
}

export default /* @__PURE__ */ Object.assign(getName, {
  getName,
  getAliases,
  fromName,
  VERSION,
});

/**
 * @typedef {object} NameAlias
 * @property {string} alias e.g. "LINE FEED"
 * @property {"correction" | "control" | "alternate" | "figment" | "abbreviation"} type
 */
