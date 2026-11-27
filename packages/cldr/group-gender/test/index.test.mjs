import assert from "node:assert/strict";
import test from "node:test";
import { VERSION, getGroupGender } from "../dist/index.mjs";

test("getGroupGender", async (t) => {
  const cases = [
    [["male", "female"], "fr", "male", "one man is enough"],
    [["female", "other"], "fr", "male", "unknown counts as male"],
    [["male", "male"], "es-MX", "male", "a regional locale"],
    [["male", "female"], "el", "other", "a mixed group is neutral"],
    [["female", "female"], "is", "female", "women only"],
    [["female", "other"], "el", "other", "unknown makes it neutral"],
    [["male", "male"], "en", "other", "no gender for groups"],
    [["female", "female"], "zh-Hant-TW", "female", "a script and a region"],
    [["female", "male"], "xx", "other", "an unknown language"],
    [["female"], "en", "female", "one person keeps their gender"],
    [[], "fr", "other", "nobody"],
  ];
  for (const [genders, locale, expected, description] of cases) {
    await t.test(`${locale} ${genders}: ${description}`, () => {
      assert.equal(getGroupGender(genders, locale), expected);
    });
  }

  await t.test("accepts any iterable and Intl.Locale", () => {
    const genders = new Set(["female", "male"]);
    assert.equal(getGroupGender(genders, new Intl.Locale("it")), "male");
  });

  await t.test("rejects invalid arguments", () => {
    assert.throws(() => getGroupGender(["man"], "fr"), RangeError);
    assert.throws(() => getGroupGender(["male"], "not a locale"), RangeError);
  });
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.getGroupGender);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
