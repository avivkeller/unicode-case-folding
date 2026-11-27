import assert from "node:assert/strict";
import test from "node:test";
import { VERSION, getFallbackChain, getParentLocale } from "../dist/index.mjs";

test("getFallbackChain", async (t) => {
  const cases = [
    ["es-MX", ["es-MX", "es-419", "es"], "a parent that is not a prefix"],
    ["en-AT", ["en-AT", "en-150", "en-001", "en"], "several such parents"],
    ["de-CH", ["de-CH", "de"], "truncation"],
    ["fr", ["fr"], "a language alone"],
    ["zh-Hant-HK", ["zh-Hant-HK", "zh-Hant"], "never across scripts"],
    ["zh-TW", ["zh-TW", "zh-Hant"], "a region that implies a script"],
    ["zh-MO", ["zh-MO", "zh-Hant-HK", "zh-Hant"], "implied script and parent"],
    ["zh-CN", ["zh-CN", "zh"], "a region that implies the likely script"],
    ["zh-Hans-SG", ["zh-Hans-SG", "zh-Hans", "zh"], "the likely script"],
    ["sr-ME", ["sr-ME", "sr-Latn"], "Montenegro implies Latin"],
    ["sr-Cyrl-ME", ["sr-Cyrl-ME", "sr-Cyrl", "sr"], "an explicit script"],
    ["ru-Latn", ["ru-Latn"], "a script that is not the likely one"],
    ["en-Latn-GB", ["en-Latn-GB", "en-001", "en"], "a redundant script"],
    ["hi-Latn", ["hi-Latn", "en-IN", "en-001", "en"], "Hinglish"],
    ["nb-NO", ["nb-NO", "nb", "no"], "Norwegian"],
    ["ca-ES-valencia", ["ca-ES-valencia", "ca-ES", "ca"], "a variant"],
    ["de-CH-u-co-phonebk", ["de-CH", "de"], "extensions are dropped"],
    ["EN-gb", ["en-GB", "en-001", "en"], "canonicalizes"],
    ["und-US", ["und-US"], "no language"],
    ["und", ["und"], "the root locale"],
  ];
  for (const [locale, expected, description] of cases) {
    await t.test(`${locale}: ${description}`, () => {
      assert.deepEqual(getFallbackChain(locale), expected);
    });
  }

  await t.test("accepts Intl.Locale", () => {
    assert.deepEqual(getFallbackChain(new Intl.Locale("es-AR")), [
      "es-AR",
      "es-419",
      "es",
    ]);
  });

  await t.test("rejects invalid locales", () => {
    assert.throws(() => getFallbackChain("not a locale"), RangeError);
    assert.throws(() => getFallbackChain(1), TypeError);
  });
});

test("getParentLocale", () => {
  assert.equal(getParentLocale("es-MX"), "es-419");
  assert.equal(getParentLocale("es"), undefined);
  assert.equal(getParentLocale("zh-Hant"), undefined);
  assert.equal(getParentLocale("zh-Hans"), "zh");
  assert.equal(getParentLocale("und"), undefined);
});

test("never mixes scripts", () => {
  const script = (locale) => new Intl.Locale(locale).maximize().script;
  for (const locale of [
    "zh-TW",
    "zh-HK",
    "zh-Hant-MY",
    "sr-Latn-BA",
    "sr-XK",
    "uz-AF",
    "uz-Cyrl-UZ",
    "az-IR",
    "pa-Arab-PK",
    "mn-CN",
    "yue-CN",
    "ks-Deva-IN",
    "ff-Adlm-GN",
    "shi-Latn-MA",
    "vai-Latn-LR",
    "kk-CN",
  ]) {
    for (const ancestor of getFallbackChain(locale)) {
      assert.equal(script(ancestor), script(locale), `${locale}: ${ancestor}`);
    }
  }
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.getFallbackChain);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
