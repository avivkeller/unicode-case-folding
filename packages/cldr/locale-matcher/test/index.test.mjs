import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { VERSION, getBestMatch, matchLocale } from "../dist/index.mjs";

test("ICU's localeMatcherTest.txt", () => {
  const lines = fs
    .readFileSync(new URL("localeMatcherTest.txt", import.meta.url), "utf8")
    .split("\n");
  // The file has the canonical form of the supported locales it expects
  const canonical = (locale) => {
    if (locale === "i-klingon") return "tlh";
    try {
      return Intl.getCanonicalLocales(locale)[0];
    } catch {
      return locale;
    }
  };
  const matches = (actual, expected) =>
    expected === "null"
      ? actual === undefined
      : actual === expected || canonical(actual) === canonical(expected);
  // Some lists start with a number, which is not a locale
  const list = (value) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item && !/^\d+$/.test(item));

  let supported = [];
  let options = {};
  let count = 0;
  const failures = [];
  lines.forEach((text, index) => {
    const line = text.split("#")[0].trim();
    if (line.startsWith("** test:")) {
      supported = [];
      options = {};
    } else if (line.startsWith("@")) {
      const [key, value = ""] = line.slice(1).split("=");
      if (key === "supported") supported = list(value);
      else if (key === "default") options.defaultLocale = value || undefined;
      else if (key === "favor") options.favor = value || undefined;
      else if (key === "threshold") {
        options.threshold = value ? Number(value) : undefined;
      } else throw new Error(`Line ${index + 1}: ${line}`);
    } else if (line) {
      const [desired, results] = line.split(">>");
      const [expected, expectedDesired] = results
        .split("|")
        .map((field) => field.trim());
      const actual = matchLocale(list(desired), supported, options);
      const best = getBestMatch(list(desired), supported, options);
      count++;
      if (
        !matches(actual, expected) ||
        (expectedDesired && !matches(best?.desired, expectedDesired))
      ) {
        failures.push(`Line ${index + 1}: ${line}: ${actual}`);
      }
    }
  });
  assert.ok(count > 900);
  assert.deepEqual(failures, []);
});

test("matchLocale", async (t) => {
  const supported = ["en", "en-GB", "es", "es-419", "fr", "zh-CN", "zh-TW"];
  const cases = [
    ["fr-CA", "fr", "another region"],
    ["en-AU", "en-GB", "British English for most of the world"],
    ["en-CA", "en", "American English for Canada"],
    ["es-AR", "es-419", "Latin American Spanish"],
    ["zh-HK", "zh-TW", "the script of the region"],
    ["br", "fr", "a language that readers of another understand"],
    ["ja", "en", "the first supported locale if nothing matches"],
    [["ja", "es-MX"], "es-419", "the second preference"],
    [["fr-CH", "fr-FR", "en"], "fr", "a close match of the first preference"],
    ["EN_gb", "en-GB", "case and separator"],
  ];
  for (const [desired, expected, description] of cases) {
    await t.test(`${desired}: ${description}`, () => {
      assert.equal(matchLocale(desired, supported), expected);
    });
  }

  await t.test("returns the supported locale as given", () => {
    assert.equal(matchLocale("he-IL", ["en", "iw"]), "iw");
    const locales = [new Intl.Locale("de"), new Intl.Locale("pt-PT")];
    assert.equal(matchLocale(new Intl.Locale("pt-AO"), locales), locales[1]);
    assert.equal(matchLocale("pt", new Set(["pt-PT", "pt-BR"])), "pt-BR");
  });

  await t.test("defaultLocale", () => {
    assert.equal(
      matchLocale("ja", ["de", "fr"], { defaultLocale: "en" }),
      "en",
    );
    assert.equal(
      matchLocale("fr", ["de", "fr"], { defaultLocale: "en" }),
      "fr",
    );
    assert.equal(matchLocale("ja", []), undefined);
  });

  await t.test("threshold", () => {
    assert.equal(matchLocale("zh-TW", ["en", "zh-CN"]), "en");
    assert.equal(
      matchLocale("zh-TW", ["en", "zh-CN"], { threshold: 60 }),
      "zh-CN",
    );
  });

  await t.test("favor", () => {
    assert.equal(matchLocale("pl", ["ru", "fr"]), "ru");
    assert.equal(matchLocale("pl", ["ru", "fr"], { favor: "script" }), "fr");
  });

  await t.test("rejects invalid arguments", () => {
    assert.throws(() => matchLocale("not a locale", ["en"]), RangeError);
    assert.throws(() => matchLocale("en", ["not a locale"]), RangeError);
    assert.throws(() => matchLocale("en", ["en"], { favor: "x" }), RangeError);
    assert.throws(
      () => matchLocale("en", ["en"], { threshold: -1 }),
      RangeError,
    );
  });
});

test("getBestMatch", () => {
  assert.deepEqual(getBestMatch(["de-AT", "fr"], ["fr", "de", "ja"]), {
    supported: "de",
    desired: "de-AT",
    distance: 4,
  });
  assert.equal(getBestMatch("de", ["gsw"]), undefined, "is one-way");
  assert.equal(getBestMatch("gsw", ["de"]).distance, 8);
  assert.equal(getBestMatch("ja", ["de", "fr"]), undefined);
  assert.equal(getBestMatch([], ["de", "fr"]), undefined);
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.matchLocale);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
