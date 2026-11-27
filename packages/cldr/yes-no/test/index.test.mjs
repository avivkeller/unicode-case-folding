import assert from "node:assert/strict";
import test from "node:test";
import { VERSION, getYesNo, parseYesNo } from "../dist/index.mjs";

test("parseYesNo", async (t) => {
  const cases = [
    ["yes", "en", true],
    ["Y", "en", true],
    [" no ", "en", false],
    ["maybe", "en", undefined],
    ["ja", "de", true],
    ["Nein", "de", false],
    ["oui", "fr", true],
    ["はい", "ja", true], // はい
    ["いいえ", "ja", false], // いいえ
    ["evet", "tr", true],
    ["ja", "de-AT", true],
    ["yes", "xx", true],
  ];
  for (const [answer, locale, expected] of cases) {
    await t.test(`${locale}: ${answer}`, () => {
      assert.equal(parseYesNo(answer, locale), expected);
    });
  }

  await t.test("rejects invalid arguments", () => {
    assert.throws(() => parseYesNo(1, "en"), TypeError);
    assert.throws(() => parseYesNo("y", 1), TypeError);
  });
});

test("getYesNo", () => {
  assert.deepEqual(getYesNo("en"), { yes: ["yes", "y"], no: ["no", "n"] });
  assert.deepEqual(getYesNo("de"), { yes: ["ja", "j"], no: ["nein", "n"] });
  getYesNo("en").yes.push("mutated");
  assert.deepEqual(getYesNo("en").yes, ["yes", "y"], "returns copies");
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.parseYesNo);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
