import assert from "node:assert/strict";
import test from "node:test";
import { VERSION, getQuotes, quote, smartQuotes } from "../dist/index.mjs";

test("getQuotes", async (t) => {
  const marks = (locale) => Object.values(getQuotes(locale)).join("");
  const cases = [
    ["en", "“”‘’"],
    ["de", "„“‚‘"],
    ["fr", "«»«»"],
    ["ja", "「」『』"],
    ["zh", "“”‘’"],
    ["sv", "””’’"],
  ];
  for (const [locale, expected] of cases) {
    await t.test(locale, () => assert.equal(marks(locale), expected));
  }

  await t.test("falls back to parent locales", () => {
    assert.equal(marks("de-AT-x-private"), marks("de"));
    assert.equal(marks("en-Latn-US"), marks("en"));
  });

  await t.test("uses likely scripts for regions", () => {
    assert.equal(marks("zh-TW"), "「」『』");
    assert.equal(marks("zh-HK"), "「」『』");
    assert.equal(marks("zh-CN"), "“”‘’");
  });

  await t.test("normalizes tags and accepts Intl.Locale", () => {
    assert.equal(marks("DE-ch"), marks("de-CH"));
    assert.equal(marks(new Intl.Locale("ja-JP-u-ca-japanese")), "「」『』");
  });

  await t.test("falls back to the root locale", () => {
    assert.equal(marks("xx"), "“”‘’");
  });

  await t.test("rejects invalid locales", () => {
    assert.throws(() => getQuotes(42), TypeError);
  });
});

test("quote", () => {
  assert.equal(quote("Hallo", "de"), "„Hallo“");
  assert.equal(quote("Hallo", "de", { alternate: true }), "‚Hallo‘");
  assert.equal(quote("やあ", "ja"), "「やあ」");
});

test("smartQuotes", async (t) => {
  const cases = [
    ['"Hello," she said.', "en", "“Hello,” she said."],
    ["\"He said 'hi' to me\"", "en", "“He said ‘hi’ to me”"],
    ["\"He said 'hi' to me\"", "de", "„He said ‚hi‘ to me“"],
    ['"Bonjour"', "fr", "«Bonjour»"],
    ["don't, l'homme", "en", "don’t, l’homme"],
    ["the students' books", "en", "the students’ books"],
    ["back in the '90s", "en", "back in the ’90s"],
    ["('quoted')", "en", "(‘quoted’)"],
    ['a "b" — "c"', "en", "a “b” — “c”"],
    ["\"'Nested,' he said\"", "en", "“‘Nested,’ he said”"],
    ['"same marks"', "sv", "”same marks”"],
    ["no quotes", "en", "no quotes"],
    ["", "en", ""],
  ];
  for (const [input, locale, expected] of cases) {
    await t.test(`${locale}: ${input}`, () => {
      assert.equal(smartQuotes(input, locale), expected);
    });
  }

  await t.test("rejects non-strings", () => {
    assert.throws(() => smartQuotes(null, "en"), TypeError);
  });
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
