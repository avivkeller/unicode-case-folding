import { compare, sortKey } from "../dist/index.mjs";

export const FILES = {
  "CollationTest_NON_IGNORABLE_SHORT.txt": "non-ignorable",
  "CollationTest_SHIFTED_SHORT.txt": "shifted",
};

export function isTestCase(line) {
  return /^[0-9A-F]/.test(line);
}

/** Each line must sort at or after the one before, UTS #10 section 12.2 */
export function checkCollationTest(contents, alternate) {
  const options = { alternate, strength: "identical" };
  const failures = [];
  let passed = 0;
  let previous;
  let previousKey;
  for (const line of contents.split("\n")) {
    if (!isTestCase(line)) continue;
    const text = String.fromCodePoint(
      ...line
        .split(/[;#]/, 1)[0]
        .trim()
        .split(/\s+/)
        .map((hex) => parseInt(hex, 16)),
    );
    const key = sortKey(text, options);
    if (
      previous !== undefined &&
      (compare(previous, text, options) > 0 ||
        compare(text, previous, options) < 0 ||
        previousKey > key)
    ) {
      failures.push(line);
    } else {
      passed++;
    }
    previous = text;
    previousKey = key;
  }
  return { passed, failures };
}
