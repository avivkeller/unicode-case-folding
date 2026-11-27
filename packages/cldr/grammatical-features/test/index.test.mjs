import assert from "node:assert/strict";
import test from "node:test";
import { VERSION, getGrammaticalFeatures } from "../dist/index.mjs";

test("getGrammaticalFeatures", async (t) => {
  await t.test("cases and genders", () => {
    assert.deepEqual(getGrammaticalFeatures("de"), {
      cases: ["nominative", "genitive", "dative", "accusative"],
      genders: ["masculine", "feminine", "neuter"],
      definiteness: [],
    });
  });

  await t.test("genders only", () => {
    assert.deepEqual(getGrammaticalFeatures("fr"), {
      cases: [],
      genders: ["masculine", "feminine"],
      definiteness: [],
    });
  });

  await t.test("definiteness", () => {
    assert.deepEqual(getGrammaticalFeatures("sv").definiteness, [
      "definite",
      "indefinite",
    ]);
    assert.ok(getGrammaticalFeatures("he").definiteness.includes("construct"));
  });

  await t.test("a language whose nouns do not vary", () => {
    assert.deepEqual(getGrammaticalFeatures("en"), {
      cases: [],
      genders: [],
      definiteness: [],
    });
  });

  await t.test("many cases", () => {
    assert.equal(getGrammaticalFeatures("fi").cases.length, 14);
  });

  await t.test("uses the language of the locale", () => {
    assert.deepEqual(
      getGrammaticalFeatures("pt-BR"),
      getGrammaticalFeatures("pt"),
    );
    assert.deepEqual(
      getGrammaticalFeatures(new Intl.Locale("sr-Latn-RS")),
      getGrammaticalFeatures("sr"),
    );
  });

  await t.test("a language without data", () => {
    assert.equal(getGrammaticalFeatures("eo"), undefined);
    assert.equal(getGrammaticalFeatures("und"), undefined);
  });

  await t.test("returns copies", () => {
    getGrammaticalFeatures("de").cases.push("vocative");
    assert.equal(getGrammaticalFeatures("de").cases.length, 4);
  });

  await t.test("rejects invalid arguments", () => {
    assert.throws(() => getGrammaticalFeatures("not a locale"), RangeError);
  });
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.getGrammaticalFeatures);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
