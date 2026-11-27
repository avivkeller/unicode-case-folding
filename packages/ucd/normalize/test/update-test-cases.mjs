// Run after `npm run build -- normalize`; rewrites NormalizationTest.txt
import fs from "node:fs/promises";
import * as ucd from "@internal/build/sources/ucd";
import { normalize } from "../dist/index.mjs";
import { findFailures, parseNormalizationTest } from "./normalization-test.mjs";

const FILE = "NormalizationTest.txt";
const OUTPUT = new URL(FILE, import.meta.url);

const contents = await ucd.text(FILE);
const cases = parseNormalizationTest(contents);

const failures = findFailures(cases, normalize);
for (const failure of failures) console.log(`fails: ${failure}`);
console.log(
  `${failures.length} failures in the ${cases.length} cases of ` +
    `${FILE} (${await ucd.version(FILE)})`,
);
if (failures.length > 0) process.exitCode = 1;

const header = contents.slice(0, contents.search(/^[^#]/m));
const lines = contents
  .slice(header.length)
  .split("\n")
  .map((line) => line.split("#")[0].trim())
  .filter(Boolean);
await fs.writeFile(
  OUTPUT,
  `${header}# All ${cases.length} cases, without their comments, ` +
    `written by update-test-cases.mjs\n#\n${lines.join("\n")}\n`,
);
console.log(`Wrote ${cases.length} cases to ${OUTPUT.pathname}`);
