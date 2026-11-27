import assert from "node:assert/strict";
import test from "node:test";
import { VERSION, getWeekInfo } from "../dist/index.mjs";

const week = (firstDay, weekend, minimalDays) => ({
  firstDay,
  weekend,
  minimalDays,
});

test("getWeekInfo", async (t) => {
  const cases = [
    ["en-US", week(7, [6, 7], 1)],
    ["en-GB", week(1, [6, 7], 4)],
    ["de", week(1, [6, 7], 4)],
    ["fr-CA", week(7, [6, 7], 1)],
    ["ar-EG", week(6, [5, 6], 1)],
    ["he", week(7, [5, 6], 1)],
    ["fa", week(6, [5], 1)],
    ["hi-IN", week(7, [7], 1)],
    ["zh-Hant", week(7, [6, 7], 1)],
    ["und", week(7, [6, 7], 1)], // Likely subtags: en-Latn-US
  ];
  for (const [locale, expected] of cases) {
    await t.test(locale, () => assert.deepEqual(getWeekInfo(locale), expected));
  }

  await t.test("uses the likely region of a language", () => {
    assert.deepEqual(getWeekInfo("en"), getWeekInfo("en-US"));
    assert.deepEqual(getWeekInfo("pt"), getWeekInfo("pt-BR"));
  });

  await t.test("honors -u-fw- and -u-rg-", () => {
    assert.equal(getWeekInfo("en-US-u-fw-mon").firstDay, 1);
    assert.deepEqual(getWeekInfo("en-u-rg-gbzzzz"), getWeekInfo("en-GB"));
    assert.equal(
      getWeekInfo(new Intl.Locale("en-US", { firstDayOfWeek: "fri" })).firstDay,
      5,
    );
  });

  await t.test("matches Intl.Locale.prototype.getWeekInfo()", (t) => {
    if (typeof Intl.Locale.prototype.getWeekInfo !== "function") {
      return t.skip("not supported by this engine");
    }
    for (const locale of [
      "en-US",
      "en-GB",
      "de-DE",
      "ar-EG",
      "ar-SA",
      "fa-IR",
      "he-IL",
      "ja-JP",
      "pt-BR",
      "hi-IN",
      "ms-MY",
      "es-MX",
    ]) {
      // Engines no longer return minimalDays, which this package adds
      const { firstDay, weekend } = getWeekInfo(locale);
      const native = new Intl.Locale(locale).getWeekInfo();
      assert.deepEqual(
        { firstDay, weekend },
        { firstDay: native.firstDay, weekend: native.weekend },
        locale,
      );
    }
  });

  await t.test("rejects invalid locales", () => {
    assert.throws(() => getWeekInfo(1), TypeError);
  });
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.getWeekInfo);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
