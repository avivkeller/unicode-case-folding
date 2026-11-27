import * as ucd from "@internal/build/sources/ucd";

const FILE = "Unihan_Readings.txt";
const ON = /^[\u30a1-\u30fa\u30fc]+$/;
const KUN = /^[\u3041-\u3096][\u3041-\u309a\u30fc]*$/;

export const VERSION = await ucd.version(`Unihan.zip/${FILE}`);

const readings = new Map(
  [...(await ucd.unihan(FILE, "kJapanese"))]
    .sort((a, b) => a[0] - b[0])
    .map(([codePoint, value]) => [codePoint, value.split(" ")]),
);

const uses = new Map();
for (const [, list] of readings) {
  let kun = false;
  for (const reading of list) {
    kun ||= KUN.test(reading);
    if (!(kun ? KUN : ON).test(reading)) {
      throw new Error(`kJapanese: unsupported value "${list.join(" ")}"`);
    }
    uses.set(reading, (uses.get(reading) ?? 0) + 1);
  }
}

// Most frequent first: their code units take fewer bytes
export const READINGS = [...uses.keys()].sort(
  (a, b) => uses.get(b) - uses.get(a) || (a < b ? -1 : 1),
);
export const FIRST_CODE_UNIT = 0x100;
if (FIRST_CODE_UNIT + READINGS.length > 0xd800) {
  throw new Error("Too many readings for one code unit each");
}
const codeUnits = new Map(
  READINGS.map((reading, i) => [
    reading,
    String.fromCharCode(FIRST_CODE_UNIT + i),
  ]),
);

// Each value has one code unit per reading: FIRST_CODE_UNIT + its index
export const KANJI = new Map(
  [...readings].map(([codePoint, list]) => [
    codePoint,
    list.map((reading) => codeUnits.get(reading)).join(""),
  ]),
);
