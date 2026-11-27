// Source column → column holding its expected result
const EXPECTED = {
  NFC: [1, 1, 1, 3, 3],
  NFD: [2, 2, 2, 4, 4],
  NFKC: [3, 3, 3, 3, 3],
  NFKD: [4, 4, 4, 4, 4],
};
export const FORMS = Object.keys(EXPECTED);

export function parseNormalizationTest(contents) {
  const cases = [];
  let part = "";
  for (const line of contents.split("\n")) {
    const data = line.split("#")[0].trim();
    if (!data) continue;
    if (data.startsWith("@")) {
      part = data;
      continue;
    }
    const columns = data
      .split(";")
      .slice(0, 5)
      .map((field) =>
        String.fromCodePoint(
          ...field.split(" ").map((hex) => parseInt(hex, 16)),
        ),
      );
    cases.push({ line: data, part, columns });
  }
  return cases;
}

export function expectedForms({ columns }) {
  return FORMS.flatMap((form) =>
    columns.map((column, i) => [form, column, columns[EXPECTED[form][i]]]),
  );
}

export function findFailures(cases, normalize) {
  const failures = [];
  const listed = new Set();
  for (const testCase of cases) {
    if (testCase.part === "@Part1") listed.add(testCase.columns[0]);
    for (const [form, input, expected] of expectedForms(testCase)) {
      if (normalize(input, form) !== expected) {
        failures.push(`${form}: ${testCase.line}`);
      }
    }
  }
  // Part 1 lists every character that some form changes
  for (let codePoint = 0; codePoint <= 0x10ffff; codePoint++) {
    if (codePoint >= 0xd800 && codePoint <= 0xdfff) continue;
    const char = String.fromCodePoint(codePoint);
    if (listed.has(char)) continue;
    for (const form of FORMS) {
      if (normalize(char, form) !== char) {
        failures.push(`${form}: U+${codePoint.toString(16).toUpperCase()}`);
      }
    }
  }
  return failures;
}
