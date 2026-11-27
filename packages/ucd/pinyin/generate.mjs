import * as ucd from "@internal/build/sources/ucd";

const FILE = "Unihan.zip/Unihan_Readings.txt";

export const VERSION = await ucd.version(FILE);

// A second reading, if any, is the customary one for Taiwan
const readings = new Map();
for (const line of (await ucd.text(FILE)).split("\n")) {
  if (line.startsWith("#")) continue;
  const [code, field, value] = line.split("\t");
  if (field !== "kMandarin") continue;
  readings.set(parseInt(code.slice(2), 16), value.trim().split(" "));
}

// Most frequent first, so that most readings pack into one character
const uses = new Map();
for (const [syllable] of readings.values()) {
  uses.set(syllable, (uses.get(syllable) ?? 0) + 1);
}
export const SYLLABLES = [...new Set([...readings.values()].flat())].sort(
  (a, b) => (uses.get(b) ?? 0) - (uses.get(a) ?? 0) || (a < b ? -1 : 1),
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
  runs.at(-1).push(1 + syllableIndex.get(readings.get(codePoint)[0]));
}

export const TAIWAN_READINGS = new Map(
  [...readings]
    .filter(([, values]) => values.length > 1)
    .map(([codePoint, values]) => [codePoint, syllableIndex.get(values[1])]),
);
