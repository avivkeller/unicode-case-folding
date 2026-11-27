import * as ucd from "@internal/build/sources/ucd";
import { uca } from "@internal/build/sources/unicode";
import { rangeTableOf } from "@internal/helpers/tables";

const FILE = "allkeys.txt";
const CORE_HAN_BLOCKS = [
  "CJK Unified Ideographs",
  "CJK Compatibility Ideographs",
];
const UNASSIGNED_CATEGORIES = ["Cn", "Unassigned"];
const ELEMENT = /\[([.*])([0-9A-F]{4})\.([0-9A-F]{4})\.([0-9A-F]{4})\]/g;

export const VERSION = await uca.version(FILE);

const singles = [];
const contractions = [];
const siniform = [];
for (const line of (await uca.text(FILE)).split("\n")) {
  const [content] = line.split("#", 1);
  if (content.startsWith("@implicitweights")) {
    const [range, lead] = content.slice("@implicitweights".length).split(";");
    siniform.push([...ucd.parseRange(range.trim()), parseInt(lead, 16)]);
  }
  if (!/^[0-9A-F]/.test(content)) continue;
  const [key, value] = content.split(";");
  const codePoints = ucd.parseCodePoints(key.trim().replace(/\s+/g, " "));
  const elements = [...value.matchAll(ELEMENT)].map(
    ([, variable, ...weights]) => {
      const [primary, secondary, tertiary] = weights.map((hex) =>
        parseInt(hex, 16),
      );
      if (secondary >= 0x200 || tertiary >= 0x20) {
        throw new Error(`${FILE}: weights too large for "${line}"`);
      }
      const lower =
        (variable === "*" ? 0x4000 : 0) | (secondary << 5) | tertiary;
      return [primary, lower];
    },
  );
  if (elements.length === 0 || elements.length > 31) {
    throw new Error(`${FILE}: unsupported entry "${line}"`);
  }
  (codePoints.length === 1 ? singles : contractions).push([
    codePoints,
    elements,
  ]);
}
singles.sort((a, b) => a[0][0] - b[0][0]);

export const CODE_POINTS = singles.map(([[codePoint]]) => codePoint);
export const CONTRACTIONS = contractions.map(([codePoints]) =>
  String.fromCodePoint(...codePoints),
);

// Of the entries of CODE_POINTS, then of CONTRACTIONS
const entries = [...singles, ...contractions].map(([, elements]) => elements);
export const COUNTS = entries.map((elements) => elements.length);
export const MAX_COUNT = Math.max(...COUNTS);
export const PRIMARIES = entries.flat().map(([primary]) => primary);

// Most frequent first, so that most indexes pack into one character
const uses = new Map();
for (const [, lower] of entries.flat()) {
  uses.set(lower, (uses.get(lower) ?? 0) + 1);
}
// Each is variable << 14 | secondary << 5 | tertiary
export const LOWER_WEIGHTS = [...uses.keys()].sort(
  (a, b) => uses.get(b) - uses.get(a) || a - b,
);
const lowerIndex = new Map(LOWER_WEIGHTS.map((lower, i) => [lower, i]));
export const LOWER_INDEXES = entries
  .flat()
  .map(([, lower]) => lowerIndex.get(lower));

const UNASSIGNED = 0;
const CORE_HAN = 1;
const OTHER_HAN = 2;
const SINIFORM = 3;

// [lead primary, first code point] of the kinds from SINIFORM on
export const SINIFORM_KINDS = [];
const kinds = new Array(ucd.CODE_POINTS).fill(UNASSIGNED);

const blocks = (await ucd.records("Blocks.txt")).map(([range, name]) => [
  ...ucd.parseRange(range),
  name,
]);
for (const [start, end] of await ucd.ranges(
  "PropList.txt",
  "Unified_Ideograph",
)) {
  for (let codePoint = start; codePoint <= end; codePoint++) {
    const block = blocks.find(([s, e]) => s <= codePoint && codePoint <= e);
    kinds[codePoint] = CORE_HAN_BLOCKS.includes(block?.[2])
      ? CORE_HAN
      : OTHER_HAN;
  }
}

const categories = await ucd.values("extracted/DerivedGeneralCategory.txt");
for (const [start, end, lead] of siniform) {
  let kind = SINIFORM_KINDS.findIndex(([known]) => known === lead);
  if (kind === -1) kind = SINIFORM_KINDS.push([lead, start]) - 1;
  for (let codePoint = start; codePoint <= end; codePoint++) {
    if (!UNASSIGNED_CATEGORIES.includes(categories[codePoint])) {
      kinds[codePoint] = SINIFORM + kind;
    }
  }
}

export const IMPLICIT_KINDS = rangeTableOf(kinds);
