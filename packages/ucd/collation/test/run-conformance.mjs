// Runs against dist/; --write-fixtures rewrites the subsets index.test.mjs runs
import fs from "node:fs/promises";
import { uca } from "@internal/build/sources/unicode";
import { FILES, checkCollationTest, isTestCase } from "./conformance.mjs";

// Lines stay in order, so a subset is as valid a test as the whole file
const SAMPLING = 50;

const writeFixtures = process.argv.includes("--write-fixtures");
for (const [file, alternate] of Object.entries(FILES)) {
  const contents = await uca.text(`CollationTest.zip/CollationTest/${file}`);
  const { passed, failures } = checkCollationTest(contents, alternate);
  console.log(`${file}: ${passed} of ${passed + failures.length} passed`);
  for (const failure of failures.slice(0, 20)) console.log(`  ${failure}`);
  if (failures.length > 0) process.exitCode = 1;

  if (writeFixtures) {
    const lines = contents.split("\n");
    const header = lines.slice(0, 7);
    const cases = lines.filter(isTestCase).filter((_, i) => i % SAMPLING === 0);
    await fs.writeFile(
      new URL(`fixtures/${file}`, import.meta.url),
      [
        ...header,
        "#",
        `# A subset of ${file} from the Unicode Collation Algorithm data, in the`,
        "# same format, written by run-conformance.mjs.",
        "",
        ...cases,
        "",
      ].join("\n"),
    );
  }
}
