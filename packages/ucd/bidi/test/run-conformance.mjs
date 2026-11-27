// Runs against dist/; --write-fixtures rewrites the subsets index.test.mjs runs
import fs from "node:fs/promises";
import * as ucd from "@internal/build/sources/ucd";
import { checkBidiCharacterTest, checkBidiTest } from "./conformance.mjs";

const BIDI_TEST_SAMPLING = 1000;
const CHARACTER_TEST_SAMPLING = 400;

const writeFixtures = process.argv.includes("--write-fixtures");
const tests = [
  ["BidiTest.txt", checkBidiTest, bidiTestSubset],
  ["BidiCharacterTest.txt", checkBidiCharacterTest, characterTestSubset],
];
for (const [file, check, subset] of tests) {
  const contents = await ucd.text(file);
  const { passed, failures } = check(contents);
  console.log(`${file}: ${passed} of ${passed + failures.length} passed`);
  for (const failure of failures.slice(0, 20)) console.log(`  ${failure}`);
  if (failures.length > 0) process.exitCode = 1;

  if (writeFixtures) {
    const fixture = new URL(`fixtures/${file}`, import.meta.url);
    await fs.writeFile(fixture, subset(contents));
  }
}

function bidiTestSubset(contents) {
  const lines = [];
  let afterExpectedResult = false;
  let dataLines = 0;
  for (const line of contents.split("\n")) {
    if (line.startsWith("@")) {
      lines.push(line);
      afterExpectedResult = true;
    } else if (isTestCase(line)) {
      if (afterExpectedResult || dataLines % BIDI_TEST_SAMPLING === 0) {
        lines.push(line);
      }
      afterExpectedResult = false;
      dataLines++;
    }
  }
  return withHeader(contents, "BidiTest.txt", lines);
}

function characterTestSubset(contents) {
  const lines = contents.split("\n");
  const permutations = lines.findIndex((line) =>
    line.startsWith("# Permutations of sequences containing paired brackets"),
  );
  if (permutations === -1) {
    throw new Error("BidiCharacterTest.txt has no permutations section");
  }
  const handwritten = lines.slice(0, permutations).filter(isTestCase);
  const sampled = lines
    .slice(permutations)
    .filter(isTestCase)
    .filter((_, i) => i % CHARACTER_TEST_SAMPLING === 0);
  return withHeader(contents, "BidiCharacterTest.txt", [
    ...handwritten,
    ...sampled,
  ]);
}

function isTestCase(line) {
  return line !== "" && !line.startsWith("#") && !line.startsWith("@");
}

function withHeader(contents, file, lines) {
  const header = contents.split("\n").slice(0, 5);
  return [
    ...header,
    "#",
    `# A subset of ${file} from the Unicode Character Database, in the same`,
    "# format, written by run-conformance.mjs.",
    "",
    ...lines,
    "",
  ].join("\n");
}
