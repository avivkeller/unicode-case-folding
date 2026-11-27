import assert from "node:assert/strict";
import test from "node:test";
import {
  encodeLocaleTable,
  lookupLocale,
  normalizeLocale,
  resolveLocale,
} from "../src/locale.mjs";

test("normalizeLocale", () => {
  assert.equal(normalizeLocale("EN-us"), "en-US");
  assert.equal(normalizeLocale("zh-hant-tw-u-nu-hanidec"), "zh-Hant-TW");
  assert.equal(normalizeLocale(new Intl.Locale("fr-CA")), "fr-CA");
  assert.throws(() => normalizeLocale("en_US"), RangeError);
});

test("encodeLocaleTable", async (t) => {
  const data = new Map([
    ["und", "root"],
    ["en", "english"],
    ["en-GB", "english"], // Same as its parent
    ["en-AU", "australian"],
    ["zh", "simplified"],
    ["zh-Hant", "traditional"],
    ["zh-Hant-HK", "traditional"], // Same as its parent
  ]);
  const likelySubtags = {
    "zh-TW": "zh-Hant-TW",
    "zh-HK": "zh-Hant-HK",
    "zh-SG": "zh-Hans-SG", // Same result as plain "zh"
    "und-TW": "zh-Hant-TW", // Region alone
  };
  const table = encodeLocaleTable(data, likelySubtags);

  await t.test("stores equal values once", () => {
    assert.deepEqual(table.values, [
      "root",
      "english",
      "australian",
      "simplified",
      "traditional",
    ]);
  });

  await t.test("drops locales that fall back to an equal value", () => {
    assert.deepEqual([...table.locales.keys()].sort(), [
      "en",
      "en-AU",
      "und",
      "zh",
      "zh-Hant",
    ]);
  });

  await t.test("keeps only aliases that change the result", () => {
    assert.deepEqual([...table.aliases].sort(), [
      ["zh-HK", "zh-Hant-HK"],
      ["zh-TW", "zh-Hant-TW"],
    ]);
  });

  await t.test("lookup gives every original locale its value", () => {
    for (const [locale, value] of data) {
      assert.equal(lookupLocale(table, locale), value, locale);
    }
  });

  await t.test("lookup falls back", () => {
    assert.equal(lookupLocale(table, "en-GB-oxendict"), "english");
    assert.equal(
      lookupLocale(table, "en-Latn-AU"),
      "english",
      "unknown script",
    );
    assert.equal(lookupLocale(table, "zh-TW"), "traditional", "likely script");
    assert.equal(lookupLocale(table, "zh-SG"), "simplified");
    assert.equal(lookupLocale(table, "xx-YY"), "root");
    assert.equal(resolveLocale(table, "en-AU-u-nu-latn"), "en-AU");
  });

  await t.test("requires a root value", () => {
    assert.throws(() => encodeLocaleTable(new Map([["en", 1]]), {}), /"und"/);
  });
});
