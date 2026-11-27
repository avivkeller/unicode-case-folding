import assert from "node:assert/strict";
import test from "node:test";
import {
  VERSION,
  getRegionCodes,
  toAlpha2,
  toAlpha3,
  toNumeric,
} from "../dist/index.mjs";

test("toAlpha2", () => {
  assert.equal(toAlpha2("USA"), "US");
  assert.equal(toAlpha2("840"), "US");
  assert.equal(toAlpha2(840), "US");
  assert.equal(toAlpha2(4), "AF", "numbers are padded");
  assert.equal(toAlpha2("deu"), "DE", "case-insensitive");
  assert.equal(toAlpha2("ABC"), undefined);
  assert.equal(toAlpha2("001"), undefined, "not a country");
});

test("toAlpha3", () => {
  assert.equal(toAlpha3("US"), "USA");
  assert.equal(toAlpha3(392), "JPN");
  assert.equal(toAlpha3("IC"), undefined, "the Canary Islands have none");
});

test("toNumeric", () => {
  assert.equal(toNumeric("US"), "840");
  assert.equal(toNumeric("AFG"), "004");
  assert.equal(toNumeric(76), "076");
  assert.equal(toNumeric("AC"), undefined, "Ascension Island has none");
});

test("getRegionCodes", () => {
  assert.deepEqual(getRegionCodes("CH"), {
    alpha2: "CH",
    alpha3: "CHE",
    numeric: "756",
  });
  assert.deepEqual(getRegionCodes("che"), getRegionCodes(756));
  assert.deepEqual(getRegionCodes("IC"), {
    alpha2: "IC",
    alpha3: undefined,
    numeric: undefined,
  });
  assert.equal(getRegionCodes("ABC"), undefined);
});

test("current regions win over deprecated ones", () => {
  assert.equal(toAlpha2(104), "MM", "not BU");
  assert.equal(toAlpha3("BU"), "BUR", "deprecated regions still convert");
});

test("round-trips every alpha-2 code Intl knows", () => {
  const names = new Intl.DisplayNames("en", { type: "region" });
  let checked = 0;
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      const alpha3 = toAlpha3(code);
      if (!alpha3 || names.of(code) === code) continue;
      const back = toAlpha2(alpha3);
      assert.equal(toAlpha3(back), alpha3, code);
      checked++;
    }
  }
  assert.ok(checked > 240);
});

test("rejects invalid arguments", () => {
  assert.throws(() => toAlpha2(null), TypeError);
  assert.equal(toAlpha2(1000), undefined);
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.getRegionCodes);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
