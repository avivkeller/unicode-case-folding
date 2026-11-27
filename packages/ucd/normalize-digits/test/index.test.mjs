import assert from "node:assert/strict";
import test from "node:test";
import {
  VERSION,
  getDigitValue,
  getNumericValue,
  normalizeDigits,
} from "../dist/index.mjs";

test("normalizeDigits", async (t) => {
  const cases = [
    ["123", "123", "ASCII"],
    ["", "", "empty string"],
    ["١٢٣", "123", "Arabic-Indic"],
    ["۱۲۳", "123", "Extended Arabic-Indic (Persian)"],
    ["१२३", "123", "Devanagari"],
    ["১২৩", "123", "Bengali"],
    ["๑๒๓", "123", "Thai"],
    ["１２３", "123", "fullwidth"],
    ["\u{1d7cf}\u{1d7d0}", "12", "mathematical bold"],
    ["١٠ apples", "10 apples", "mixed text"],
    ["½ Ⅷ 万", "½ Ⅷ 万", "leaves other numbers alone"],
    ["²", "²", "leaves superscripts alone (not decimal digits)"],
  ];
  for (const [input, expected, description] of cases) {
    await t.test(description, () =>
      assert.equal(normalizeDigits(input), expected),
    );
  }

  await t.test("agrees with \\p{Nd} for every code point", () => {
    for (let cp = 0; cp <= 0x10ffff; cp++) {
      if (cp >= 0xd800 && cp <= 0xdfff) continue;
      const char = String.fromCodePoint(cp);
      if (/\p{Nd}/u.test(char)) {
        assert.match(normalizeDigits(char), /^[0-9]$/, `U+${cp.toString(16)}`);
      } else if (getDigitValue(cp) === undefined) {
        assert.equal(normalizeDigits(char), char);
      }
    }
  });

  await t.test("works with Number()", () => {
    assert.equal(Number(normalizeDigits("٤٢")), 42);
  });

  await t.test("rejects non-strings", () => {
    assert.throws(() => normalizeDigits(123), TypeError);
  });
});

test("getDigitValue", () => {
  assert.equal(getDigitValue(0x30), 0);
  assert.equal(getDigitValue(0x0669), 9);
  assert.equal(getDigitValue(0xff15), 5);
  assert.equal(getDigitValue(0x41), undefined);
  assert.equal(getDigitValue(0xbd), undefined, "½ is not a digit");
  assert.throws(() => getDigitValue(-1), RangeError);
});

test("getNumericValue", () => {
  assert.equal(getNumericValue(0x37), 7);
  assert.equal(getNumericValue(0xbd), 0.5);
  assert.equal(getNumericValue(0x2167), 8);
  assert.equal(getNumericValue(0x4e07), 10000);
  assert.equal(getNumericValue(0x0f33), -0.5);
  assert.equal(getNumericValue(0x41), undefined);
  assert.throws(() => getNumericValue("7"), TypeError);
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
