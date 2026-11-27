import { BIDI_CLASS_NAMES } from "@internal/helpers/bidi";
import { codePointSetWhere, rangeTableOf } from "@internal/helpers/tables";
import * as ucd from "./ucd.mjs";

const CLASS_FILE = "extracted/DerivedBidiClass.txt";
const BRACKETS_FILE = "BidiBrackets.txt";
const MIRRORING_FILE = "BidiMirroring.txt";
const MIRRORED_FILE = "extracted/DerivedBinaryProperties.txt";

export const bidiVersion = () =>
  ucd.version(
    CLASS_FILE,
    BRACKETS_FILE,
    MIRRORING_FILE,
    MIRRORED_FILE,
    "PropertyValueAliases.txt",
  );

export async function generateBidi({ mirrored = false } = {}) {
  const classes = await classesByCodePoint();

  const { openingBrackets, closingBrackets } = await pairedBrackets();
  const mirroring = new Map(
    (await ucd.records(MIRRORING_FILE)).map(([code, mirror]) => [
      parseInt(code, 16),
      parseInt(mirror, 16),
    ]),
  );
  const mirroringCodePoints = [...mirroring.keys()].sort((a, b) => a - b);

  const data = {
    classes: rangeTableOf(classes),
    openingBrackets,
    closingBrackets,
    mirroring: [
      mirroringCodePoints,
      mirroringCodePoints.map((codePoint) => mirroring.get(codePoint)),
    ],
  };
  if (mirrored) {
    // The characters with a Bidi_Mirroring_Glyph all have Bidi_Mirrored
    const mirrored = new Uint8Array(ucd.CODE_POINTS);
    for (const [start, end] of await ucd.ranges(
      MIRRORED_FILE,
      "Bidi_Mirrored",
    )) {
      mirrored.fill(1, start, end + 1);
    }
    data.mirrored = codePointSetWhere(
      (codePoint) => mirrored[codePoint] === 1 && !mirroring.has(codePoint),
    );
  }
  return data;
}

async function classesByCodePoint() {
  // The "@missing" defaults of DerivedBidiClass.txt have long names
  const shortNames = await ucd.shortNames("bc");
  const indexes = new Map();
  const indexOf = (name) => {
    const index = BIDI_CLASS_NAMES.indexOf(shortNames.get(name) ?? name);
    if (index === -1) {
      throw new Error(`${CLASS_FILE}: unsupported Bidi_Class ${name}`);
    }
    return index;
  };
  const classes = new Uint8Array(ucd.CODE_POINTS);
  for (const [codePoint, name] of (await ucd.values(CLASS_FILE)).entries()) {
    if (!indexes.has(name)) indexes.set(name, indexOf(name));
    classes[codePoint] = indexes.get(name);
  }
  return classes;
}

// BD16 pairs brackets under canonical equivalence (U+2329 with U+3009)
async function pairedBrackets() {
  const singletonDecompositions = new Map();
  for (const [code, , , , , decomposition] of await ucd.records(
    "UnicodeData.txt",
  )) {
    if (/^[0-9A-F]+$/.test(decomposition)) {
      singletonDecompositions.set(
        parseInt(code, 16),
        parseInt(decomposition, 16),
      );
    }
  }
  const pairNumbers = new Map();
  const pairNumber = (closingBracket) => {
    const canonical =
      singletonDecompositions.get(closingBracket) ?? closingBracket;
    if (!pairNumbers.has(canonical)) {
      pairNumbers.set(canonical, pairNumbers.size);
    }
    return pairNumbers.get(canonical);
  };

  const openingBrackets = new Map();
  const closingBrackets = new Map();
  for (const [code, paired, type] of await ucd.records(BRACKETS_FILE)) {
    const codePoint = parseInt(code, 16);
    if (type === "o") {
      openingBrackets.set(codePoint, pairNumber(parseInt(paired, 16)));
    } else if (type === "c") {
      closingBrackets.set(codePoint, pairNumber(codePoint));
    } else {
      throw new Error(`${BRACKETS_FILE}: unsupported bracket type ${type}`);
    }
  }
  return { openingBrackets, closingBrackets };
}
