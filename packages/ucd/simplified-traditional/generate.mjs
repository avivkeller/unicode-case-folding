import * as ucd from "@internal/build/sources/ucd";

const FILE = "Unihan_Variants.txt";

export const VERSION = await ucd.version(`Unihan.zip/${FILE}`);

export const FIRST_CODE_POINT = 0x3400;

// A character that is among its own variants comes first: it stays unchanged
async function variants(field) {
  const table = new Map();
  for (const [codePoint, value] of await ucd.unihan(FILE, field)) {
    if (codePoint < FIRST_CODE_POINT) {
      throw new Error(`${field} has a value below U+3400`);
    }
    const codePoints = value.split(" ").map((code) => {
      if (!/^U\+[0-9A-F]{4,5}$/.test(code)) {
        throw new Error(`${field}: unsupported value "${value}"`);
      }
      return parseInt(code.slice(2), 16);
    });
    const ordered = codePoints.includes(codePoint)
      ? [codePoint, ...codePoints.filter((other) => other !== codePoint)]
      : codePoints;
    table.set(codePoint, String.fromCodePoint(...ordered));
  }
  return new Map([...table].sort((a, b) => a[0] - b[0]));
}

export const SIMPLIFIED = await variants("kSimplifiedVariant");
export const TRADITIONAL = await variants("kTraditionalVariant");
