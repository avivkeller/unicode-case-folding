import assert from "node:assert/strict";
import test from "node:test";
import { VERSION, getCalendars } from "../dist/index.mjs";

const HIJRI = ["islamic", "islamic-civil", "islamic-tbla"];

test("getCalendars", async (t) => {
  const cases = [
    ["en-US", ["gregory"]],
    ["ja", ["gregory", "japanese"]],
    ["th", ["buddhist", "gregory"]],
    ["fa-IR", ["persian", "gregory", ...HIJRI]],
    ["he", ["gregory", "hebrew", ...HIJRI]],
    ["ar-EG", ["gregory", "coptic", ...HIJRI]],
    ["ar-SA", ["gregory", "islamic-umalqura", "islamic", "islamic-rgsa"]],
    ["zh-Hant", ["gregory", "roc", "chinese"]], // Likely subtags: zh-Hant-TW
    ["zh", ["gregory", "chinese"]],
    ["en-JP", ["gregory", "japanese"]],
    ["und", ["gregory"]],
  ];
  for (const [locale, expected] of cases) {
    await t.test(locale, () => {
      assert.deepEqual(getCalendars(locale), expected);
    });
  }

  await t.test("honors -u-ca- and -u-rg-", () => {
    assert.deepEqual(getCalendars("en-u-ca-hebrew"), ["hebrew"]);
    assert.deepEqual(
      getCalendars(new Intl.Locale("th", { calendar: "gregory" })),
      ["gregory"],
    );
    assert.deepEqual(getCalendars("en-u-rg-jpzzzz"), ["gregory", "japanese"]);
  });

  await t.test("returns copies", () => {
    getCalendars("ja").length = 0;
    assert.deepEqual(getCalendars("ja"), ["gregory", "japanese"]);
  });

  await t.test("every calendar is one Intl.DateTimeFormat knows", () => {
    const known = Intl.supportedValuesOf("calendar");
    for (const locale of ["ja", "th", "fa", "he", "ar-EG", "ar-SA", "zh-TW"]) {
      for (const calendar of getCalendars(locale)) {
        assert.ok(known.includes(calendar), calendar);
      }
    }
  });

  await t.test("rejects invalid locales", () => {
    assert.throws(() => getCalendars(1), TypeError);
    assert.throws(() => getCalendars("not a locale"), RangeError);
  });
});

test("matches Intl.Locale.prototype.getCalendars()", (t) => {
  if (typeof Intl.Locale.prototype.getCalendars !== "function") {
    return t.skip("not supported by this engine");
  }
  for (const locale of [
    "en-US",
    "en-GB",
    "de-DE",
    "ja-JP",
    "th-TH",
    "fa-IR",
    "he-IL",
    "ar-EG",
    "ar-SA",
    "hi-IN",
    "ko-KR",
    "zh-CN",
    "zh-TW",
    "am-ET",
    "en-u-ca-hebrew",
  ]) {
    assert.deepEqual(
      getCalendars(locale),
      new Intl.Locale(locale).getCalendars(),
      locale,
    );
  }
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.getCalendars);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
