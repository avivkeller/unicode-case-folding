import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { VERSION, canonicalizeLocale } from "../dist/index.mjs";

test("localeCanonicalization.txt", () => {
  const cases = fs
    .readFileSync(
      new URL("localeCanonicalization.txt", import.meta.url),
      "utf8",
    )
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("#"))
    .map((line) =>
      line.split(";").map((field) => field.trim().replaceAll("_", "-")),
    );
  assert.ok(cases.length > 1000);

  const failures = [];
  for (const [source, expected] of cases) {
    const actual = canonicalizeLocale(source);
    if (actual !== expected) failures.push(`${source}: ${actual}`);
  }
  assert.deepEqual(failures, []);
});

test("canonicalizeLocale", async (t) => {
  const cases = [
    ["iw-IL", "he-IL", "deprecated language"],
    ["sh", "sr-Latn", "a language that implies a script"],
    ["cmn-TW", "zh-TW", "macrolanguage"],
    ["en-840", "en-US", "numeric region"],
    ["hy-SU", "hy-AM", "split region: likely for the language"],
    ["az-Arab-SU", "az-Arab-RU", "split region: the first one otherwise"],
    ["sgn-US", "ase", "language and region"],
    ["hy-arevela", "hy", "a variant that is removed"],
    ["i-klingon", "tlh", "legacy tag"],
    ["zh-yue-HK", "yue-HK", "extended language"],
    ["x-private", "und-x-private", "private use only"],
    ["Latn-DE", "und-Latn-DE", "initial script"],
    ["EN_latn_us", "en-Latn-US", "case and separator"],
    ["sl-rozaj-biske-1994", "sl-1994-biske-rozaj", "variant order"],
    ["en-u-nu-arab-t-hi", "en-t-hi-u-nu-arab", "extension order"],
    ["en-u-nu-latn-ca-gregory", "en-u-ca-gregory-nu-latn", "keyword order"],
    ["en-u-kn-true", "en-u-kn", "true is removed"],
    ["en-u-ca-islamicc", "en-u-ca-islamic-civil", "preferred type"],
    ["en-u-sd-cn11", "en-u-sd-cnbj", "subdivision alias"],
    ["en-u-rg-fi01", "en-u-rg-axzzzz", "subdivision that became a region"],
    ["en-u-cu-eur-cu-usd", "en-u-cu-eur", "the first of repeated keys"],
    ["und-t-iw-m0-names", "und-t-he-m0-prprname", "transform extension"],
    ["en", "en", "nothing to do"],
  ];
  for (const [source, expected, description] of cases) {
    await t.test(`${source}: ${description}`, () => {
      assert.equal(canonicalizeLocale(source), expected);
    });
  }

  await t.test("accepts Intl.Locale", () => {
    assert.equal(canonicalizeLocale(new Intl.Locale("en-us")), "en-US");
  });

  await t.test("rejects what is not a locale", () => {
    for (const tag of [
      "",
      "e",
      "en--US",
      "en-a",
      "en-u",
      "en-x",
      "en-u-nu-latn-u-ca-gregory",
      "en-fonipa-fonipa",
      "en-US-GB",
      "en-t-m0",
      "en-toolongsubtag",
      "not a locale",
    ]) {
      assert.throws(() => canonicalizeLocale(tag), RangeError, tag);
    }
    assert.throws(() => canonicalizeLocale(1), TypeError);
  });
});

test("agrees with Intl.getCanonicalLocales()", () => {
  // Tags whose aliases predate the CLDR versions of current engines
  for (const tag of [
    "iw",
    "ji-Latn",
    "jw-ID",
    "mo-MD",
    "sh-BA",
    "tl-PH",
    "no-nynorsk",
    "aar",
    "heb-x-private",
    "en-BU",
    "sr-YU",
    "und-Cyrl-SU",
    "ka-SU",
    "nl-AN",
    "ar-NT",
    "sgn-DE",
    "art-lojban",
    "zh-hakka",
    "en-US-u-attr2-attr1-ca-gregory",
    "ar-u-nu-arab-ca-islamic",
    "en-u-kb-yes-ka-shifted",
    "en-u-tz-est5edt",
    "en-u-sd-frg",
    "en-t-d0-fwidth-m0-names",
    "de-t-m0-cldr-x0-1prefix",
    "ja-u-ca-japanese-nu-latn-x-foo",
    "en-Latn-fonipa-scouse",
  ]) {
    assert.equal(
      canonicalizeLocale(tag),
      Intl.getCanonicalLocales(tag)[0],
      tag,
    );
  }
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.canonicalizeLocale);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
