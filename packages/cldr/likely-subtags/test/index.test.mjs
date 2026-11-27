import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  VERSION,
  getLikelySubtags,
  maximize,
  minimize,
} from "../dist/index.mjs";

test("likelySubtags.txt", () => {
  const cases = fs
    .readFileSync(new URL("likelySubtags.txt", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("#"))
    .map((line) => line.split(";").map((field) => field.trim()));
  assert.ok(cases.length > 1000);

  const failures = [];
  for (const [source, addLikely, favorScript, favorRegion] of cases) {
    // An empty field repeats the one before it
    const maximized = addLikely === "FAIL" ? source : addLikely;
    const expected = {
      maximize: maximized,
      "minimize favoring script": favorScript || maximized,
      "minimize favoring region": favorRegion || favorScript || maximized,
    };
    const actual = {
      maximize: maximize(source),
      "minimize favoring script": minimize(source, { favor: "script" }),
      "minimize favoring region": minimize(source),
    };
    for (const [operation, value] of Object.entries(expected)) {
      if (actual[operation] !== value) {
        failures.push(`${operation} ${source}: ${actual[operation]}`);
      }
    }
  }
  assert.deepEqual(failures, []);
});

test("maximize", () => {
  assert.equal(maximize("en"), "en-Latn-US");
  assert.equal(maximize("zh-TW"), "zh-Hant-TW");
  assert.equal(maximize("sr-ME"), "sr-Latn-ME");
  assert.equal(maximize("und"), "en-Latn-US");
  assert.equal(maximize("und-Cyrl"), "ru-Cyrl-RU");
  assert.equal(maximize("und-JP"), "ja-Jpan-JP");
  assert.equal(maximize("EN-gb"), "en-Latn-GB", "canonicalizes");
  assert.equal(maximize(new Intl.Locale("pa-PK")), "pa-Arab-PK");
  assert.equal(maximize("en-Zzzz-ZZ"), "en-Latn-US", "unknown subtags");
  assert.equal(maximize("qaa"), "qaa", "nothing is likely");
  assert.equal(
    maximize("de-1996-u-co-phonebk"),
    "de-Latn-DE-1996-u-co-phonebk",
  );
  assert.throws(() => maximize("not a locale"), RangeError);
});

test("getLikelySubtags", () => {
  assert.deepEqual(getLikelySubtags("zh-TW"), {
    language: "zh",
    script: "Hant",
    region: "TW",
  });
  assert.deepEqual(getLikelySubtags("und-Hira"), {
    language: "ja",
    script: "Hira",
    region: "JP",
  });
  assert.deepEqual(getLikelySubtags("qaa-CH"), {
    language: "qaa",
    script: undefined,
    region: "CH",
  });
});

test("minimize", () => {
  assert.equal(minimize("en-Latn-US"), "en");
  assert.equal(minimize("zh-Hant-TW"), "zh-TW");
  assert.equal(minimize("zh-Hant-TW", { favor: "script" }), "zh-Hant");
  assert.equal(minimize("zh-TW"), "zh-TW");
  assert.equal(minimize("sr-Cyrl-RS"), "sr");
  assert.equal(minimize("en-Latn-GB-u-hc-h23"), "en-GB-u-hc-h23");
  assert.equal(minimize(new Intl.Locale("ja-Jpan-JP")), "ja");
  assert.throws(() => minimize("en", { favor: "language" }), RangeError);
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.maximize);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
