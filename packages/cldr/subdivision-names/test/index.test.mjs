import assert from "node:assert/strict";
import test from "node:test";
import {
  VERSION,
  getSubdivisionName,
  getSubdivisions,
} from "../dist/index.mjs";

test("getSubdivisionName", async (t) => {
  const cases = [
    ["US-CA", undefined, "California"],
    ["us-ca", undefined, "California"],
    ["usca", undefined, "California"],
    ["GB-ENG", "en-GB", "England"],
    ["FR-75C", "en", "Paris"],
    ["GB-SCT", "fr", "Écosse"],
    ["GB-ENG", "zh-TW", "英格蘭"],
    ["GB-ENG", "zh-CN", "英格兰"],
    ["US-CA", "fr", "California"],
    ["XX-YY", "en", undefined],
    ["US", "en", undefined],
  ];
  for (const [code, locale, expected] of cases) {
    await t.test(`${code} in ${locale}`, () => {
      assert.equal(getSubdivisionName(code, locale), expected);
    });
  }

  await t.test("accepts an Intl.Locale", () => {
    assert.equal(getSubdivisionName("GB-WLS", new Intl.Locale("de")), "Wales");
  });
});

test("getSubdivisions", () => {
  assert.deepEqual(getSubdivisions("GB"), [
    "GB-ENG",
    "GB-NIR",
    "GB-SCT",
    "GB-WLS",
  ]);
  assert.deepEqual(getSubdivisions("gb"), getSubdivisions("GB"));
  const states = getSubdivisions("US");
  assert.ok(states.includes("US-CA") && states.includes("US-DC"));
  assert.ok(getSubdivisions("gbeng").includes("GB-LND"));
  assert.ok(getSubdivisions("FR-IDF").includes("FR-75C"));
  assert.deepEqual(getSubdivisions("US-CA"), []);
  assert.deepEqual(getSubdivisions("ZZ"), []);
});

test("nearly every subdivision has a name", () => {
  let total = 0;
  const unnamed = [];
  const visit = (parent) => {
    for (const code of getSubdivisions(parent)) {
      total++;
      assert.match(code, /^[A-Z]{2}-[A-Z0-9]{1,3}$/);
      if (getSubdivisionName(code) === undefined) unnamed.push(code);
      visit(code);
    }
  };
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) visit(String.fromCharCode(a, b));
  }
  assert.ok(total > 4500);
  assert.ok(unnamed.length < total / 100, `${unnamed.length} unnamed`);
});

test("rejects invalid arguments", () => {
  assert.throws(() => getSubdivisionName(1), TypeError);
  assert.throws(() => getSubdivisionName("US-CA", 1), TypeError);
  assert.throws(() => getSubdivisions(null), TypeError);
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.getSubdivisionName);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
