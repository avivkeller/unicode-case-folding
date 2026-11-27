// Run after `npm run build -- line-break`; rewrites the sample in LineBreakTest.txt
import fs from "node:fs/promises";
import * as ucd from "@internal/build/sources/ucd";
import { findLineBreaks } from "../dist/index.mjs";
import { parseLineBreakTest } from "./line-break-test.mjs";

const FILE = "auxiliary/LineBreakTest.txt";
const OUTPUT = new URL("LineBreakTest.txt", import.meta.url);

const contents = await ucd.text(FILE);
const cases = parseLineBreakTest(contents);

const failures = cases.filter(({ text, breaks }) => {
  const actual = findLineBreaks(text).map(({ index }) => index);
  return actual.join() !== breaks.join();
});
for (const { line } of failures) console.log(`fails: ${line}`);
console.log(
  `${cases.length - failures.length} of ${cases.length} cases of ` +
    `${FILE} (${await ucd.version(FILE)}) pass`,
);
if (failures.length > 0) process.exitCode = 1;

const features = cases.map(({ line }) => {
  const comment = line.slice(line.indexOf("#"));
  const rules = [...comment.matchAll(/[×÷] \[([\d.]+)\]/g)].map((m) => m[1]);
  const kinds = [...comment.matchAll(/\(([^()]+)\) [×÷]/g)].map((m) => m[1]);
  if (rules.length !== kinds.length + 1) {
    throw new Error(`Unexpected comment format: ${line}`);
  }
  const result = new Set();
  for (let i = 1; i < kinds.length; i++) {
    result.add(`${kinds[i - 1]} ${rules[i]}`);
    result.add(`${rules[i]} ${kinds[i]}`);
  }
  return result;
});

const selected = new Set(
  cases.flatMap(({ text }, i) => ([...text].length > 4 ? [i] : [])),
);
const covered = new Set([...selected].flatMap((i) => [...features[i]]));
for (;;) {
  let best = -1;
  let bestGain = 0;
  for (const [i, set] of features.entries()) {
    let gain = 0;
    for (const feature of set) if (!covered.has(feature)) gain++;
    if (gain > bestGain) [best, bestGain] = [i, gain];
  }
  if (best === -1) break;
  selected.add(best);
  for (const feature of features[best]) covered.add(feature);
}

const header = contents.slice(0, contents.search(/^[^#]/m));
const lines = cases
  .filter((_, i) => selected.has(i))
  .map(({ line }) => line.split("#")[0].trim());
await fs.writeFile(
  OUTPUT,
  `${header}# A sample of ${lines.length} of the ${cases.length} cases, ` +
    `selected by update-test-cases.mjs\n#\n${lines.join("\n")}\n`,
);
console.log(`Wrote ${lines.length} cases to ${OUTPUT.pathname}`);
