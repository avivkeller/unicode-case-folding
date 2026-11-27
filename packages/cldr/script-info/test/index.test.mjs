import assert from "node:assert/strict";
import test from "node:test";
import {
  VERSION,
  getBaseScripts,
  getLanguageScripts,
  getScriptInfo,
} from "../dist/index.mjs";

test("getScriptInfo", async (t) => {
  await t.test("an alphabet", () => {
    assert.deepEqual(getScriptInfo("Latn"), {
      sampleCharacter: "L",
      hasCase: true,
      needsInputMethod: false,
      breaksBetweenLetters: false,
      shaping: "minimal",
    });
  });

  await t.test("case", () => {
    assert.equal(getScriptInfo("Grek").hasCase, true);
    assert.equal(getScriptInfo("Arab").hasCase, false);
  });

  await t.test("input methods", () => {
    assert.equal(getScriptInfo("Jpan").needsInputMethod, true);
    assert.equal(getScriptInfo("Cyrl").needsInputMethod, false);
  });

  await t.test("line breaks between letters", () => {
    assert.equal(getScriptInfo("Thai").breaksBetweenLetters, true);
    assert.equal(getScriptInfo("Kore").breaksBetweenLetters, false);
  });

  await t.test("shaping", () => {
    assert.equal(getScriptInfo("Arab").shaping, "required");
    assert.equal(getScriptInfo("Thai").shaping, "minimal");
    assert.equal(getScriptInfo("Hani").shaping, "none");
  });

  await t.test("unknown properties", () => {
    const common = getScriptInfo("Zyyy");
    assert.equal(common.sampleCharacter, "@");
    assert.equal(common.hasCase, undefined);
    assert.equal(common.shaping, undefined);
  });

  await t.test("any case of the code", () => {
    assert.deepEqual(getScriptInfo("arab"), getScriptInfo("Arab"));
  });

  await t.test("a script without data", () => {
    assert.equal(getScriptInfo("Xxxx"), undefined);
  });

  await t.test("rejects invalid arguments", () => {
    assert.throws(() => getScriptInfo("Latin"), RangeError);
    assert.throws(() => getScriptInfo(1), TypeError);
  });
});

test("getBaseScripts", () => {
  assert.deepEqual(getBaseScripts("Jpan"), ["Hani", "Hira", "Kana"]);
  assert.deepEqual(getBaseScripts("Kore"), ["Hang", "Hani"]);
  assert.deepEqual(getBaseScripts("Hant"), ["Hani"]);
  assert.deepEqual(getBaseScripts("Aran"), ["Arab"], "Nastaliq");
  assert.deepEqual(getBaseScripts("latn"), ["Latn"]);
  getBaseScripts("Jpan").push("Latn");
  assert.equal(getBaseScripts("Jpan").length, 3, "returns copies");
  assert.throws(() => getBaseScripts("Japanese"), RangeError);
});

test("getLanguageScripts", () => {
  assert.deepEqual(getLanguageScripts("sr"), {
    primary: ["Cyrl", "Latn"],
    secondary: [],
  });
  assert.deepEqual(getLanguageScripts("ja").primary, ["Jpan"]);
  assert.deepEqual(getLanguageScripts("mn"), {
    primary: ["Cyrl"],
    secondary: ["Mong", "Phag"],
  });
  assert.deepEqual(
    getLanguageScripts(new Intl.Locale("sr-Latn-ME")),
    getLanguageScripts("sr"),
    "only the language is used",
  );
  assert.deepEqual(getLanguageScripts("und"), { primary: [], secondary: [] });
  assert.throws(() => getLanguageScripts("not a locale"), RangeError);
});

test("the scripts of languages have data", () => {
  for (const language of ["en", "ru", "zh", "ja", "ko", "ar", "hi", "th"]) {
    const { primary, secondary } = getLanguageScripts(language);
    for (const script of [...primary, ...secondary]) {
      assert.notEqual(getScriptInfo(script), undefined, script);
    }
  }
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.getScriptInfo);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
