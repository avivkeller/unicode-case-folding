import assert from "node:assert/strict";
import test from "node:test";
import {
  VERSION,
  getContinent,
  getCountries,
  isInRegion,
} from "../dist/index.mjs";

test("isInRegion", async (t) => {
  const cases = [
    ["FR", "EU", true],
    ["CH", "EU", false],
    ["HR", "EZ", true],
    ["SE", "EZ", false],
    ["FR", "150", true],
    ["FR", "142", false],
    ["155", "150", true],
    ["150", "155", false],
    ["MX", "419", true],
    ["US", "419", false],
    ["CH", "UN", true],
    ["TW", "UN", false],
    ["FR", "FR", false],
    ["150", "FR", false],
    ["fr", "eu", true],
    ["ZZ", "001", false],
    ["FR", "ZZ", false],
  ];
  for (const [region, container, expected] of cases) {
    await t.test(`${region} in ${container}`, () => {
      assert.equal(isInRegion(region, container), expected);
    });
  }
});

test("getCountries", () => {
  const union = getCountries("EU");
  assert.equal(union.length, 27);
  assert.deepEqual(union.slice(0, 3), ["AT", "BE", "BG"]);
  assert.ok(getCountries("001").length > 240);
  assert.ok(getCountries("001").every((code) => /^[A-Z]{2}$/.test(code)));
  assert.deepEqual(getCountries("FR"), []);
  assert.deepEqual(getCountries("ZZ"), []);
  getCountries("EU").push("XX");
  assert.equal(getCountries("EU").length, 27, "returns copies");
});

test("every country of the world is in one continent", () => {
  const continents = ["002", "009", "019", "142", "150"];
  for (const country of getCountries("001")) {
    assert.ok(continents.includes(getContinent(country)), country);
    assert.equal(
      continents.filter((continent) => isInRegion(country, continent)).length,
      1,
      country,
    );
  }
});

test("getContinent", () => {
  assert.equal(getContinent("JP"), "142");
  assert.equal(getContinent("eg"), "002");
  assert.equal(getContinent("155"), "150");
  assert.equal(getContinent("150"), "150");
  assert.equal(getContinent("001"), undefined);
  assert.equal(getContinent("EU"), undefined, "groupings overlap continents");
  assert.equal(getContinent("ZZ"), undefined);
});

test("rejects invalid arguments", () => {
  assert.throws(() => isInRegion(1, "EU"), TypeError);
  assert.throws(() => isInRegion("FR", 150), TypeError);
  assert.throws(() => getCountries(150), TypeError);
});

test("default export", async () => {
  const { default: main, ...named } = await import("../dist/index.mjs");
  assert.equal(main, named.isInRegion);
  for (const [name, value] of Object.entries(named)) {
    assert.equal(main[name], value, name);
  }
});

test("VERSION", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
