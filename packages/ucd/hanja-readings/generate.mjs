import * as ucd from "@internal/build/sources/ucd";

const FILE = "Unihan_Readings.txt";
// A hangul syllable, then its sources: E is the hanja taught in schools
const READING = /^([가-힣]):([01ENX]{1,3})$/;

export const VERSION = await ucd.version(`Unihan.zip/${FILE}`);

// Each value is the syllables of a character, the ones taught in schools first
export const READINGS = new Map(
  [...(await ucd.unihan(FILE, "kHangul"))]
    .sort((a, b) => a[0] - b[0])
    .map(([codePoint, value]) => {
      const readings = value.split(" ").map((reading) => {
        const match = READING.exec(reading.normalize("NFC"));
        if (!match) throw new Error(`kHangul: unsupported value "${value}"`);
        return match;
      });
      const taught = ([, , sources]) => (sources.includes("E") ? 0 : 1);
      return [
        codePoint,
        readings
          .sort((a, b) => taught(a) - taught(b))
          .map(([, syllable]) => syllable)
          .join(""),
      ];
    }),
);
