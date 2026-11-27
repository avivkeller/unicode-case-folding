import * as ucd from "@internal/build/sources/ucd";

const FILE = "extracted/DerivedNumericValues.txt";

export const VERSION = await ucd.version(FILE);

const values = new Map();
const decimalDigits = new Map();
for (const [range, , , exact] of await ucd.records(FILE)) {
  const [numerator, denominator = "1"] = exact.split("/");
  const value = Number(numerator) / Number(denominator);
  const [start, end] = ucd.parseRange(range);
  for (let codePoint = start; codePoint <= end; codePoint++) {
    values.set(codePoint, value);
  }
}
for (const [range] of await ucd
  .records("extracted/DerivedNumericType.txt")
  .then((records) => records.filter(([, type]) => type === "Decimal"))) {
  const [start, end] = ucd.parseRange(range);
  for (let codePoint = start; codePoint <= end; codePoint++) {
    decimalDigits.set(codePoint, values.get(codePoint));
  }
}

// Decimal digits come in runs from 0 to 9, so only the zeros are stored
export const DIGIT_ZEROS = [...decimalDigits]
  .filter(([, value]) => value === 0)
  .map(([codePoint]) => codePoint)
  .sort((a, b) => a - b);

for (const zero of DIGIT_ZEROS) {
  for (let digit = 0; digit <= 9; digit++) {
    if (decimalDigits.get(zero + digit) !== digit) {
      throw new Error(
        `Decimal digits at U+${zero.toString(16)} are not a run from 0 to 9`,
      );
    }
  }
}
if (DIGIT_ZEROS.length * 10 !== decimalDigits.size) {
  throw new Error("Some decimal digits are not in a run from 0 to 9");
}

export const NUMERIC_VALUES = new Map([...values].sort((a, b) => a[0] - b[0]));
