import * as ucd from "@internal/build/sources/ucd";

const FILE = "Unihan_Readings.txt";
const VALUE = /^\p{L}+(?: \p{L}+)*$/u;

export const VERSION = await ucd.version(`Unihan.zip/${FILE}`);

export const READINGS = new Map(
  [...(await ucd.unihan(FILE, "kVietnamese"))]
    .sort((a, b) => a[0] - b[0])
    .map(([codePoint, value]) => {
      const readings = value.normalize("NFC");
      if (!VALUE.test(readings)) {
        throw new Error(`kVietnamese: unsupported value "${value}"`);
      }
      return [codePoint, readings];
    }),
);
