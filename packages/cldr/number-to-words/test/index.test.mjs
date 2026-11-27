import assert from "node:assert/strict";
import test from "node:test";
import { VERSION, getRuleSets, numberToWords } from "../dist/index.mjs";

const SHY = "\u00ad"; // German spellouts separate their parts with soft hyphens
const cases = (rows) =>
  rows.map(([value, locale, expected, ruleSet]) => ({
    value,
    locale,
    expected,
    ruleSet,
  }));

async function check(t, rows) {
  for (const { value, locale, expected, ruleSet } of cases(rows)) {
    await t.test(`${locale} ${ruleSet ?? ""} ${value}`, () => {
      assert.equal(
        numberToWords(value, locale, ruleSet && { ruleSet }),
        expected,
      );
    });
  }
}

test("English", (t) =>
  check(t, [
    [0, "en", "zero"],
    [21, "en", "twenty-one"],
    [123, "en", "one hundred twenty-three"],
    [1001, "en", "one thousand one"],
    [
      2345678,
      "en",
      "two million three hundred forty-five thousand six hundred seventy-eight",
    ],
    [-36, "en", "minus thirty-six"],
    [234.567, "en", "two hundred thirty-four point five six seven"],
    [0.5, "en", "zero point five"],
    [21, "en", "twenty-first", "spellout-ordinal"],
    [1999, "en", "nineteen ninety-nine", "spellout-numbering-year"],
    [
      1234,
      "en",
      "one thousand two hundred and thirty-four",
      "spellout-cardinal-verbose",
    ],
  ]));

test("bigints are exact", (t) =>
  check(t, [
    [
      9007199254740993n,
      "en",
      "nine quadrillion seven trillion one hundred ninety-nine billion two hundred fifty-four million seven hundred forty thousand nine hundred ninety-three",
    ],
    [12345678901234567890n, "en", "12,345,678,901,234,567,890"],
  ]));

test("ordinal digits and numbering systems", (t) =>
  check(t, [
    [1, "en", "1st", "digits-ordinal"],
    [2, "en", "2nd", "digits-ordinal"],
    [3, "en", "3rd", "digits-ordinal"],
    [11, "en", "11th", "digits-ordinal"],
    [21, "en", "21st", "digits-ordinal"],
    [112, "en", "112th", "digits-ordinal"],
    [12345, "en", "12,345th", "digits-ordinal"],
    [1984, "en", "MCMLXXXIV", "roman-upper"],
    [2024, "fr", "mmxxiv", "roman-lower"],
  ]));

test("German", (t) =>
  check(t, [
    [21, "de", `ein${SHY}und${SHY}zwanzig`],
    [1101, "de", `ein${SHY}tausend${SHY}ein${SHY}hundert${SHY}eins`],
    [
      1234,
      "de",
      `zwölf${SHY}hundert${SHY}vier${SHY}und${SHY}dreißig`,
      "spellout-numbering-year",
    ],
  ]));

test("French", (t) =>
  check(t, [
    [21, "fr", "vingt-et-un"],
    [71, "fr", "soixante-et-onze"],
    [80, "fr", "quatre-vingts"],
    [97, "fr", "quatre-vingt-dix-sept"],
    [70, "fr-CH", "septante"],
    [80, "fr-CH", "huitante"],
  ]));

test("Spanish picks the rule for the locale's decimal separator", (t) =>
  check(t, [
    [21, "es", "veintiuno"],
    [100, "es", "cien"],
    [1.5, "es", "uno coma cinco"],
    [1.5, "es-MX", "uno punto cinco"],
  ]));

test("plural forms", (t) =>
  check(t, [
    [21000, "ru", "двадцать одна тысяча"],
    [5000000, "ru", "пять миллионов"],
    [2000000, "pl", "dwa miliony"],
    [5000000, "pl", "pięć milionów"],
  ]));

test("other scripts", (t) =>
  check(t, [
    [123, "ja", "百二十三"],
    [10000, "ja", "一万"],
    [123, "zh", "一百二十三"],
    [1234, "ko", "천이백삼십사"],
    [123, "hi", "एक सौ त\u0947ईस"],
    [123, "ar", "مائة وثلاثة وعشرون"],
  ]));

test("fraction rule sets", (t) =>
  check(t, [[0.25, "lt", "dvidešimt penkios šimtosios"]]));

test("locales fall back to their parents and to the root locale", (t) =>
  check(t, [
    [123, "en-GB", "one hundred twenty-three"],
    [123, new Intl.Locale("zh-Hant-TW"), "一百二十三"],
    [7, "xx", "7"],
  ]));

test("special values", (t) =>
  check(t, [
    [NaN, "en", "not a number"],
    [Infinity, "en", "infinity"],
    [-0, "en", "zero"],
  ]));

test("every locale formats every rule set", () => {
  const values = [
    0,
    1,
    2,
    11,
    21,
    101,
    1000,
    12345,
    -42,
    3.14,
    0.25,
    1e18,
    2n ** 70n,
  ];
  for (const locale of [
    "en",
    "de",
    "fr",
    "ru",
    "ar",
    "hi",
    "ja",
    "lt",
    "cs",
    "he",
  ]) {
    for (const ruleSet of getRuleSets(locale)) {
      for (const value of values) {
        const result = numberToWords(value, locale, { ruleSet });
        assert.ok(result.length > 0, `${locale} ${ruleSet} ${value}`);
      }
    }
  }
});

test("getRuleSets", () => {
  const sets = getRuleSets("en");
  for (const name of [
    "spellout-numbering",
    "spellout-cardinal",
    "spellout-ordinal",
    "digits-ordinal",
    "roman-upper",
  ]) {
    assert.ok(sets.includes(name), name);
  }
  assert.ok(
    sets.every((name) => !name.startsWith("%")),
    "private rule sets are hidden",
  );
});

test("rejects invalid arguments", () => {
  assert.throws(() => numberToWords("1", "en"), TypeError);
  assert.throws(() => numberToWords(1, 42), TypeError);
  assert.throws(
    () => numberToWords(1, "en", { ruleSet: "spellout-missing" }),
    RangeError,
  );
  assert.throws(
    () => numberToWords(1, "en", { ruleSet: "%%and" }),
    RangeError,
    "private rule set",
  );
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
