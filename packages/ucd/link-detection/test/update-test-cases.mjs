// Run after `npm run build -- link-detection`; rewrites the UTS #58 test files
import fs from "node:fs/promises";
import { linkification } from "@internal/build/sources/unicode";
import { checkDetection, checkFormatting } from "./conformance.mjs";

const CHECKS = {
  "LinkDetectionTest.txt": checkDetection,
  "LinkFormattingTest.txt": checkFormatting,
};

for (const [file, check] of Object.entries(CHECKS)) {
  const contents = await linkification.text(file);
  const { total, failures } = check(contents);
  for (const failure of failures) console.log(`fails: ${failure}`);
  console.log(`${total - failures.length} of ${total} cases of ${file} pass`);
  if (failures.length > 0) process.exitCode = 1;
  await fs.writeFile(new URL(file, import.meta.url), contents);
}
