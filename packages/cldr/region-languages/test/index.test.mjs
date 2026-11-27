import assert from "node:assert/strict";
import test from "node:test";
import {
  VERSION,
  getOfficialLanguages,
  getRegionLanguages,
} from "../dist/index.mjs";

test("getOfficialLanguages", async (t) => {
  const cases = [
    ["BE", ["nl", "fr", "de"]],
    ["CA", ["en", "fr"]],
    ["JP", ["ja"]],
    ["IN", ["hi", "en"]],
    ["us", ["en"]],
    ["AQ", []],
    ["ZZ", []],
  ];
  for (const [region, expected] of cases) {
    await t.test(region, () => {
      assert.deepEqual(getOfficialLanguages(region), expected);
    });
  }

  await t.test("regional", () => {
    assert.ok(!getOfficialLanguages("CH").includes("rm"));
    assert.ok(getOfficialLanguages("CH", { regional: true }).includes("rm"));
  });
});

test("getRegionLanguages", () => {
  const swiss = getRegionLanguages("CH");
  assert.deepEqual(swiss[0], {
    language: "de",
    populationPercent: 76,
    officialStatus: "official",
  });
  assert.deepEqual(
    swiss.find(({ language }) => language === "gsw"),
    {
      language: "gsw",
      populationPercent: 66,
      officialStatus: "de_facto_official",
    },
  );
  assert.deepEqual(
    swiss.find(({ language }) => language === "en"),
    { language: "en", populationPercent: 45 },
  );
  assert.equal(getRegionLanguages("HK")[0].language, "zh-Hant");
  assert.deepEqual(getRegionLanguages("ZZ"), []);

  getRegionLanguages("CH")[0].language = "changed";
  assert.equal(getRegionLanguages("CH")[0].language, "de", "returns copies");
});

test("languages are sorted and well-formed in every region", () => {
  const names = new Intl.DisplayNames("en", { type: "region" });
  let regions = 0;
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const region = String.fromCharCode(a, b);
      const languages = getRegionLanguages(region);
      if (languages.length === 0) continue;
      regions++;
      assert.notEqual(names.of(region), region, region);
      languages.forEach(({ language, populationPercent }, index) => {
        assert.equal(new Intl.Locale(language).baseName, language);
        assert.ok(populationPercent >= 0 && populationPercent <= 100);
        if (index > 0) {
          assert.ok(
            populationPercent <= languages[index - 1].populationPercent,
          );
        }
      });
    }
  }
  assert.ok(regions > 240);
});

test("rejects invalid arguments", () => {
  assert.throws(() => getRegionLanguages(756), TypeError);
  assert.throws(() => getOfficialLanguages(null), TypeError);
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.getRegionLanguages);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
