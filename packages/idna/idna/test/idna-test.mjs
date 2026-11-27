import { toASCII, toUnicode } from "../dist/index.mjs";

const unescape = (field) =>
  field === '""'
    ? ""
    : field.replace(/\\u([0-9A-F]{4})|\\x\{([0-9A-F]+)\}/gi, (_, bmp, any) =>
        String.fromCodePoint(parseInt(bmp ?? any, 16)),
      );

const hasErrors = (status) => status !== "" && status !== "[]";
// X4_2 marks an empty label, which is not an error of ToUnicode
const hasUnicodeErrors = (status) => hasErrors(status.replace(/,? ?X4_2/, ""));

export function parseIdnaTest(contents) {
  const cases = [];
  for (const line of contents.split("\n")) {
    const data = line.split("#")[0];
    if (!data.trim()) continue;
    const fields = data.split(";").map((field) => field.trim());
    const source = unescape(fields[0]);
    const unicode = fields[1] === "" ? source : unescape(fields[1]);
    const unicodeStatus = fields[2];
    const ascii = fields[3] === "" ? unicode : unescape(fields[3]);
    const asciiStatus = fields[4] === "" ? unicodeStatus : fields[4];
    const transitional = fields[5] === "" ? ascii : unescape(fields[5]);
    const transitionalStatus = fields[6] === "" ? asciiStatus : fields[6];
    cases.push({
      line: data.trim(),
      source,
      unicode,
      unicodeError: hasUnicodeErrors(unicodeStatus),
      ascii,
      asciiError: hasErrors(asciiStatus),
      transitional,
      transitionalError: hasErrors(transitionalStatus),
    });
  }
  return cases;
}

export function findFailures(cases) {
  const failures = [];
  const check = (testCase, operation, actual, expected, expectedError) => {
    if (
      actual.error !== expectedError ||
      (!expectedError && actual.domain !== expected)
    ) {
      failures.push(
        `${operation}: ${testCase.line} gave ${JSON.stringify(actual)}`,
      );
    }
  };
  for (const testCase of cases) {
    const { source } = testCase;
    const unicode = toUnicode(source);
    check(
      testCase,
      "toUnicode",
      unicode,
      testCase.unicode,
      testCase.unicodeError,
    );
    if (unicode.domain !== testCase.unicode) {
      failures.push(`toUnicode: ${testCase.line} gave ${unicode.domain}`);
    }
    check(
      testCase,
      "toASCII",
      toASCII(source),
      testCase.ascii,
      testCase.asciiError,
    );
    check(
      testCase,
      "toASCII, transitional",
      toASCII(source, { transitional: true }),
      testCase.transitional,
      testCase.transitionalError,
    );
  }
  return failures;
}
