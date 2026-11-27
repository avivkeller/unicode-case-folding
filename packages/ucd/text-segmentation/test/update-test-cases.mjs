// Run after `npm run build -- segmenter`; downloads the conformance tests, without their comments
import fs from "node:fs/promises";
import * as ucd from "@internal/build/sources/ucd";
import {
  findGraphemeBreaks,
  findSentenceBreaks,
  findWordBreaks,
} from "../dist/index.mjs";
import { parseBreakTest } from "./break-test.mjs";

const FILES = {
  "GraphemeBreakTest.txt": findGraphemeBreaks,
  "WordBreakTest.txt": findWordBreaks,
  "SentenceBreakTest.txt": findSentenceBreaks,
};

for (const [name, findBreaks] of Object.entries(FILES)) {
  const file = `auxiliary/${name}`;
  const contents = await ucd.text(file);
  const cases = parseBreakTest(contents);
  const failures = cases.filter(
    ({ text, breaks }) => findBreaks(text).join() !== breaks.join(),
  );
  for (const { line } of failures) console.log(`fails: ${line}`);
  console.log(
    `${cases.length - failures.length} of ${cases.length} cases of ` +
      `${file} (${await ucd.version(file)}) pass`,
  );
  if (failures.length > 0) process.exitCode = 1;
  const header = contents.slice(0, contents.search(/^[^#]/m));
  const lines = cases.map(({ line }) => line.split("#")[0].trim());
  await fs.writeFile(
    new URL(name, import.meta.url),
    `${header}${lines.join("\n")}\n`,
  );
}
