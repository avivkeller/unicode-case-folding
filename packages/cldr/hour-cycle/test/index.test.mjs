import assert from "node:assert/strict";
import test from "node:test";
import { VERSION, getHourCycle, getHourCycles } from "../dist/index.mjs";

test("getHourCycles", async (t) => {
  const cases = [
    ["en-US", ["h12", "h23"]],
    ["en-GB", ["h23", "h12"]],
    ["fr-CA", ["h23", "h12"]],
    ["de", ["h23", "h12"]],
    ["ja", ["h23", "h11", "h12"]],
    ["es-419", ["h12", "h23"]],
    ["zh-Hant", ["h12", "h23"]], // Likely subtags: zh-Hant-TW
    ["zh", ["h23", "h12"]],
    ["und", ["h12", "h23"]], // Likely subtags: en-Latn-US
  ];
  for (const [locale, expected] of cases) {
    await t.test(locale, () => {
      assert.deepEqual(getHourCycles(locale), expected);
    });
  }

  await t.test("uses the likely region of a language", () => {
    assert.deepEqual(getHourCycles("en"), getHourCycles("en-US"));
    assert.deepEqual(getHourCycles("pt"), getHourCycles("pt-BR"));
  });

  await t.test("honors -u-hc- and -u-rg-", () => {
    assert.deepEqual(getHourCycles("de-u-hc-h12"), ["h12"]);
    assert.deepEqual(
      getHourCycles(new Intl.Locale("en", { hourCycle: "h11" })),
      ["h11"],
    );
    assert.deepEqual(getHourCycles("en-u-rg-gbzzzz"), getHourCycles("en-GB"));
  });

  await t.test("returns copies", () => {
    getHourCycles("en-US").length = 0;
    assert.deepEqual(getHourCycles("en-US"), ["h12", "h23"]);
  });

  await t.test("rejects invalid locales", () => {
    assert.throws(() => getHourCycles(1), TypeError);
    assert.throws(() => getHourCycles("not a locale"), RangeError);
  });
});

test("getHourCycle", () => {
  assert.equal(getHourCycle("en-US"), "h12");
  assert.equal(getHourCycle("fr"), "h23");
  assert.equal(getHourCycle("en-US-u-hc-h23"), "h23");
});

test("matches Intl.Locale.prototype.getHourCycles()", (t) => {
  if (typeof Intl.Locale.prototype.getHourCycles !== "function") {
    return t.skip("not supported by this engine");
  }
  // Engines return the hour cycle of the locale's time format alone
  for (const locale of [
    "en-US",
    "en-GB",
    "en-AU",
    "en-IN",
    "fr-FR",
    "fr-CA",
    "de-DE",
    "es-ES",
    "es-MX",
    "pt-BR",
    "ru-RU",
    "ar-EG",
    "ar-SA",
    "he-IL",
    "fa-IR",
    "hi-IN",
    "ja-JP",
    "ko-KR",
    "zh-CN",
    "zh-TW",
    "th-TH",
    "en-US-u-hc-h23",
  ]) {
    assert.equal(
      getHourCycle(locale),
      new Intl.Locale(locale).getHourCycles()[0],
      locale,
    );
  }
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.getHourCycle);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
