import * as ucd from "@internal/build/sources/ucd";
import { packInts, rangeTable } from "@internal/helpers/tables";

const IRG_FILE = "Unihan_IRGSources.txt";
const RADICALS_FILE = "CJKRadicals.txt";
const EQUIVALENT_FILE = "EquivalentUnifiedIdeograph.txt";
// "120'.3": radical 120 in its simplified form, and 3 other strokes
const RADICAL_STROKE = /^(\d{1,3})('{0,3})\.(-?\d{1,2})$/;

export const VERSION = await ucd.version(
  `Unihan.zip/${IRG_FILE}`,
  RADICALS_FILE,
  EQUIVALENT_FILE,
);

const character = (hex) => String.fromCodePoint(parseInt(hex, 16));

// The character of radical 1, 2, …
export const RADICAL_CHARACTERS = (await ucd.records(RADICALS_FILE))
  .filter(([id]) => /^\d+$/.test(id))
  .map(([id, hex], i) => {
    if (Number(id) !== i + 1) throw new Error(`Radical ${id} is out of order`);
    return character(hex);
  });

export const BIAS = 16;

const totalStrokes = await ucd.unihan(IRG_FILE, "kTotalStrokes");

function encode(codePoint, value) {
  // The first value is the standard one
  const [, radical, form, residual] =
    RADICAL_STROKE.exec(value.split(" ")[0]) ?? [];
  if (!(radical >= 1 && radical <= RADICAL_CHARACTERS.length)) {
    throw new Error(`kRSUnicode: unsupported "${value}"`);
  }
  // The strokes of the radical as this character writes it
  const ownStrokes = totalStrokes.get(codePoint) - residual;
  const fields = [Number(residual) + BIAS, ownStrokes + BIAS];
  if (fields.some((field) => !(field >= 0 && field < 128))) {
    throw new Error(`U+${codePoint.toString(16)}: strokes out of range`);
  }
  return (((radical << 2) | form.length) << 14) | (fields[0] << 7) | fields[1];
}

const [starts, values] = rangeTable(
  [...(await ucd.unihan(IRG_FILE, "kRSUnicode"))].map(([codePoint, value]) => [
    codePoint,
    codePoint,
    encode(codePoint, value),
  ]),
  -1,
);

// Runs of code points with the same value, -1 without data, or else
// (radical << 2 | simplified form) << 14 | residual strokes + BIAS << 7
// | radical strokes + BIAS
export const RADICAL_STROKE_STARTS = packInts(starts);
export const RADICAL_STROKE_VALUES = packInts(values);

export const EQUIVALENT_IDEOGRAPHS = new Map(
  (await ucd.records(EQUIVALENT_FILE))
    .flatMap(([range, hex]) => {
      const [start, end] = ucd.parseRange(range);
      return Array.from({ length: end - start + 1 }, (_, i) => [
        start + i,
        character(hex),
      ]);
    })
    .sort((a, b) => a[0] - b[0]),
);
