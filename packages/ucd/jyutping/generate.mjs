import * as ucd from "@internal/build/sources/ucd";

const FILE = "Unihan_Readings.txt";

export const VERSION = await ucd.version(`Unihan.zip/${FILE}`);

const readings = await ucd.unihan(FILE, "kCantonese");
for (const value of readings.values()) {
  if (!/^[a-z]{1,6}[1-6]$/.test(value)) {
    throw new Error(`kCantonese: unsupported value "${value}"`);
  }
}

// Most frequent first, so that most readings pack into one character
const uses = new Map();
for (const syllable of readings.values()) {
  uses.set(syllable, (uses.get(syllable) ?? 0) + 1);
}
export const SYLLABLES = [...uses.keys()].sort(
  (a, b) => uses.get(b) - uses.get(a) || (a < b ? -1 : 1),
);
const syllableIndex = new Map(SYLLABLES.map((syllable, i) => [syllable, i]));

// Runs of 1 + the syllable index of successive code points, 0 for none
export const READINGS = [[], []];
for (const codePoint of [...readings.keys()].sort((a, b) => a - b)) {
  const [starts, runs] = READINGS;
  const run = runs.at(-1);
  if (!run || codePoint - (starts.at(-1) + run.length) >= 64) {
    starts.push(codePoint);
    runs.push([]);
  }
  while (starts.at(-1) + runs.at(-1).length < codePoint) runs.at(-1).push(0);
  runs.at(-1).push(1 + syllableIndex.get(readings.get(codePoint)));
}
