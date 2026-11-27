import * as ucd from "@internal/build/sources/ucd";

const FILE = "Unihan_DictionaryLikeData.txt";

export const VERSION = await ucd.version(`Unihan.zip/${FILE}`);

const codes = await ucd.unihan(FILE, "kCangjie");
for (const value of codes.values()) {
  if (!/^[A-Z]+$/.test(value)) {
    throw new Error(`kCangjie: unsupported value "${value}"`);
  }
}

export const CODES = new Map([...codes].sort((a, b) => a[0] - b[0]));
