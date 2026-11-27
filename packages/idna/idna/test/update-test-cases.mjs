// Run after `npm run build -- uts46`; rewrites IdnaTestV2.txt
import fs from "node:fs/promises";
import { idna } from "@internal/build/sources/unicode";
import { findFailures, parseIdnaTest } from "./idna-test.mjs";

const FILE = "IdnaTestV2.txt";
const OUTPUT = new URL(FILE, import.meta.url);

const contents = await idna.text(FILE);
const cases = parseIdnaTest(contents);

const failures = findFailures(cases);
for (const failure of failures) console.log(`fails: ${failure}`);
console.log(
  `${failures.length} failures in the ${cases.length} cases of ` +
    `${FILE} (${await idna.version(FILE)})`,
);
if (failures.length > 0) process.exitCode = 1;

const header = contents.slice(0, contents.search(/^[^#\n]/m));
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
