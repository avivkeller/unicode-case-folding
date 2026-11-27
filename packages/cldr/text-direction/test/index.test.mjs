import assert from "node:assert/strict";
import test from "node:test";
import { VERSION, getTextDirection, isRightToLeft } from "../dist/index.mjs";

test("getTextDirection", async (t) => {
  const cases = [
    ["en", "ltr"],
    ["ar", "rtl"],
    ["ar-EG", "rtl"],
    ["he", "rtl"],
    ["fa", "rtl"],
    ["ur", "rtl"],
    ["yi", "rtl"],
    ["dv", "rtl"],
    ["ja", "ltr"],
    ["und", "ltr"],
    ["xx", "ltr"],
  ];
  for (const [locale, expected] of cases) {
    await t.test(locale, () =>
      assert.equal(getTextDirection(locale), expected),
    );
  }

  await t.test("a script subtag decides", () => {
    assert.equal(getTextDirection("ar-Latn"), "ltr");
    assert.equal(getTextDirection("az-Arab"), "rtl");
    assert.equal(getTextDirection("ff-Adlm"), "rtl");
    assert.equal(getTextDirection("ff"), "ltr");
  });

  await t.test("accepts Intl.Locale", () => {
    assert.equal(getTextDirection(new Intl.Locale("he-IL")), "rtl");
  });

  await t.test("rejects invalid locales", () => {
    assert.throws(() => getTextDirection(null), TypeError);
  });
});

test("isRightToLeft", () => {
  assert.equal(isRightToLeft("ar"), true);
  assert.equal(isRightToLeft("en-US"), false);
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
